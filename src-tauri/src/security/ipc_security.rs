//! Simple IPC Security Configuration
//!
//! Provides basic IPC security without advanced features for backward compatibility.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{State, Window};
use uuid::Uuid;

/// IPC command validation result
#[derive(Debug, Clone, PartialEq)]
pub enum CommandValidation {
    Allow,
    Deny(String),
    RequireAuth,
}

/// Security context for IPC commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityContext {
    pub session_id: String,
    pub user_id: Option<String>,
    pub permissions: HashSet<String>,
    pub window_label: String,
    pub timestamp: u64,
}

/// Rate limiting configuration
#[derive(Debug, Clone)]
pub struct RateLimit {
    pub requests_per_minute: u32,
    pub requests_per_second: u32,
    pub burst_limit: u32,
}

/// Rate limiter state
#[derive(Debug)]
struct RateLimiterState {
    requests: HashMap<String, Vec<Instant>>,
}

/// IPC security manager
#[derive(Debug)]
pub struct IpcSecurity {
    allowed_commands: HashSet<String>,
    blocked_commands: HashSet<String>,
    auth_required_commands: HashSet<String>,
    rate_limits: HashMap<String, RateLimit>,
    rate_limiter: Arc<Mutex<RateLimiterState>>,
    sessions: Arc<Mutex<HashMap<String, SecurityContext>>>,
}

