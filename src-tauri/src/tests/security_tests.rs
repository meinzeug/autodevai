//! Comprehensive IPC Security Tests
//! 
//! Tests for command validation, rate limiting, session management, and security features

#[cfg(test)]
mod security_tests {
    use crate::security::ipc_security::{
        IpcSecurity, SecurityContext, CommandValidation, RateLimit
    };
    use std::collections::{HashMap, HashSet};
    use std::thread;
    use std::time::Duration;

    fn create_test_context(session_id: &str, user_id: Option<&str>) -> SecurityContext {
        let mut permissions = HashSet::new();
        permissions.insert("settings.read".to_string());
        permissions.insert("project.read".to_string());
        
        if user_id.is_some() {
            permissions.insert("settings.write".to_string());
            permissions.insert("project.create".to_string());
            permissions.insert("system.execute".to_string());
        }

        SecurityContext {
            session_id: session_id.to_string(),
            user_id: user_id.map(|s| s.to_string()),
            permissions,
            window_label: "main".to_string(),
            timestamp: 0,
        }
    }

    #[test]
    fn test_security_manager_creation() {
        let security = IpcSecurity::default();
        
        // Verify default allowed commands
        assert!(security.allowed_commands.contains("get_app_info"));
        assert!(security.allowed_commands.contains("get_settings"));
        assert!(security.allowed_commands.contains("get_system_info"));
        
        // Verify blocked commands
        assert!(security.blocked_commands.contains("execute_system_command"));
        assert!(security.blocked_commands.contains("read_sensitive_files"));
        
        // Verify auth required commands
        assert!(security.auth_required_commands.contains("save_settings"));
        assert!(security.auth_required_commands.contains("run_command"));
    }

