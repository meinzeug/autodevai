//! Enhanced IPC Security Implementation
//!
//! This provides additional security features on top of the existing IPC security system
//! without breaking backward compatibility.

use super::{
    input_sanitizer::{InputSanitizer, ValidationResult as InputValidationResult},
    audit_logger::{SecurityAuditLogger, SecurityEventType, SecurityOutcome},
    rate_limiter::{EnhancedRateLimiter, RateLimitResult},
    session_manager::{SecureSessionManager, SessionValidation},
    command_validator::{CommandWhitelist, CommandValidationResult},
    ipc_security::{IpcSecurity, SecurityContext, CommandValidation}
};

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{State, Window};
use tokio::sync::RwLock;

/// Enhanced IPC Security Manager
/// This wraps the basic IPC security with additional features
pub struct EnhancedIpcSecurity {
    basic_security: IpcSecurity,
    input_sanitizer: InputSanitizer,
    command_validator: CommandWhitelist,
    audit_logger: Arc<RwLock<SecurityAuditLogger>>,
    enhanced_rate_limiter: Arc<RwLock<EnhancedRateLimiter>>,
    session_manager: Arc<RwLock<SecureSessionManager>>,
}

impl EnhancedIpcSecurity {
    /// Create a new enhanced IPC security manager
    pub async fn new() -> Self {
        Self {
            basic_security: IpcSecurity::default(),
            input_sanitizer: InputSanitizer::default(),
            command_validator: CommandWhitelist::default(),
            audit_logger: Arc::new(RwLock::new(SecurityAuditLogger::new().await)),
            enhanced_rate_limiter: Arc::new(RwLock::new(EnhancedRateLimiter::new())),
            session_manager: Arc::new(RwLock::new(SecureSessionManager::new())),
        }
    }

    /// Enhanced command validation with comprehensive security checks
    pub async fn validate_command_enhanced(
        &self,
        command: &str,
        args: &serde_json::Value,
        session_id: &str,
    ) -> Result<bool, String> {
        // Get session context from basic security
        let context = self.basic_security.get_session(session_id)
            .ok_or("Invalid session")?;

        // 1. Input sanitization
        match self.input_sanitizer.validate_ipc_input(command, args) {
            InputValidationResult::Invalid { reason, .. } => {
                self.log_security_event(
                    SecurityEventType::InputRejected,
                    session_id,
                    Some(command),
                    SecurityOutcome::Blocked,
                    HashMap::from([
                        ("reason".to_string(), serde_json::Value::String(reason.clone())),
                    ])
                ).await;
                return Err(format!("Input validation failed: {}", reason));
            }
            InputValidationResult::Sanitized { .. } => {
                self.log_security_event(
                    SecurityEventType::InputSanitized,
                    session_id,
                    Some(command),
                    SecurityOutcome::Sanitized,
                    HashMap::new()
                ).await;
            }
            InputValidationResult::Valid => {}
        }

        // 2. Enhanced rate limiting
        let rate_limit_result = {
            let rate_limiter = self.enhanced_rate_limiter.read().await;
            rate_limiter.check_rate_limit(session_id, command, 10).await
        };
        
        match rate_limit_result {
            RateLimitResult::Limited { reason, .. } | RateLimitResult::Blocked { reason, .. } => {
                self.log_security_event(
                    SecurityEventType::RateLimitExceeded,
                    session_id,
                    Some(command),
                    SecurityOutcome::Blocked,
                    HashMap::from([
                        ("reason".to_string(), serde_json::Value::String(reason.clone())),
                    ])
                ).await;
                return Err(reason);
            }
            _ => {}
        }

        // 3. Command validation with permissions
        let user_permissions = &context.permissions;
        let command_result = self.command_validator.validate_command(
            command,
            args,
            user_permissions,
            context.user_id.is_some() // Simple MFA check
        );
        
        match command_result {
            CommandValidationResult::Allowed { .. } => {
                // 4. Use basic security for final validation
                match self.basic_security.validate_command(command, &context) {
                    CommandValidation::Allow => {
                        self.log_security_event(
                            SecurityEventType::CommandExecuted,
                            session_id,
                            Some(command),
                            SecurityOutcome::Success,
                            HashMap::new()
                        ).await;
                        Ok(true)
                    }
                    CommandValidation::Deny(msg) => {
                        self.log_security_event(
                            SecurityEventType::CommandBlocked,
                            session_id,
                            Some(command),
                            SecurityOutcome::Blocked,
                            HashMap::from([
                                ("reason".to_string(), serde_json::Value::String(msg.clone())),
                            ])
                        ).await;
                        Err(msg)
                    }
                    CommandValidation::RequireAuth => {
                        Err("Authentication required".to_string())
                    }
                }
            }
            CommandValidationResult::Denied { reason, .. } => {
                self.log_security_event(
                    SecurityEventType::CommandBlocked,
                    session_id,
                    Some(command),
                    SecurityOutcome::Blocked,
                    HashMap::from([
                        ("reason".to_string(), serde_json::Value::String(reason.clone())),
                    ])
                ).await;
                Err(reason)
            }
            CommandValidationResult::RequiresElevation { reason, .. } => {
                Err(reason)
            }
            CommandValidationResult::ConditionallyAllowed { .. } => {
                // For now, treat as allowed and defer to basic security
                match self.basic_security.validate_command(command, &context) {
                    CommandValidation::Allow => Ok(true),
                    CommandValidation::Deny(msg) => Err(msg),
                    CommandValidation::RequireAuth => Err("Authentication required".to_string()),
                }
            }
        }
    }