impl Default for IpcSecurity {
    fn default() -> Self {
        let mut allowed_commands = HashSet::new();
        let mut auth_required_commands = HashSet::new();
        let mut blocked_commands = HashSet::new();
        let mut rate_limits = HashMap::new();

        // Allow basic UI commands
        allowed_commands.insert("get_app_info".to_string());
        allowed_commands.insert("get_settings".to_string());
        allowed_commands.insert("get_system_info".to_string());
        allowed_commands.insert("validate_project".to_string());
        allowed_commands.insert("get_templates".to_string());

        // Require authentication for sensitive operations
        auth_required_commands.insert("save_settings".to_string());
        auth_required_commands.insert("create_project".to_string());
        auth_required_commands.insert("run_command".to_string());
        auth_required_commands.insert("file_operations".to_string());
        auth_required_commands.insert("docker_execute".to_string());
        auth_required_commands.insert("install_extension".to_string());
        auth_required_commands.insert("update_app".to_string());

        // Block dangerous commands
        blocked_commands.insert("execute_system_command".to_string());
        blocked_commands.insert("read_sensitive_files".to_string());
        blocked_commands.insert("modify_system_settings".to_string());

        // Set rate limits with per-second controls
        rate_limits.insert(
            "run_command".to_string(),
            RateLimit {
                requests_per_minute: 30,
                requests_per_second: 5,
                burst_limit: 3,
            },
        );
        rate_limits.insert(
            "file_operations".to_string(),
            RateLimit {
                requests_per_minute: 60,
                requests_per_second: 10,
                burst_limit: 5,
            },
        );
        rate_limits.insert(
            "docker_execute".to_string(),
            RateLimit {
                requests_per_minute: 20,
                requests_per_second: 3,
                burst_limit: 2,
            },
        );

        // Global default rate limit of 100 req/min
        rate_limits.insert(
            "*".to_string(),
            RateLimit {
                requests_per_minute: 100,
                requests_per_second: 10,
                burst_limit: 5,
            },
        );

        Self {
            allowed_commands,
            blocked_commands,
            auth_required_commands,
            rate_limits,
            rate_limiter: Arc::new(Mutex::new(RateLimiterState {
                requests: HashMap::new(),
            })),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl IpcSecurity {
    /// Create a new IPC security manager with custom configuration
    pub fn new(
        allowed_commands: HashSet<String>,
        blocked_commands: HashSet<String>,
        auth_required_commands: HashSet<String>,
        mut rate_limits: HashMap<String, RateLimit>,
    ) -> Self {
        // Ensure global rate limit exists
        if !rate_limits.contains_key("*") {
            rate_limits.insert(
                "*".to_string(),
                RateLimit {
                    requests_per_minute: 100,
                    requests_per_second: 10,
                    burst_limit: 5,
                },
            );
        }
        Self {
            allowed_commands,
            blocked_commands,
            auth_required_commands,
            rate_limits,
            rate_limiter: Arc::new(Mutex::new(RateLimiterState {
                requests: HashMap::new(),
            })),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Validate a command before execution
    pub fn validate_command(&self, command: &str, context: &SecurityContext) -> CommandValidation {
        // Check for command injection patterns
        if let Err(msg) = self.validate_command_injection(command) {
            return CommandValidation::Deny(msg);
        }

        // Check if command is explicitly blocked
        if self.blocked_commands.contains(command) {
            return CommandValidation::Deny(format!(
                "Command '{}' is blocked for security reasons",
                command
            ));
        }

        // Check rate limits
        if let Err(msg) = self.check_rate_limit(command, &context.session_id) {
            return CommandValidation::Deny(msg);
        }

        // Check if authentication is required
        if self.auth_required_commands.contains(command) {
            if context.user_id.is_none() {
                return CommandValidation::RequireAuth;
            }

            // Check permissions for authenticated commands
            if !self.check_permissions(command, context) {
                return CommandValidation::Deny(format!(
                    "Insufficient permissions for command '{}'",
                    command
                ));
            }
        }

        // Check if command is explicitly allowed or in auth_required (and passed auth)
        if self.allowed_commands.contains(command)
            || (self.auth_required_commands.contains(command) && context.user_id.is_some())
        {
            CommandValidation::Allow
        } else {
            CommandValidation::Deny(format!(
                "Command '{}' is not in the allowed commands list",
                command
            ))
        }
    }

    /// Check rate limits for a command
    fn check_rate_limit(&self, command: &str, session_id: &str) -> Result<(), String> {
        // Try command-specific rate limit first, then fall back to global
        let limit = self
            .rate_limits
            .get(command)
            .or_else(|| self.rate_limits.get("*"))
            .ok_or_else(|| "No rate limit configured".to_string())?;

        let mut state = self.rate_limiter.lock().unwrap();
        let now = Instant::now();
        let key = format!("{}:{}", session_id, command);

        let requests = state.requests.entry(key).or_insert_with(Vec::new);

        // Remove old requests (older than 1 minute)
        requests.retain(|&time| now.duration_since(time) < Duration::from_secs(60));

        // Check per-second rate limit (most restrictive)
        let requests_last_second = requests
            .iter()
            .filter(|&&time| now.duration_since(time) < Duration::from_secs(1))
            .count();

        if requests_last_second >= limit.requests_per_second as usize {
            return Err(format!(
                "Rate limit exceeded: {} requests in 1 second (limit: {})",
                requests_last_second, limit.requests_per_second
            ));
        }

        // Check burst limit (5 second window)
        let recent_requests = requests
            .iter()
            .filter(|&&time| now.duration_since(time) < Duration::from_secs(5))
            .count();

        if recent_requests >= limit.burst_limit as usize {
            return Err(format!(
                "Burst rate limit exceeded: {} requests in 5 seconds (limit: {})",
                recent_requests, limit.burst_limit
            ));
        }

        // Check per-minute limit
        if requests.len() >= limit.requests_per_minute as usize {
            return Err(format!(
                "Rate limit exceeded: {} requests per minute (limit: {})",
                requests.len(),
                limit.requests_per_minute
            ));
        }

        // Add current request
        requests.push(now);

        Ok(())
    }

    /// Check permissions for a command
    fn check_permissions(&self, command: &str, context: &SecurityContext) -> bool {
        match command {
            "save_settings" => context.permissions.contains("settings.write"),
            "create_project" => context.permissions.contains("project.create"),
            "run_command" => context.permissions.contains("system.execute"),
            "file_operations" => context.permissions.contains("fs.write"),
            "docker_execute" => context.permissions.contains("docker.execute"),
            "install_extension" => context.permissions.contains("extension.install"),
            "update_app" => context.permissions.contains("app.update"),
            _ => true, // Allow by default for non-sensitive commands
        }
    }

    /// Create a new session
    pub fn create_session(&self, window_label: String, user_id: Option<String>) -> String {
        let session_id = Uuid::new_v4().to_string();
        let mut permissions = HashSet::new();

        // Grant basic permissions to all sessions
        permissions.insert("settings.read".to_string());
        permissions.insert("project.read".to_string());
        permissions.insert("fs.read".to_string());

        // Grant additional permissions for authenticated users
        if user_id.is_some() {
            permissions.insert("settings.write".to_string());
            permissions.insert("project.create".to_string());
            permissions.insert("fs.write".to_string());
            permissions.insert("system.execute".to_string());
            permissions.insert("docker.execute".to_string());
            permissions.insert("extension.install".to_string());
            permissions.insert("app.update".to_string());
        }

        let context = SecurityContext {
            session_id: session_id.clone(),
            user_id,
            permissions,
            window_label,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(session_id.clone(), context);

        session_id
    }

    /// Get session context
    pub fn get_session(&self, session_id: &str) -> Option<SecurityContext> {
        let sessions = self.sessions.lock().unwrap();
        sessions.get(session_id).cloned()
    }

    /// Update session permissions
    pub fn update_session_permissions(
        &self,
        session_id: &str,
        permissions: HashSet<String>,
    ) -> bool {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(context) = sessions.get_mut(session_id) {
            context.permissions = permissions;
            true
        } else {
            false
        }
    }

    /// Remove session
    pub fn remove_session(&self, session_id: &str) -> bool {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(session_id).is_some()
    }

    /// Clean up expired sessions (older than 24 hours)
    pub fn cleanup_expired_sessions(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let expired_sessions: Vec<String> = sessions
            .iter()
            .filter(|(_, context)| now - context.timestamp >= 86400) // 24 hours
            .map(|(id, _)| id.clone())
            .collect();

        for session_id in &expired_sessions {
            sessions.remove(session_id);
        }

        if !expired_sessions.is_empty() {
            log::info!(
                "Cleaned up {} expired security sessions",
                expired_sessions.len()
            );
        }
    }

    /// Validate command for injection attacks
    fn validate_command_injection(&self, command: &str) -> Result<(), String> {
        // Check for script injection patterns
        let dangerous_patterns = [
            "<script",
            "</script",
            "javascript:",
            "data:text/html",
            "eval(",
            "setTimeout(",
            "setInterval(",
            "Function(",
            ".exe",
            ".bat",
            ".cmd",
            ".ps1",
            ".sh",
            "rm -rf",
            "sudo ",
            "chmod ",
            "chown ",
            "../",
            "..\\", // Path traversal
        ];

        let command_lower = command.to_lowercase();
        for pattern in &dangerous_patterns {
            if command_lower.contains(pattern) {
                return Err(format!(
                    "Command contains potentially dangerous pattern: '{}'",
                    pattern
                ));
            }
        }

        // Check for excessive length
        if command.len() > 10000 {
            return Err("Command length exceeds security limit (10KB)".to_string());
        }

        // Check for binary data
        if !command.is_ascii() {
            return Err("Command contains non-ASCII characters".to_string());
        }

        Ok(())
    }

    /// Get security statistics
    pub fn get_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();

        let sessions = self.sessions.lock().unwrap();
        stats.insert(
            "active_sessions".to_string(),
            serde_json::Value::Number(sessions.len().into()),
        );

        let rate_limiter = self.rate_limiter.lock().unwrap();
        stats.insert(
            "rate_limited_endpoints".to_string(),
            serde_json::Value::Number(rate_limiter.requests.len().into()),
        );

        // Calculate total requests in last minute
        let now = std::time::Instant::now();
        let total_requests = rate_limiter
            .requests
            .values()
            .flat_map(|requests| requests.iter())
            .filter(|&&time| now.duration_since(time) < std::time::Duration::from_secs(60))
            .count();

        stats.insert(
            "requests_last_minute".to_string(),
            serde_json::Value::Number(total_requests.into()),
        );

        stats.insert(
            "allowed_commands".to_string(),
            serde_json::Value::Number(self.allowed_commands.len().into()),
        );

        stats.insert(
            "blocked_commands".to_string(),
            serde_json::Value::Number(self.blocked_commands.len().into()),
        );

        stats.insert(
            "auth_required_commands".to_string(),
            serde_json::Value::Number(self.auth_required_commands.len().into()),
        );

        stats.insert(
            "rate_limit_rules".to_string(),
            serde_json::Value::Number(self.rate_limits.len().into()),
        );

        stats
    }
}

/// Tauri command to create a new security session
#[tauri::command]
pub async fn create_security_session(
    window: Window,
    security: State<'_, IpcSecurity>,
    user_id: Option<String>,
) -> Result<String, String> {
    let session_id = security.create_session(window.label().to_string(), user_id);
    Ok(session_id)
}

/// Tauri command to validate a command
#[tauri::command]
pub async fn validate_ipc_command(
    security: State<'_, IpcSecurity>,
    session_id: String,
    command: String,
) -> Result<bool, String> {
    let context = security.get_session(&session_id).ok_or("Invalid session")?;

    match security.validate_command(&command, &context) {
        CommandValidation::Allow => Ok(true),
        CommandValidation::Deny(msg) => Err(msg),
        CommandValidation::RequireAuth => Err("Authentication required".to_string()),
    }
}

/// Tauri command to get security statistics
#[tauri::command]
pub async fn get_security_stats(
    security: State<'_, IpcSecurity>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    Ok(security.get_stats())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_validation() {
        let security = IpcSecurity::default();
        let context = SecurityContext {
            session_id: "test".to_string(),
            user_id: Some("user1".to_string()),
            permissions: ["settings.write".to_string()].iter().cloned().collect(),
            window_label: "main".to_string(),
            timestamp: 0,
        };

        // Test allowed command
        assert_eq!(
            security.validate_command("get_app_info", &context),
            CommandValidation::Allow
        );

        // Test blocked command
        assert!(matches!(
            security.validate_command("execute_system_command", &context),
            CommandValidation::Deny(_)
        ));

        // Test auth required command with valid auth
        assert_eq!(
            security.validate_command("save_settings", &context),
            CommandValidation::Allow
        );
    }

    #[test]
    fn test_session_management() {
        let security = IpcSecurity::default();

        let session_id = security.create_session("main".to_string(), Some("user1".to_string()));
        assert!(!session_id.is_empty());

        let context = security.get_session(&session_id);
        assert!(context.is_some());
        assert_eq!(context.unwrap().user_id, Some("user1".to_string()));

        assert!(security.remove_session(&session_id));
        assert!(security.get_session(&session_id).is_none());
    }
}
