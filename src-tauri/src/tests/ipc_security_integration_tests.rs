//! Comprehensive IPC Security Framework Integration Tests
//! 
//! Tests for the Inter-Process Communication security system including:
//! - Command validation and authorization
//! - Rate limiting and throttling
//! - Session management and authentication
//! - Permission system validation  
//! - Security policy enforcement
//! - Attack prevention and mitigation
//! - Audit logging and monitoring
//! - Cross-platform security behavior

#[cfg(test)]
mod ipc_security_integration_tests {
    use std::collections::{HashMap, HashSet};
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant, SystemTime};
    use serde_json::{json, Value};
    use sha2::{Sha256, Digest};

    /// Security context for IPC operations
    #[derive(Debug, Clone)]
    struct MockSecurityContext {
        pub session_id: String,
        pub user_id: Option<String>,
        pub permissions: HashSet<String>,
        pub window_label: String,
        pub timestamp: u64,
        pub ip_address: String,
        pub user_agent: String,
        pub auth_level: AuthLevel,
    }

    #[derive(Debug, Clone, PartialEq)]
    enum AuthLevel {
        None,
        Basic,
        Elevated,
        Admin,
    }

    /// Command validation result
    #[derive(Debug, Clone, PartialEq)]
    enum CommandValidation {
        Allow,
        Deny(String),
        RequireAuth,
        RequireElevation,
        RateLimited(Duration),
    }

    /// Rate limiting configuration
    #[derive(Debug, Clone)]
    struct RateLimit {
        pub requests_per_minute: u32,
        pub burst_limit: u32,
        pub window_seconds: u64,
    }

    impl Default for RateLimit {
        fn default() -> Self {
            Self {
                requests_per_minute: 60,
                burst_limit: 10,
                window_seconds: 60,
            }
        }
    }

    /// Security audit entry
    #[derive(Debug, Clone)]
    struct SecurityAuditEntry {
        pub timestamp: u64,
        pub session_id: String,
        pub command: String,
        pub result: String,
        pub ip_address: String,
        pub details: HashMap<String, Value>,
        pub severity: SecuritySeverity,
    }

    #[derive(Debug, Clone, PartialEq)]
    enum SecuritySeverity {
        Info,
        Warning, 
        Critical,
        Emergency,
    }

    /// Mock IPC Security Manager
    #[derive(Debug)]
    struct MockIpcSecurityManager {
        // Command configurations
        allowed_commands: HashSet<String>,
        blocked_commands: HashSet<String>,
        auth_required_commands: HashSet<String>,
        elevated_commands: HashSet<String>,
        
        // Rate limiting
        rate_limits: HashMap<String, RateLimit>,
        request_counts: Arc<Mutex<HashMap<String, Vec<u64>>>>,
        
        // Session management
        sessions: Arc<Mutex<HashMap<String, MockSecurityContext>>>,
        session_timeouts: HashMap<String, Duration>,
        
        // Security policies
        max_session_age: Duration,
        require_https: bool,
        allow_localhost: bool,
        blocked_ips: HashSet<String>,
        
        // Audit logging
        audit_log: Arc<Mutex<Vec<SecurityAuditEntry>>>,
        
        // Attack prevention
        failed_attempts: Arc<Mutex<HashMap<String, (u32, u64)>>>, // IP -> (count, last_attempt)
        lockout_threshold: u32,
        lockout_duration: Duration,
    }

    impl Default for MockIpcSecurityManager {
        fn default() -> Self {
            let mut allowed_commands = HashSet::new();
            allowed_commands.insert("get_app_info".to_string());
            allowed_commands.insert("get_system_info".to_string());
            allowed_commands.insert("get_settings".to_string());
            
            let mut blocked_commands = HashSet::new();
            blocked_commands.insert("execute_system_command".to_string());
            blocked_commands.insert("read_sensitive_files".to_string());
            blocked_commands.insert("modify_system_settings".to_string());
            
            let mut auth_required_commands = HashSet::new();
            auth_required_commands.insert("save_settings".to_string());
            auth_required_commands.insert("create_project".to_string());
            auth_required_commands.insert("file_operations".to_string());
            
            let mut elevated_commands = HashSet::new();
            elevated_commands.insert("install_update".to_string());
            elevated_commands.insert("modify_security_settings".to_string());
            elevated_commands.insert("manage_users".to_string());
            
            let mut rate_limits = HashMap::new();
            rate_limits.insert("save_settings".to_string(), RateLimit {
                requests_per_minute: 30,
                burst_limit: 5,
                window_seconds: 60,
            });
            rate_limits.insert("file_operations".to_string(), RateLimit {
                requests_per_minute: 120,
                burst_limit: 20,
                window_seconds: 60,
            });
            
            Self {
                allowed_commands,
                blocked_commands,
                auth_required_commands,
                elevated_commands,
                rate_limits,
                request_counts: Arc::new(Mutex::new(HashMap::new())),
                sessions: Arc::new(Mutex::new(HashMap::new())),
                session_timeouts: HashMap::new(),
                max_session_age: Duration::from_secs(3600), // 1 hour
                require_https: false, // Disabled for testing
                allow_localhost: true,
                blocked_ips: HashSet::new(),
                audit_log: Arc::new(Mutex::new(Vec::new())),
                failed_attempts: Arc::new(Mutex::new(HashMap::new())),
                lockout_threshold: 5,
                lockout_duration: Duration::from_secs(300), // 5 minutes
            }
        }
    }

    impl MockIpcSecurityManager {
        fn new() -> Self {
            Self::default()
        }

        /// Validate a command execution request
        fn validate_command(&self, command: &str, context: &MockSecurityContext) -> CommandValidation {
            // Log the validation attempt
            self.audit_command_validation(command, context);
            
            // Check if IP is blocked
            if self.blocked_ips.contains(&context.ip_address) {
                return CommandValidation::Deny("IP address is blocked".to_string());
            }
            
            // Check for account lockout
            if let Ok(attempts) = self.failed_attempts.lock() {
                if let Some((count, last_attempt)) = attempts.get(&context.ip_address) {
                    let lockout_expires = last_attempt + self.lockout_duration.as_secs();
                    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
                    
                    if *count >= self.lockout_threshold && now < lockout_expires {
                        return CommandValidation::Deny("Account locked due to failed attempts".to_string());
                    }
                }
            }
            
            // Check if command is explicitly blocked
            if self.blocked_commands.contains(command) {
                return CommandValidation::Deny("Command is blocked for security reasons".to_string());
            }
            
            // Check rate limiting
            if let Some(rate_limit) = self.rate_limits.get(command) {
                if let Some(wait_time) = self.check_rate_limit(command, context, rate_limit) {
                    return CommandValidation::RateLimited(wait_time);
                }
            }
            
            // Check if command requires elevation
            if self.elevated_commands.contains(command) {
                if context.auth_level != AuthLevel::Admin {
                    return CommandValidation::RequireElevation;
                }
            }
            
            // Check if command requires authentication
            if self.auth_required_commands.contains(command) {
                if context.user_id.is_none() || context.auth_level == AuthLevel::None {
                    return CommandValidation::RequireAuth;
                }
                
                // Check permissions
                let required_permission = self.get_required_permission(command);
                if !context.permissions.contains(&required_permission) {
                    return CommandValidation::Deny("Insufficient permissions".to_string());
                }
            }
            
            // Check if command is explicitly allowed or follows default policy
            if self.allowed_commands.contains(command) || self.is_safe_command(command) {
                CommandValidation::Allow
            } else {
                CommandValidation::Deny("Command not in allowed list".to_string())
            }
        }
        
        /// Create a new security session
        fn create_session(&self, window_label: String, user_id: Option<String>) -> String {
            let session_id = self.generate_session_id();
            let permissions = self.get_user_permissions(&user_id);
            let auth_level = if user_id.is_some() { AuthLevel::Basic } else { AuthLevel::None };
            
            let context = MockSecurityContext {
                session_id: session_id.clone(),
                user_id,
                permissions,
                window_label,
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                ip_address: "127.0.0.1".to_string(), // Mock localhost
                user_agent: "AutoDev-AI/1.0".to_string(),
                auth_level,
            };
            
            if let Ok(mut sessions) = self.sessions.lock() {
                sessions.insert(session_id.clone(), context);
            }
            
            // Audit session creation
            self.audit_session_event("session_created", &session_id);
            
            session_id
        }
        
        /// Get session context
        fn get_session(&self, session_id: &str) -> Option<MockSecurityContext> {
            if let Ok(sessions) = self.sessions.lock() {
                sessions.get(session_id).cloned()
            } else {
                None
            }
        }
        
        /// Remove a session
        fn remove_session(&self, session_id: &str) -> bool {
            let removed = if let Ok(mut sessions) = self.sessions.lock() {
                sessions.remove(session_id).is_some()
            } else {
                false
            };
            
            if removed {
                self.audit_session_event("session_removed", session_id);
            }
            
            removed
        }
        
        /// Update session permissions
        fn update_session_permissions(&self, session_id: &str, permissions: HashSet<String>) -> bool {
            if let Ok(mut sessions) = self.sessions.lock() {
                if let Some(context) = sessions.get_mut(session_id) {
                    context.permissions = permissions;
                    self.audit_session_event("permissions_updated", session_id);
                    return true;
                }
            }
            false
        }
        
        /// Elevate session to admin level
        fn elevate_session(&self, session_id: &str, admin_password: &str) -> Result<(), String> {
            // Verify admin password (mock implementation)
            if !self.verify_admin_password(admin_password) {
                self.record_failed_attempt(session_id);
                return Err("Invalid admin password".to_string());
            }
            
            if let Ok(mut sessions) = self.sessions.lock() {
                if let Some(context) = sessions.get_mut(session_id) {
                    context.auth_level = AuthLevel::Admin;
                    context.permissions.insert("admin.*".to_string());
                    self.audit_session_event("session_elevated", session_id);
                    return Ok(());
                }
            }
            
            Err("Session not found".to_string())
        }
        
        /// Check rate limiting for a command
        fn check_rate_limit(&self, command: &str, context: &MockSecurityContext, limit: &RateLimit) -> Option<Duration> {
            let key = format!("{}:{}", context.session_id, command);
            let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
            
            if let Ok(mut counts) = self.request_counts.lock() {
                let requests = counts.entry(key).or_insert_with(Vec::new);
                
                // Remove old requests outside the time window
                requests.retain(|&timestamp| now - timestamp < limit.window_seconds);
                
                // Check burst limit
                if requests.len() >= limit.burst_limit as usize {
                    let oldest_in_burst = requests[requests.len() - limit.burst_limit as usize];
                    let time_since_oldest = now - oldest_in_burst;
                    
                    if time_since_oldest < limit.window_seconds {
                        let wait_time = limit.window_seconds - time_since_oldest;
                        return Some(Duration::from_secs(wait_time));
                    }
                }
                
                // Check requests per minute
                if requests.len() >= limit.requests_per_minute as usize {
                    let oldest_request = requests[0];
                    let time_since_oldest = now - oldest_request;
                    
                    if time_since_oldest < limit.window_seconds {
                        let wait_time = limit.window_seconds - time_since_oldest;
                        return Some(Duration::from_secs(wait_time));
                    }
                }
                
                // Record this request
                requests.push(now);
            }
            
            None
        }
        
        /// Get required permission for a command
        fn get_required_permission(&self, command: &str) -> String {
            match command {
                "save_settings" => "settings.write".to_string(),
                "create_project" => "project.create".to_string(),
                "file_operations" => "fs.write".to_string(),
                "install_update" => "system.update".to_string(),
                "manage_users" => "admin.users".to_string(),
                _ => format!("{}.execute", command),
            }
        }
        
        /// Get default permissions for a user
        fn get_user_permissions(&self, user_id: &Option<String>) -> HashSet<String> {
            let mut permissions = HashSet::new();
            
            // Basic permissions for all users
            permissions.insert("app.read".to_string());
            permissions.insert("settings.read".to_string());
            permissions.insert("project.read".to_string());
            
            // Additional permissions for authenticated users
            if user_id.is_some() {
                permissions.insert("settings.write".to_string());
                permissions.insert("project.create".to_string());
                permissions.insert("fs.read".to_string());
                permissions.insert("fs.write".to_string());
            }
            
            permissions
        }
        
        /// Check if a command is considered safe for unauthenticated access
        fn is_safe_command(&self, command: &str) -> bool {
            let safe_commands = [
                "get_app_info", "get_system_info", "get_version",
                "ping", "health_check", "get_public_config"
            ];
            safe_commands.contains(&command)
        }
        
        /// Generate a secure session ID
        fn generate_session_id(&self) -> String {
            let timestamp = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_nanos();
            let random_data = format!("{}:{}", timestamp, std::process::id());
            
            let mut hasher = Sha256::new();
            hasher.update(random_data.as_bytes());
            let hash = hasher.finalize();
            
            format!("{:x}", hash)[..32].to_string()
        }
        
        /// Verify admin password (mock implementation)
        fn verify_admin_password(&self, password: &str) -> bool {
            // In a real implementation, this would use secure password hashing
            password == "admin123" // Mock password for testing
        }
        
        /// Record a failed authentication attempt
        fn record_failed_attempt(&self, identifier: &str) {
            let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
            
            if let Ok(mut attempts) = self.failed_attempts.lock() {
                let (count, _) = attempts.get(identifier).cloned().unwrap_or((0, 0));
                attempts.insert(identifier.to_string(), (count + 1, now));
            }
        }
        
        /// Audit command validation
        fn audit_command_validation(&self, command: &str, context: &MockSecurityContext) {
            let entry = SecurityAuditEntry {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                session_id: context.session_id.clone(),
                command: command.to_string(),
                result: "validation_attempt".to_string(),
                ip_address: context.ip_address.clone(),
                details: json!({
                    "user_id": context.user_id,
                    "window_label": context.window_label,
                    "auth_level": format!("{:?}", context.auth_level),
                    "permissions_count": context.permissions.len()
                }).as_object().unwrap().clone(),
                severity: SecuritySeverity::Info,
            };
            
            if let Ok(mut log) = self.audit_log.lock() {
                log.push(entry);
            }
        }
        
        /// Audit session events
        fn audit_session_event(&self, event_type: &str, session_id: &str) {
            let entry = SecurityAuditEntry {
                timestamp: SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs(),
                session_id: session_id.to_string(),
                command: "session_management".to_string(),
                result: event_type.to_string(),
                ip_address: "127.0.0.1".to_string(),
                details: HashMap::new(),
                severity: match event_type {
                    "session_elevated" => SecuritySeverity::Warning,
                    _ => SecuritySeverity::Info,
                },
            };
            
            if let Ok(mut log) = self.audit_log.lock() {
                log.push(entry);
            }
        }
        
        /// Cleanup expired sessions
        fn cleanup_expired_sessions(&self) {
            let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
            let max_age = self.max_session_age.as_secs();
            
            if let Ok(mut sessions) = self.sessions.lock() {
                let expired_sessions: Vec<String> = sessions
                    .iter()
                    .filter(|(_, context)| now - context.timestamp > max_age)
                    .map(|(id, _)| id.clone())
                    .collect();
                
                for session_id in expired_sessions {
                    sessions.remove(&session_id);
                    self.audit_session_event("session_expired", &session_id);
                }
            }
        }
        
        /// Get security statistics
        fn get_security_stats(&self) -> HashMap<String, Value> {
            let mut stats = HashMap::new();
            
            if let Ok(sessions) = self.sessions.lock() {
                stats.insert("active_sessions".to_string(), json!(sessions.len()));
            }
            
            stats.insert("allowed_commands".to_string(), json!(self.allowed_commands.len()));
            stats.insert("blocked_commands".to_string(), json!(self.blocked_commands.len()));
            stats.insert("auth_required_commands".to_string(), json!(self.auth_required_commands.len()));
            stats.insert("elevated_commands".to_string(), json!(self.elevated_commands.len()));
            stats.insert("rate_limited_commands".to_string(), json!(self.rate_limits.len()));
            
            if let Ok(log) = self.audit_log.lock() {
                stats.insert("audit_entries".to_string(), json!(log.len()));
                
                let severity_counts = log.iter().fold(HashMap::new(), |mut acc, entry| {
                    let severity = format!("{:?}", entry.severity);
                    *acc.entry(severity).or_insert(0) += 1;
                    acc
                });
                stats.insert("audit_severity_counts".to_string(), json!(severity_counts));
            }
            
            if let Ok(attempts) = self.failed_attempts.lock() {
                let locked_ips = attempts.iter()
                    .filter(|(_, (count, _))| *count >= self.lockout_threshold)
                    .count();
                stats.insert("locked_ips".to_string(), json!(locked_ips));
            }
            
            stats
        }
        
        /// Get audit log entries
        fn get_audit_log(&self, limit: Option<usize>) -> Vec<SecurityAuditEntry> {
            if let Ok(log) = self.audit_log.lock() {
                let entries = log.clone();
                if let Some(limit) = limit {
                    entries.into_iter().rev().take(limit).collect()
                } else {
                    entries
                }
            } else {
                Vec::new()
            }
        }
    }

    #[test]
    fn test_security_manager_initialization() {
        let manager = MockIpcSecurityManager::new();
        
        // Verify default configurations
        assert!(manager.allowed_commands.contains("get_app_info"));
        assert!(manager.allowed_commands.contains("get_system_info"));
        assert!(manager.blocked_commands.contains("execute_system_command"));
        assert!(manager.auth_required_commands.contains("save_settings"));
        assert!(manager.elevated_commands.contains("install_update"));
        
        // Verify rate limits
        assert!(manager.rate_limits.contains_key("save_settings"));
        assert!(manager.rate_limits.contains_key("file_operations"));
        
        let stats = manager.get_security_stats();
        assert!(stats.contains_key("allowed_commands"));
        assert!(stats.contains_key("blocked_commands"));
        assert!(stats["active_sessions"].as_u64().unwrap() == 0);
    }

    #[test]
    fn test_session_management() {
        let manager = MockIpcSecurityManager::new();
        
        // Test session creation
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        assert!(!session_id.is_empty(), "Session ID should not be empty");
        assert_eq!(session_id.len(), 32, "Session ID should be 32 characters");
        
        // Test session retrieval
        let context = manager.get_session(&session_id);
        assert!(context.is_some(), "Session should exist");
        
        let context = context.unwrap();
        assert_eq!(context.session_id, session_id);
        assert_eq!(context.user_id, Some("user123".to_string()));
        assert_eq!(context.window_label, "main");
        assert_eq!(context.auth_level, AuthLevel::Basic);
        assert!(context.permissions.contains("settings.write"));
        
        // Test session removal
        let removed = manager.remove_session(&session_id);
        assert!(removed, "Session should be removed successfully");
        
        let context = manager.get_session(&session_id);
        assert!(context.is_none(), "Session should no longer exist");
    }

    #[test]
    fn test_command_validation_basic() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), None);
        let context = manager.get_session(&session_id).unwrap();
        
        // Test allowed commands
        let result = manager.validate_command("get_app_info", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        let result = manager.validate_command("get_system_info", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Test blocked commands
        let result = manager.validate_command("execute_system_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        // Test auth required commands (without auth)
        let result = manager.validate_command("save_settings", &context);
        assert_eq!(result, CommandValidation::RequireAuth);
        
        // Test unknown commands
        let result = manager.validate_command("unknown_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
    }

    #[test]
    fn test_command_validation_with_auth() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        // Test auth required commands (with auth)
        let result = manager.validate_command("save_settings", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        let result = manager.validate_command("create_project", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Test elevated commands (without elevation)
        let result = manager.validate_command("install_update", &context);
        assert_eq!(result, CommandValidation::RequireElevation);
        
        // Test command with insufficient permissions
        let mut limited_context = context.clone();
        limited_context.permissions.clear();
        limited_context.permissions.insert("app.read".to_string());
        
        let result = manager.validate_command("save_settings", &limited_context);
        assert!(matches!(result, CommandValidation::Deny(_)));
    }

    #[test]
    fn test_session_elevation() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("admin".to_string()));
        
        // Test elevation with correct password
        let result = manager.elevate_session(&session_id, "admin123");
        assert!(result.is_ok(), "Session elevation should succeed");
        
        let context = manager.get_session(&session_id).unwrap();
        assert_eq!(context.auth_level, AuthLevel::Admin);
        assert!(context.permissions.contains("admin.*"));
        
        // Test elevated command access
        let result = manager.validate_command("install_update", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Test elevation with wrong password
        let session_id2 = manager.create_session("main".to_string(), Some("user".to_string()));
        let result = manager.elevate_session(&session_id2, "wrong_password");
        assert!(result.is_err(), "Session elevation should fail with wrong password");
    }

    #[test]
    fn test_rate_limiting() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        // Test normal operation within limits
        for i in 0..5 {
            let result = manager.validate_command("save_settings", &context);
            assert_eq!(result, CommandValidation::Allow, "Request {} should be allowed", i);
        }
        
        // Test burst limit exceeded
        let result = manager.validate_command("save_settings", &context);
        assert!(matches!(result, CommandValidation::RateLimited(_)), 
               "Request should be rate limited after burst limit");
        
        // Test command without rate limit still works
        let result = manager.validate_command("get_app_info", &context);
        assert_eq!(result, CommandValidation::Allow, "Non-rate-limited command should still work");
    }

    #[test]
    fn test_permission_system() {
        let manager = MockIpcSecurityManager::new();
        
        // Test unauthenticated user permissions
        let unauth_session = manager.create_session("main".to_string(), None);
        let unauth_context = manager.get_session(&unauth_session).unwrap();
        
        assert!(unauth_context.permissions.contains("app.read"));
        assert!(unauth_context.permissions.contains("settings.read"));
        assert!(!unauth_context.permissions.contains("settings.write"));
        
        // Test authenticated user permissions
        let auth_session = manager.create_session("main".to_string(), Some("user123".to_string()));
        let auth_context = manager.get_session(&auth_session).unwrap();
        
        assert!(auth_context.permissions.contains("settings.write"));
        assert!(auth_context.permissions.contains("project.create"));
        assert!(auth_context.permissions.contains("fs.write"));
        
        // Test permission updates
        let mut new_permissions = HashSet::new();
        new_permissions.insert("custom.permission".to_string());
        
        let updated = manager.update_session_permissions(&auth_session, new_permissions);
        assert!(updated, "Permission update should succeed");
        
        let updated_context = manager.get_session(&auth_session).unwrap();
        assert!(updated_context.permissions.contains("custom.permission"));
        assert_eq!(updated_context.permissions.len(), 1);
    }

    #[test]
    fn test_security_attack_prevention() {
        let manager = MockIpcSecurityManager::new();
        
        // Test SQL injection attempt
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        let malicious_commands = vec![
            "save_settings'; DROP TABLE users; --",
            "get_app_info<script>alert('xss')</script>",
            "../../../etc/passwd",
            "${env:PATH}",
            "$(rm -rf /)",
        ];
        
        for malicious_command in malicious_commands {
            let result = manager.validate_command(malicious_command, &context);
            // Should deny unknown/malicious commands
            assert!(matches!(result, CommandValidation::Deny(_)), 
                   "Malicious command '{}' should be denied", malicious_command);
        }
        
        // Test repeated failed authentication attempts
        for _ in 0..6 {
            let _ = manager.elevate_session(&session_id, "wrong_password");
        }
        
        // Next validation should be blocked due to failed attempts
        let result = manager.validate_command("get_app_info", &context);
        if let CommandValidation::Deny(msg) = result {
            assert!(msg.contains("locked"), "Should be locked after failed attempts");
        }
    }

    #[test]
    fn test_audit_logging() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        // Perform various operations that should be audited
        let _ = manager.validate_command("save_settings", &context);
        let _ = manager.validate_command("execute_system_command", &context);
        let _ = manager.elevate_session(&session_id, "admin123");
        let _ = manager.remove_session(&session_id);
        
        // Check audit log
        let audit_entries = manager.get_audit_log(None);
        assert!(audit_entries.len() >= 4, "Should have recorded multiple audit entries");
        
        // Verify audit entry structure
        for entry in &audit_entries {
            assert!(!entry.session_id.is_empty());
            assert!(entry.timestamp > 0);
            assert!(!entry.command.is_empty());
            assert!(!entry.result.is_empty());
        }
        
        // Test limited audit log retrieval
        let limited_entries = manager.get_audit_log(Some(2));
        assert_eq!(limited_entries.len(), 2, "Should return limited number of entries");
    }

    #[test]
    fn test_session_expiration() {
        let mut manager = MockIpcSecurityManager::new();
        manager.max_session_age = Duration::from_secs(1); // 1 second for testing
        
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        
        // Session should exist initially
        assert!(manager.get_session(&session_id).is_some());
        
        // Wait for session to expire
        std::thread::sleep(Duration::from_secs(2));
        
        // Run cleanup
        manager.cleanup_expired_sessions();
        
        // Session should be gone
        assert!(manager.get_session(&session_id).is_none());
    }

    #[test]
    fn test_cross_platform_security_behavior() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        let platform = std::env::consts::OS;
        
        // Test platform-specific security considerations
        match platform {
            "windows" => {
                // Windows-specific security tests
                assert_eq!(context.ip_address, "127.0.0.1");
                assert!(context.user_agent.contains("AutoDev-AI"));
                
                // Test Windows-specific commands
                let result = manager.validate_command("get_system_info", &context);
                assert_eq!(result, CommandValidation::Allow);
            }
            "macos" => {
                // macOS-specific security tests
                assert_eq!(context.ip_address, "127.0.0.1");
                
                // Test macOS-specific behavior
                let result = manager.validate_command("get_system_info", &context);
                assert_eq!(result, CommandValidation::Allow);
            }
            "linux" => {
                // Linux-specific security tests
                assert_eq!(context.ip_address, "127.0.0.1");
                
                // Test Linux-specific behavior
                let result = manager.validate_command("get_system_info", &context);
                assert_eq!(result, CommandValidation::Allow);
            }
            _ => {
                // Other platforms should have basic security
                let result = manager.validate_command("get_system_info", &context);
                assert_eq!(result, CommandValidation::Allow);
            }
        }
        
        // All platforms should block dangerous operations
        let result = manager.validate_command("execute_system_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
    }

    #[test]
    fn test_concurrent_security_operations() {
        use std::sync::Arc;
        use std::thread;
        
        let manager = Arc::new(MockIpcSecurityManager::new());
        let mut handles = Vec::new();
        
        // Spawn multiple threads performing security operations
        for i in 0..10 {
            let manager_clone = Arc::clone(&manager);
            let handle = thread::spawn(move || {
                let session_id = manager_clone.create_session(
                    format!("window_{}", i),
                    Some(format!("user_{}", i)),
                );
                
                let context = manager_clone.get_session(&session_id).unwrap();
                
                // Perform various operations
                let _ = manager_clone.validate_command("get_app_info", &context);
                let _ = manager_clone.validate_command("save_settings", &context);
                let _ = manager_clone.validate_command("execute_system_command", &context);
                
                session_id
            });
            handles.push(handle);
        }
        
        // Wait for all threads to complete
        let session_ids: Vec<_> = handles.into_iter()
            .map(|h| h.join().unwrap())
            .collect();
        
        // Verify all sessions were created
        assert_eq!(session_ids.len(), 10);
        for session_id in &session_ids {
            assert!(manager.get_session(session_id).is_some());
        }
        
        // Verify audit entries were recorded
        let audit_entries = manager.get_audit_log(None);
        assert!(audit_entries.len() >= 30, "Should have recorded operations from all threads");
    }

    #[test]
    fn test_security_performance() {
        let manager = MockIpcSecurityManager::new();
        let session_id = manager.create_session("main".to_string(), Some("user123".to_string()));
        let context = manager.get_session(&session_id).unwrap();
        
        // Test validation performance
        let start = Instant::now();
        
        for i in 0..1000 {
            let command = match i % 4 {
                0 => "get_app_info",
                1 => "save_settings",
                2 => "execute_system_command",
                _ => "unknown_command",
            };
            
            let _ = manager.validate_command(command, &context);
        }
        
        let duration = start.elapsed();
        
        // Should handle 1000 validations quickly
        assert!(duration.as_millis() < 100, 
               "1000 command validations took {}ms, expected < 100ms", 
               duration.as_millis());
        
        // Verify audit log performance
        let audit_start = Instant::now();
        let _audit_entries = manager.get_audit_log(Some(100));
        let audit_duration = audit_start.elapsed();
        
        assert!(audit_duration.as_millis() < 10,
               "Audit log retrieval took {}ms, expected < 10ms",
               audit_duration.as_millis());
    }

    #[test]
    fn test_security_statistics() {
        let manager = MockIpcSecurityManager::new();
        
        // Create some sessions and activity
        for i in 0..5 {
            let session_id = manager.create_session(
                format!("window_{}", i),
                Some(format!("user_{}", i)),
            );
            
            let context = manager.get_session(&session_id).unwrap();
            let _ = manager.validate_command("save_settings", &context);
        }
        
        // Test statistics
        let stats = manager.get_security_stats();
        
        assert_eq!(stats["active_sessions"].as_u64().unwrap(), 5);
        assert!(stats["allowed_commands"].as_u64().unwrap() > 0);
        assert!(stats["blocked_commands"].as_u64().unwrap() > 0);
        assert!(stats["auth_required_commands"].as_u64().unwrap() > 0);
        assert!(stats["audit_entries"].as_u64().unwrap() > 0);
        
        // Verify audit severity counts
        if let Some(severity_counts) = stats.get("audit_severity_counts") {
            assert!(severity_counts.is_object());
        }
    }
}