//! Secure Session Manager
//!
//! Advanced session management with secure tokens, session validation,
//! and comprehensive security controls.

use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

/// Session security level
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum SessionSecurityLevel {
    Basic,      // Standard session security
    Enhanced,   // Additional validation checks
    Strict,     // Maximum security with frequent revalidation
    Restricted, // Limited functionality session
}

/// Session authentication state
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuthenticationState {
    Anonymous,
    Authenticated,
    TwoFactorPending,
    TwoFactorAuthenticated,
    Expired,
    Revoked,
    Suspended,
}

/// Security context for sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSecurityContext {
    pub session_id: String,
    pub user_id: Option<String>,
    pub authentication_state: AuthenticationState,
    pub security_level: SessionSecurityLevel,
    pub permissions: HashSet<String>,
    pub window_label: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub device_fingerprint: Option<String>,
    pub risk_score: u8,
    pub failed_attempts: u32,
    pub mfa_verified: bool,
    pub session_token: String,
    pub refresh_token: Option<String>,
}

/// Session validation result
#[derive(Debug, Clone, PartialEq)]
pub enum SessionValidation {
    Valid,
    Invalid { reason: String },
    Expired,
    RequiresRefresh,
    RequiresMFA,
    Suspended,
}

/// Session activity log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionActivity {
    pub timestamp: DateTime<Utc>,
    pub action: String,
    pub details: HashMap<String, serde_json::Value>,
    pub risk_score: u8,
}

/// Session configuration
#[derive(Debug, Clone)]
pub struct SessionConfig {
    pub default_expiry_hours: i64,
    pub max_inactive_minutes: i64,
    pub max_failed_attempts: u32,
    pub enable_device_tracking: bool,
    pub require_ip_validation: bool,
    pub session_rotation_minutes: i64,
    pub mfa_timeout_minutes: i64,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            default_expiry_hours: 24,
            max_inactive_minutes: 30,
            max_failed_attempts: 5,
            enable_device_tracking: true,
            require_ip_validation: false,
            session_rotation_minutes: 60,
            mfa_timeout_minutes: 5,
        }
    }
}

/// Secure Session Manager
#[derive(Debug)]
pub struct SecureSessionManager {
    sessions: HashMap<String, SessionSecurityContext>,
    session_activities: HashMap<String, Vec<SessionActivity>>,
    blacklisted_tokens: HashSet<String>,
    config: SessionConfig,
    token_salt: [u8; 32],
}

impl SecureSessionManager {
    /// Create a new secure session manager
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();
        let mut token_salt = [0u8; 32];
        rng.fill(&mut token_salt);