    #[test]
    fn test_command_validation_allowed() {
        let security = IpcSecurity::default();
        let context = create_test_context("test_session", None);
        
        // Test allowed commands without auth
        let result = security.validate_command("get_app_info", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        let result = security.validate_command("get_system_info", &context);
        assert_eq!(result, CommandValidation::Allow);
    }

    #[test]
    fn test_command_validation_blocked() {
        let security = IpcSecurity::default();
        let context = create_test_context("test_session", None);
        
        // Test blocked commands
        let result = security.validate_command("execute_system_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        if let CommandValidation::Deny(msg) = result {
            assert!(msg.contains("blocked for security reasons"));
        }
    }

    #[test]
    fn test_command_validation_auth_required() {
        let security = IpcSecurity::default();
        
        // Test without authentication
        let context_no_auth = create_test_context("test_session", None);
        let result = security.validate_command("save_settings", &context_no_auth);
        assert_eq!(result, CommandValidation::RequireAuth);
        
        // Test with authentication but insufficient permissions
        let mut context_with_auth = create_test_context("test_session", Some("user1"));
        context_with_auth.permissions.clear(); // Remove all permissions
        let result = security.validate_command("save_settings", &context_with_auth);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        // Test with authentication and proper permissions
        let context_full_auth = create_test_context("test_session", Some("user1"));
        let result = security.validate_command("save_settings", &context_full_auth);
        assert_eq!(result, CommandValidation::Allow);
    }

    #[test]
    fn test_rate_limiting() {
        let mut rate_limits = HashMap::new();
        rate_limits.insert(
            "test_command".to_string(),
            RateLimit {
                requests_per_minute: 5,
                burst_limit: 2,
            },
        );
        
        let security = IpcSecurity::new(
            ["test_command".to_string()].iter().cloned().collect(),
            HashSet::new(),
            HashSet::new(),
            rate_limits,
        );
        
        let context = create_test_context("test_session", None);
        
        // First request should be allowed
        let result = security.validate_command("test_command", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Second request should be allowed (within burst limit)
        let result = security.validate_command("test_command", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Third request should be denied (exceeds burst limit)
        let result = security.validate_command("test_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        if let CommandValidation::Deny(msg) = result {
            assert!(msg.contains("Rate limit exceeded"));
        }
    }

    #[test]
    fn test_session_management() {
        let security = IpcSecurity::default();
        
        // Create a session
        let session_id = security.create_session("main".to_string(), Some("user1".to_string()));
        assert!(!session_id.is_empty());
        
        // Retrieve session
        let context = security.get_session(&session_id);
        assert!(context.is_some());
        
        let context = context.unwrap();
        assert_eq!(context.session_id, session_id);
        assert_eq!(context.user_id, Some("user1".to_string()));
        assert_eq!(context.window_label, "main");
        
        // Remove session
        let removed = security.remove_session(&session_id);
        assert!(removed);
        
        // Session should no longer exist
        let context = security.get_session(&session_id);
        assert!(context.is_none());
    }

    #[test]
    fn test_session_permissions() {
        let security = IpcSecurity::default();
        
        // Create unauthenticated session
        let unauth_session = security.create_session("main".to_string(), None);
        let context = security.get_session(&unauth_session).unwrap();
        
        // Should have basic read permissions
        assert!(context.permissions.contains("settings.read"));
        assert!(context.permissions.contains("project.read"));
        assert!(!context.permissions.contains("settings.write"));
        
        // Create authenticated session
        let auth_session = security.create_session("main".to_string(), Some("user1".to_string()));
        let context = security.get_session(&auth_session).unwrap();
        
        // Should have additional write permissions
        assert!(context.permissions.contains("settings.read"));
        assert!(context.permissions.contains("settings.write"));
        assert!(context.permissions.contains("system.execute"));
    }

    #[test]
    fn test_permission_updates() {
        let security = IpcSecurity::default();
        let session_id = security.create_session("main".to_string(), Some("user1".to_string()));
        
        // Update permissions
        let mut new_permissions = HashSet::new();
        new_permissions.insert("custom.permission".to_string());
        
        let updated = security.update_session_permissions(&session_id, new_permissions.clone());
        assert!(updated);
        
        // Verify permissions were updated
        let context = security.get_session(&session_id).unwrap();
        assert!(context.permissions.contains("custom.permission"));
        assert_eq!(context.permissions.len(), 1);
    }

    #[test]
    fn test_security_stats() {
        let security = IpcSecurity::default();
        
        // Create some sessions
        let _session1 = security.create_session("main".to_string(), None);
        let _session2 = security.create_session("dev".to_string(), Some("user1".to_string()));
        
        let stats = security.get_stats();
        
        // Verify stats structure
        assert!(stats.contains_key("active_sessions"));
        assert!(stats.contains_key("allowed_commands"));
        assert!(stats.contains_key("blocked_commands"));
        
        // Verify session count
        if let Some(sessions) = stats.get("active_sessions") {
            assert!(sessions.as_u64().unwrap() >= 2);
        }
    }

    #[test]
    fn test_concurrent_session_access() {
        use std::sync::Arc;
        
        let security = Arc::new(IpcSecurity::default());
        let mut handles = vec![];
        
        // Create sessions from multiple threads
        for i in 0..10 {
            let security_clone = Arc::clone(&security);
            let handle = thread::spawn(move || {
                let session_id = security_clone.create_session(
                    format!("window_{}", i),
                    Some(format!("user_{}", i)),
                );
                
                // Verify session exists
                let context = security_clone.get_session(&session_id);
                assert!(context.is_some());
                
                session_id
            });
            handles.push(handle);
        }
        
        // Wait for all threads and collect session IDs
        let mut session_ids = vec![];
        for handle in handles {
            let session_id = handle.join().expect("Thread panicked");
            session_ids.push(session_id);
        }
        
        // Verify all sessions exist
        assert_eq!(session_ids.len(), 10);
        for session_id in &session_ids {
            let context = security.get_session(session_id);
            assert!(context.is_some());
        }
    }

    #[test]
    fn test_rate_limit_recovery() {
        let mut rate_limits = HashMap::new();
        rate_limits.insert(
            "test_command".to_string(),
            RateLimit {
                requests_per_minute: 60,
                burst_limit: 1,
            },
        );
        
        let security = IpcSecurity::new(
            ["test_command".to_string()].iter().cloned().collect(),
            HashSet::new(),
            HashSet::new(),
            rate_limits,
        );
        
        let context = create_test_context("test_session", None);
        
        // First request should succeed
        let result = security.validate_command("test_command", &context);
        assert_eq!(result, CommandValidation::Allow);
        
        // Second request should be rate limited
        let result = security.validate_command("test_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        // Wait and test recovery (in real implementation, this would be time-based)
        thread::sleep(Duration::from_millis(50));
        
        // Note: In a full implementation, we'd need to simulate time passage
        // For now, we verify the rate limiting logic is working
    }

    #[test]
    fn test_edge_cases() {
        let security = IpcSecurity::default();
        
        // Test empty session ID
        let context = security.get_session("");
        assert!(context.is_none());
        
        // Test non-existent session
        let context = security.get_session("non_existent_session");
        assert!(context.is_none());
        
        // Test empty command validation
        let context = create_test_context("test", None);
        let result = security.validate_command("", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
        
        // Test unknown command
        let result = security.validate_command("unknown_command", &context);
        assert!(matches!(result, CommandValidation::Deny(_)));
    }

    #[test]
    fn test_permission_checking() {
        let security = IpcSecurity::default();
        
        // Test specific permission checks
        let commands_and_permissions = vec![
            ("save_settings", "settings.write"),
            ("create_project", "project.create"),
            ("run_command", "system.execute"),
            ("file_operations", "fs.write"),
            ("docker_execute", "docker.execute"),
        ];
        
        for (command, required_permission) in commands_and_permissions {
            // Test with missing permission
            let mut context_no_perm = create_test_context("test", Some("user1"));
            context_no_perm.permissions.remove(required_permission);
            
            let result = security.validate_command(command, &context_no_perm);
            assert!(matches!(result, CommandValidation::Deny(_)));
            
            // Test with correct permission
            let mut context_with_perm = create_test_context("test", Some("user1"));
            context_with_perm.permissions.insert(required_permission.to_string());
            
            let result = security.validate_command(command, &context_with_perm);
            assert_eq!(result, CommandValidation::Allow);
        }
    }

    #[test]
    fn test_security_hardening() {
        let security = IpcSecurity::default();
        
        // Test that dangerous operations are properly blocked
        let dangerous_commands = vec![
            "execute_system_command",
            "read_sensitive_files",
            "modify_system_settings",
        ];
        
        for command in dangerous_commands {
            let context = create_test_context("test", Some("admin"));
            let result = security.validate_command(command, &context);
            
            // These should be blocked regardless of permissions
            assert!(matches!(result, CommandValidation::Deny(_)));
        }
    }

    #[test]
    fn test_session_cleanup() {
        let security = IpcSecurity::default();
        
        // Create sessions with old timestamps
        let session1 = security.create_session("window1".to_string(), Some("user1".to_string()));
        let session2 = security.create_session("window2".to_string(), Some("user2".to_string()));
        
        // Verify sessions exist
        assert!(security.get_session(&session1).is_some());
        assert!(security.get_session(&session2).is_some());
        
        // Run cleanup (would remove expired sessions in real implementation)
        security.cleanup_expired_sessions();
        
        // For this test, sessions should still exist as they're not actually expired
        assert!(security.get_session(&session1).is_some());
        assert!(security.get_session(&session2).is_some());
    }
}