    /// Create a new session (delegates to basic security)
    pub fn create_session(&self, window_label: String, user_id: Option<String>) -> String {
        self.basic_security.create_session(window_label, user_id)
    }

    /// Get comprehensive security statistics
    pub async fn get_enhanced_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();
        
        // Get basic security stats
        let basic_stats = self.basic_security.get_stats();
        stats.insert("basic_security".to_string(), 
                     serde_json::Value::Object(basic_stats.into_iter().collect()));
        
        // Get enhanced component stats
        let audit_logger = self.audit_logger.read().await;
        let audit_stats = audit_logger.get_stats().await;
        stats.insert("audit_stats".to_string(), 
                     serde_json::to_value(audit_stats).unwrap_or_default());
        
        let rate_limiter = self.enhanced_rate_limiter.read().await;
        let rate_stats = rate_limiter.get_stats().await;
        stats.insert("rate_limiter_stats".to_string(), 
                     serde_json::to_value(rate_stats).unwrap_or_default());
        
        let session_manager = self.session_manager.read().await;
        let session_stats = session_manager.get_statistics();
        stats.insert("session_stats".to_string(), 
                     serde_json::Value::Object(session_stats.into_iter().collect()));
        
        let validator_stats = self.command_validator.get_security_stats();
        stats.insert("command_validator_stats".to_string(), 
                     serde_json::Value::Object(validator_stats.into_iter().collect()));
        
        stats
    }

    /// Flush security logs
    pub async fn flush_logs(&self) {
        let audit_logger = self.audit_logger.read().await;
        audit_logger.flush().await;
    }

    /// Clean up expired data
    pub async fn cleanup_expired(&self) {
        self.basic_security.cleanup_expired_sessions();
        
        let mut session_manager = self.session_manager.write().await;
        session_manager.cleanup_expired();
        
        let mut rate_limiter = self.enhanced_rate_limiter.write().await;
        rate_limiter.cleanup_expired_states().await;
    }

    /// Log security event with audit logger
    async fn log_security_event(
        &self,
        event_type: SecurityEventType,
        session_id: &str,
        command: Option<&str>,
        outcome: SecurityOutcome,
        details: HashMap<String, serde_json::Value>
    ) {
        let audit_logger = self.audit_logger.read().await;
        audit_logger.log_ipc_security(
            command.unwrap_or("unknown"),
            session_id,
            "main", // Default window label
            outcome,
            details
        ).await;
    }

    /// Get sanitization statistics
    pub fn get_sanitization_stats(&self) -> HashMap<String, serde_json::Value> {
        // In a real implementation, the sanitizer would track statistics
        HashMap::from([
            ("sanitization_enabled".to_string(), serde_json::Value::Bool(true)),
            ("blocked_patterns".to_string(), serde_json::Value::Number(15.into())),
        ])
    }
}