        Self {
            sessions: HashMap::new(),
            session_activities: HashMap::new(),
            blacklisted_tokens: HashSet::new(),
            config: SessionConfig::default(),
            token_salt,
        }
    }

    /// Create with custom configuration
    pub fn with_config(config: SessionConfig) -> Self {
        let mut manager = Self::new();
        manager.config = config;
        manager
    }

    /// Create a new secure session
    pub fn create_session(
        &mut self,
        window_label: String,
        user_id: Option<String>,
        ip_address: Option<String>,
        user_agent: Option<String>,
        security_level: SessionSecurityLevel,
    ) -> Result<SessionSecurityContext, String> {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // Generate secure session token
        let session_token = self.generate_secure_token(&session_id, &user_id);

        // Generate device fingerprint
        let device_fingerprint =
            self.generate_device_fingerprint(&ip_address, &user_agent, &window_label);

        // Set default permissions
        let mut permissions = HashSet::new();
        permissions.insert("basic.read".to_string());
        permissions.insert("ui.interact".to_string());

        // Add user-specific permissions
        if user_id.is_some() {
            permissions.insert("user.authenticated".to_string());
            permissions.insert("settings.read".to_string());
            permissions.insert("settings.write".to_string());
        }

        // Calculate initial risk score
        let risk_score =
            self.calculate_initial_risk_score(&ip_address, &user_agent, security_level);

        let session = SessionSecurityContext {
            session_id: session_id.clone(),
            user_id: user_id.clone(),
            authentication_state: if user_id.is_some() {
                AuthenticationState::Authenticated
            } else {
                AuthenticationState::Anonymous
            },
            security_level,
            permissions,
            window_label,
            created_at: now,
            last_activity: now,
            expires_at: now + Duration::hours(self.config.default_expiry_hours),
            ip_address,
            user_agent,
            device_fingerprint: Some(device_fingerprint),
            risk_score,
            failed_attempts: 0,
            mfa_verified: false,
            session_token: session_token.clone(),
            refresh_token: if security_level >= SessionSecurityLevel::Enhanced {
                Some(self.generate_refresh_token(&session_id))
            } else {
                None
            },
        };

        // Log session creation
        self.log_session_activity(
            &session_id,
            "session_created",
            HashMap::from([
                (
                    "user_id".to_string(),
                    serde_json::Value::String(user_id.unwrap_or("anonymous".to_string())),
                ),
                (
                    "security_level".to_string(),
                    serde_json::Value::String(format!("{:?}", security_level)),
                ),
                (
                    "risk_score".to_string(),
                    serde_json::Value::Number(risk_score.into()),
                ),
            ]),
            10,
        );

        self.sessions.insert(session_id.clone(), session.clone());
        Ok(session)
    }

    /// Validate session and return current context
    pub fn validate_session(
        &mut self,
        session_id: &str,
        current_ip: Option<&str>,
    ) -> SessionValidation {
        let now = Utc::now();
        
        // First check if session exists
        if !self.sessions.contains_key(session_id) {
            return SessionValidation::Invalid {
                reason: "Session not found".to_string(),
            };
        }
        
        // Check if session is expired
        let is_expired = {
            let session = self.sessions.get(session_id).unwrap();
            now > session.expires_at
        };
        
        if is_expired {
            self.log_session_activity(session_id, "session_expired", HashMap::new(), 20);
            return SessionValidation::Expired;
        }
        
        let session = self.sessions.get_mut(session_id).unwrap();

        // Check authentication state
        match session.authentication_state {
            AuthenticationState::Expired => return SessionValidation::Expired,
            AuthenticationState::Revoked => {
                return SessionValidation::Invalid {
                    reason: "Session revoked".to_string(),
                }
            }
            AuthenticationState::Suspended => return SessionValidation::Suspended,
            AuthenticationState::TwoFactorPending => return SessionValidation::RequiresMFA,
            _ => {}
        }

        // Check inactivity timeout
        let inactive_duration = now - session.last_activity;
        let max_inactive = self.config.max_inactive_minutes;
        if inactive_duration > Duration::minutes(max_inactive) {
            session.authentication_state = AuthenticationState::Expired;
            let session_id_str = session_id.to_string();
            drop(session); // Drop the mutable borrow
            
            self.log_session_activity(
                &session_id_str,
                "session_inactive_timeout",
                HashMap::from([(
                    "inactive_minutes".to_string(),
                    serde_json::Value::Number(inactive_duration.num_minutes().into()),
                )]),
                30,
            );
            return SessionValidation::Expired;
        }

        // Validate IP address if required
        if self.config.require_ip_validation {
            if let (Some(session_ip), Some(current_ip)) = (&session.ip_address, current_ip) {
                if session_ip != current_ip {
                    let session_ip_clone = session_ip.clone();
                    let current_ip_str = current_ip.to_string();
                    
                    // Increase risk score for IP changes
                    session.risk_score = (session.risk_score + 20).min(100);
                    let session_id_str = session_id.to_string();
                    drop(session); // Drop the mutable borrow
                    
                    self.log_session_activity(
                        &session_id_str,
                        "ip_mismatch",
                        HashMap::from([
                            (
                                "session_ip".to_string(),
                                serde_json::Value::String(session_ip_clone),
                            ),
                            (
                                "current_ip".to_string(),
                                serde_json::Value::String(current_ip_str),
                            ),
                        ]),
                        60,
                    );

                    return SessionValidation::Invalid {
                        reason: "IP address validation failed".to_string(),
                    };
                }
            }
        }

        // Check if session needs rotation
        let session_age = now - session.created_at;
        if session_age > Duration::minutes(self.config.session_rotation_minutes) {
            return SessionValidation::RequiresRefresh;
        }

        // Update last activity
        session.last_activity = now;

        // Periodic risk score decay (reduce risk over time with good behavior)
        if session.risk_score > 0 {
            session.risk_score = session.risk_score.saturating_sub(1);
        }

        SessionValidation::Valid
    }

    /// Refresh session with new token
    pub fn refresh_session(&mut self, session_id: &str) -> Result<String, String> {
        // First check if session exists and get user_id
        let user_id = self
            .sessions
            .get(session_id)
            .ok_or("Session not found")?
            .user_id
            .clone();

        // Generate new token before getting mutable reference
        let new_token = self.generate_secure_token(session_id, &user_id);
        
        // Now get mutable reference to update session
        let session = self
            .sessions
            .get_mut(session_id)
            .ok_or("Session not found")?;

        // Store old token for blacklisting
        let old_token = session.session_token.clone();
        
        // Update session
        session.session_token = new_token.clone();
        session.last_activity = Utc::now();
        
        // Extend expiry
        let expiry_hours = self.config.default_expiry_hours;
        session.expires_at = Utc::now() + Duration::hours(expiry_hours);
        
        drop(session); // Drop the mutable borrow
        
        // Blacklist old token
        self.blacklisted_tokens.insert(old_token);
        
        self.log_session_activity(session_id, "session_refreshed", HashMap::new(), 5);

        Ok(new_token)
    }

    /// Update session permissions
    pub fn update_permissions(&mut self, session_id: &str, permissions: HashSet<String>) -> bool {
        // Check if session exists and get old permissions
        let old_permissions = if let Some(session) = self.sessions.get(session_id) {
            session.permissions.clone()
        } else {
            return false;
        };
        
        // Update permissions
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.permissions = permissions.clone();
        }
        
        // Log activity after releasing the mutable borrow
        self.log_session_activity(
            session_id,
            "permissions_updated",
            HashMap::from([
                (
                    "old_permissions".to_string(),
                    serde_json::Value::Array(
                        old_permissions
                            .into_iter()
                            .map(serde_json::Value::String)
                            .collect(),
                    ),
                ),
                (
                    "new_permissions".to_string(),
                    serde_json::Value::Array(
                        permissions
                            .into_iter()
                            .map(serde_json::Value::String)
                            .collect(),
                    ),
                ),
            ]),
            15,
        );

        true
    }

    /// Record failed authentication attempt
    pub fn record_failed_attempt(&mut self, session_id: &str) -> bool {
        // Update session and get the new failed_attempts count and risk_score
        let (failed_attempts, risk_score, should_suspend) = if let Some(session) = self.sessions.get_mut(session_id) {
            session.failed_attempts += 1;
            session.risk_score = (session.risk_score + 15).min(100);
            let max_attempts = self.config.max_failed_attempts;
            (session.failed_attempts, session.risk_score, session.failed_attempts >= max_attempts)
        } else {
            return false;
        };
        
        // Log activity after releasing the mutable borrow
        self.log_session_activity(
            session_id,
            "failed_attempt",
            HashMap::from([
                (
                    "total_attempts".to_string(),
                    serde_json::Value::Number(failed_attempts.into()),
                ),
                (
                    "risk_score".to_string(),
                    serde_json::Value::Number(risk_score.into()),
                ),
            ]),
            40,
        );

        // Suspend session after too many failures
        if should_suspend {
            if let Some(session) = self.sessions.get_mut(session_id) {
                session.authentication_state = AuthenticationState::Suspended;
            }
            self.log_session_activity(
                session_id,
                "session_suspended",
                HashMap::from([(
                    "reason".to_string(),
                    serde_json::Value::String("too_many_failed_attempts".to_string()),
                )]),
                80,
            );
        }

        true
    }

    /// Enable MFA for session
    pub fn enable_mfa(&mut self, session_id: &str) -> bool {
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.authentication_state = AuthenticationState::TwoFactorPending;
            self.log_session_activity(session_id, "mfa_enabled", HashMap::new(), 10);
            true
        } else {
            false
        }
    }

    /// Verify MFA and complete authentication
    pub fn verify_mfa(&mut self, session_id: &str) -> bool {
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.mfa_verified = true;
            session.authentication_state = AuthenticationState::TwoFactorAuthenticated;
            session.risk_score = session.risk_score.saturating_sub(20); // Reduce risk after MFA

            self.log_session_activity(session_id, "mfa_verified", HashMap::new(), 5);
            true
        } else {
            false
        }
    }

    /// Terminate session
    pub fn terminate_session(&mut self, session_id: &str) -> bool {
        if let Some(session) = self.sessions.remove(session_id) {
            // Blacklist token
            self.blacklisted_tokens.insert(session.session_token);
            if let Some(refresh_token) = session.refresh_token {
                self.blacklisted_tokens.insert(refresh_token);
            }

            self.log_session_activity(session_id, "session_terminated", HashMap::new(), 10);

            // Keep activity log for audit purposes
            // self.session_activities.remove(session_id); // Don't remove for audit trail

            true
        } else {
            false
        }
    }

    /// Get session by ID
    pub fn get_session(&self, session_id: &str) -> Option<&SessionSecurityContext> {
        self.sessions.get(session_id)
    }

    /// Generate secure token with salt and hash
    fn generate_secure_token(&self, session_id: &str, user_id: &Option<String>) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.token_salt);
        hasher.update(session_id.as_bytes());
        if let Some(uid) = user_id {
            hasher.update(uid.as_bytes());
        }
        hasher.update(Utc::now().timestamp().to_be_bytes());

        // Add some randomness
        let mut rng = rand::thread_rng();
        let random_bytes: [u8; 16] = rng.gen();
        hasher.update(&random_bytes);

        let result = hasher.finalize();
        hex::encode(result)
    }

    /// Generate refresh token
    fn generate_refresh_token(&self, session_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"REFRESH");
        hasher.update(&self.token_salt);
        hasher.update(session_id.as_bytes());
        hasher.update(Utc::now().timestamp().to_be_bytes());

        let result = hasher.finalize();
        hex::encode(result)
    }

    /// Generate device fingerprint
    fn generate_device_fingerprint(
        &self,
        ip_address: &Option<String>,
        user_agent: &Option<String>,
        window_label: &str,
    ) -> String {
        let mut hasher = Sha256::new();

        if let Some(ip) = ip_address {
            hasher.update(ip.as_bytes());
        }
        if let Some(ua) = user_agent {
            hasher.update(ua.as_bytes());
        }
        hasher.update(window_label.as_bytes());

        let result = hasher.finalize();
        hex::encode(&result[..16]) // Use first 16 bytes for shorter fingerprint
    }

    /// Calculate initial risk score
    fn calculate_initial_risk_score(
        &self,
        ip_address: &Option<String>,
        user_agent: &Option<String>,
        security_level: SessionSecurityLevel,
    ) -> u8 {
        let mut risk_score = match security_level {
            SessionSecurityLevel::Basic => 20,
            SessionSecurityLevel::Enhanced => 10,
            SessionSecurityLevel::Strict => 5,
            SessionSecurityLevel::Restricted => 50,
        };

        // Increase risk for missing information
        if ip_address.is_none() {
            risk_score += 15;
        }
        if user_agent.is_none() {
            risk_score += 10;
        }

        risk_score.min(100)
    }

    /// Log session activity
    fn log_session_activity(
        &mut self,
        session_id: &str,
        action: &str,
        details: HashMap<String, serde_json::Value>,
        risk_score: u8,
    ) {
        let activity = SessionActivity {
            timestamp: Utc::now(),
            action: action.to_string(),
            details,
            risk_score,
        };

        self.session_activities
            .entry(session_id.to_string())
            .or_insert_with(Vec::new)
            .push(activity);
    }

    /// Clean up expired sessions and old activities
    pub fn cleanup_expired(&mut self) {
        let now = Utc::now();
        let expired_sessions: Vec<String> = self
            .sessions
            .iter()
            .filter(|(_, session)| {
                now > session.expires_at || (now - session.last_activity) > Duration::hours(24)
            })
            .map(|(id, _)| id.clone())
            .collect();

        for session_id in expired_sessions {
            self.terminate_session(&session_id);
        }

        // Clean up old blacklisted tokens (keep for 24 hours)
        // In a real implementation, you'd want to track token timestamps
        if self.blacklisted_tokens.len() > 10000 {
            self.blacklisted_tokens.clear(); // Simple cleanup
        }

        // Clean up old activities (keep for 7 days)
        let cutoff = now - Duration::days(7);
        for activities in self.session_activities.values_mut() {
            activities.retain(|activity| activity.timestamp > cutoff);
        }
    }

    /// Get session statistics
    pub fn get_statistics(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();

        stats.insert(
            "active_sessions".to_string(),
            serde_json::Value::Number(self.sessions.len().into()),
        );

        stats.insert(
            "blacklisted_tokens".to_string(),
            serde_json::Value::Number(self.blacklisted_tokens.len().into()),
        );

        // Count by authentication state
        let mut auth_states = HashMap::new();
        for session in self.sessions.values() {
            let state = format!("{:?}", session.authentication_state);
            *auth_states.entry(state).or_insert(0) += 1;
        }
        stats.insert(
            "authentication_states".to_string(),
            serde_json::Value::Object(
                auth_states
                    .into_iter()
                    .map(|(k, v)| (k, serde_json::Value::Number(v.into())))
                    .collect(),
            ),
        );

        // Average risk score
        let avg_risk = if !self.sessions.is_empty() {
            self.sessions
                .values()
                .map(|s| s.risk_score as u64)
                .sum::<u64>()
                / self.sessions.len() as u64
        } else {
            0
        };
        stats.insert(
            "average_risk_score".to_string(),
            serde_json::Value::Number(avg_risk.into()),
        );

        stats
    }

    /// Check if token is blacklisted
    pub fn is_token_blacklisted(&self, token: &str) -> bool {
        self.blacklisted_tokens.contains(token)
    }

    /// Get session activities for audit
    pub fn get_session_activities(&self, session_id: &str) -> Option<&Vec<SessionActivity>> {
        self.session_activities.get(session_id)
    }
}

impl Default for SecureSessionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_creation() {
        let mut manager = SecureSessionManager::new();

        let session = manager
            .create_session(
                "main".to_string(),
                Some("user123".to_string()),
                Some("192.168.1.1".to_string()),
                Some("TestAgent/1.0".to_string()),
                SessionSecurityLevel::Enhanced,
            )
            .unwrap();

        assert_eq!(
            session.authentication_state,
            AuthenticationState::Authenticated
        );
        assert_eq!(session.security_level, SessionSecurityLevel::Enhanced);
        assert!(session.permissions.contains("user.authenticated"));
        assert!(session.refresh_token.is_some());
    }

    #[test]
    fn test_session_validation() {
        let mut manager = SecureSessionManager::new();

        let session = manager
            .create_session(
                "test".to_string(),
                None,
                None,
                None,
                SessionSecurityLevel::Basic,
            )
            .unwrap();

        let session_id = session.session_id.clone();

        // Valid session
        assert_eq!(
            manager.validate_session(&session_id, None),
            SessionValidation::Valid
        );

        // Terminate and check invalid
        manager.terminate_session(&session_id);
        match manager.validate_session(&session_id, None) {
            SessionValidation::Invalid { .. } => {}
            _ => panic!("Should be invalid after termination"),
        }
    }

    #[test]
    fn test_failed_attempts() {
        let mut manager = SecureSessionManager::new();
        manager.config.max_failed_attempts = 3;

        let session = manager
            .create_session(
                "test".to_string(),
                Some("user".to_string()),
                None,
                None,
                SessionSecurityLevel::Basic,
            )
            .unwrap();

        let session_id = session.session_id;

        // Record failed attempts
        for _ in 0..4 {
            manager.record_failed_attempt(&session_id);
        }

        // Session should be suspended
        let session = manager.get_session(&session_id).unwrap();
        assert_eq!(session.authentication_state, AuthenticationState::Suspended);

        // Validation should return suspended
        assert_eq!(
            manager.validate_session(&session_id, None),
            SessionValidation::Suspended
        );
    }

    #[test]
    fn test_token_generation() {
        let manager = SecureSessionManager::new();

        let token1 = manager.generate_secure_token("session1", &Some("user1".to_string()));
        let token2 = manager.generate_secure_token("session2", &Some("user2".to_string()));
        let token3 = manager.generate_secure_token("session1", &Some("user1".to_string()));

        // Tokens should be different
        assert_ne!(token1, token2);
        assert_ne!(token1, token3); // Different due to timestamp

        // Tokens should be hex encoded (64 chars for SHA256)
        assert_eq!(token1.len(), 64);
        assert!(token1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_mfa_workflow() {
        let mut manager = SecureSessionManager::new();

        let session = manager
            .create_session(
                "test".to_string(),
                Some("user".to_string()),
                None,
                None,
                SessionSecurityLevel::Enhanced,
            )
            .unwrap();

        let session_id = session.session_id;

        // Enable MFA
        assert!(manager.enable_mfa(&session_id));
        assert_eq!(
            manager.validate_session(&session_id, None),
            SessionValidation::RequiresMFA
        );

        // Verify MFA
        assert!(manager.verify_mfa(&session_id));
        assert_eq!(
            manager.validate_session(&session_id, None),
            SessionValidation::Valid
        );

        let session = manager.get_session(&session_id).unwrap();
        assert_eq!(
            session.authentication_state,
            AuthenticationState::TwoFactorAuthenticated
        );
        assert!(session.mfa_verified);
    }
}