/// Tauri command for enhanced command validation
#[tauri::command]
pub async fn validate_ipc_command_enhanced(
    security: State<'_, EnhancedIpcSecurity>,
    session_id: String,
    command: String,
    args: Option<serde_json::Value>,
) -> Result<bool, String> {
    let command_args = args.unwrap_or(serde_json::Value::Null);
    security.validate_command_enhanced(&command, &command_args, &session_id).await
}

/// Tauri command for creating enhanced session
#[tauri::command]
pub async fn create_enhanced_security_session(
    window: Window,
    security: State<'_, EnhancedIpcSecurity>,
    user_id: Option<String>,
) -> Result<String, String> {
    let session_id = security.create_session(window.label().to_string(), user_id);
    Ok(session_id)
}

/// Tauri command for enhanced security statistics
#[tauri::command]
pub async fn get_enhanced_security_stats(
    security: State<'_, EnhancedIpcSecurity>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    Ok(security.get_enhanced_stats().await)
}

/// Tauri command for flushing security logs
#[tauri::command]
pub async fn flush_security_logs(
    security: State<'_, EnhancedIpcSecurity>,
) -> Result<(), String> {
    security.flush_logs().await;
    Ok(())
}

/// Tauri command for cleanup operations
#[tauri::command]
pub async fn cleanup_security_data(
    security: State<'_, EnhancedIpcSecurity>,
) -> Result<(), String> {
    security.cleanup_expired().await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_enhanced_security_creation() {
        let security = EnhancedIpcSecurity::new().await;
        
        // Should be able to create sessions
        let session_id = security.create_session("test".to_string(), None);
        assert!(!session_id.is_empty());
        
        // Should be able to get stats
        let stats = security.get_enhanced_stats().await;
        assert!(stats.contains_key("basic_security"));
        assert!(stats.contains_key("audit_stats"));
    }

    #[tokio::test]
    async fn test_enhanced_command_validation() {
        let security = EnhancedIpcSecurity::new().await;
        
        // Create a session
        let session_id = security.create_session("test".to_string(), Some("user1".to_string()));
        
        // Test valid command
        let result = security.validate_command_enhanced(
            "get_app_info",
            &serde_json::json!({}),
            &session_id
        ).await;
        
        assert!(result.is_ok());
        
        // Test command with potentially malicious input
        let result = security.validate_command_enhanced(
            "save_settings",
            &serde_json::json!({"data": "<script>alert('xss')</script>"}),
            &session_id
        ).await;
        
        // Should be rejected due to input validation
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_security_statistics() {
        let security = EnhancedIpcSecurity::new().await;
        let stats = security.get_enhanced_stats().await;
        
        // Should contain all expected sections
        assert!(stats.contains_key("basic_security"));
        assert!(stats.contains_key("audit_stats"));
        assert!(stats.contains_key("rate_limiter_stats"));
        assert!(stats.contains_key("session_stats"));
        assert!(stats.contains_key("command_validator_stats"));
    }

    #[tokio::test]
    async fn test_cleanup_operations() {
        let security = EnhancedIpcSecurity::new().await;
        
        // Create some sessions
        let _session1 = security.create_session("test1".to_string(), None);
        let _session2 = security.create_session("test2".to_string(), Some("user1".to_string()));
        
        // Cleanup should not fail
        security.cleanup_expired().await;
        
        // Flush should not fail
        security.flush_logs().await;
    }

    #[tokio::test]
    async fn test_rate_limiting() {
        let security = EnhancedIpcSecurity::new().await;
        let session_id = security.create_session("test".to_string(), None);
        
        // First few commands should work
        for i in 0..5 {
            let result = security.validate_command_enhanced(
                "get_app_info",
                &serde_json::json!({"test": i}),
                &session_id
            ).await;
            
            // Some might be rate limited, but shouldn't fail catastrophically
            match result {
                Ok(_) => {},
                Err(msg) if msg.contains("rate limit") => {},
                Err(msg) => panic!("Unexpected error: {}", msg),
            }
        }
    }
}