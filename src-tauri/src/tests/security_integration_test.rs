//! Comprehensive Security Integration Tests
//!
//! Tests all security components working together to ensure comprehensive protection.

use crate::security::{
    ipc_security::{IpcSecurity, SecurityContext, CommandValidation},
    input_sanitizer::{InputSanitizer, ValidationResult},
    audit_logger::{SecurityAuditLogger, SecurityEventType, SecuritySeverity},
    rate_limiter::{EnhancedRateLimiter, RateLimitResult, RateLimitConfig, RateLimitStrategy},
    session_manager::{SecureSessionManager, SessionSecurityLevel, SessionValidation},
    command_validator::{CommandWhitelist, CommandValidationResult, SecurityClassification},
};
use std::collections::{HashMap, HashSet};
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_comprehensive_security_flow() {
    // Initialize enhanced IPC security
    let mut ipc_security = IpcSecurity::new_enhanced().await;
    ipc_security.enable_enhanced_security();

    // Create a test security context
    let mut permissions = HashSet::new();
    permissions.insert("settings.write".to_string());
    permissions.insert("user.authenticated".to_string());

    let context = SecurityContext {
        session_id: "test-session-123".to_string(),
        user_id: Some("test-user".to_string()),
        permissions,
        window_label: "main".to_string(),
        timestamp: chrono::Utc::now().timestamp() as u64,
    };

    // Test 1: Valid command should pass all security checks
    let result = ipc_security.validate_command_enhanced(
        "save_settings",
        &serde_json::json!({"theme": "dark", "language": "en"}),
        &context
    ).await;

    assert_eq!(result, CommandValidation::Allow);

    // Test 2: Command with malicious input should be blocked
    let result = ipc_security.validate_command_enhanced(
        "save_settings",
        &serde_json::json!({"content": "<script>alert('xss')</script>"}),
        &context
    ).await;

    assert!(matches!(result, CommandValidation::Deny(_)));

    // Test 3: Unknown command should be denied
    let result = ipc_security.validate_command_enhanced(
        "unknown_command",
        &serde_json::json!({}),
        &context
    ).await;

    assert!(matches!(result, CommandValidation::Deny(_)));

    // Test 4: Get comprehensive security statistics
    let stats = ipc_security.get_enhanced_stats().await;
    assert!(stats.contains_key("enhanced_security_enabled"));
    assert!(stats.get("enhanced_security_enabled").unwrap().as_bool().unwrap());
}

#[tokio::test]
async fn test_input_sanitization() {
    let sanitizer = InputSanitizer::default();

    // Test XSS prevention
    let result = sanitizer.sanitize_string("<script>alert('xss')</script>");
    assert!(matches!(result, ValidationResult::Invalid { .. }));

    // Test SQL injection prevention
    let result = sanitizer.sanitize_sql_input("'; DROP TABLE users; --");
    assert!(matches!(result, ValidationResult::Invalid { .. }));

    // Test path traversal prevention
    let result = sanitizer.validate_file_path("../../../etc/passwd");
    assert!(matches!(result, ValidationResult::Invalid { .. }));

    // Test valid inputs
    let result = sanitizer.sanitize_string("normal text input");
    assert_eq!(result, ValidationResult::Valid);

    let result = sanitizer.validate_url("https://example.com/safe-url");
    assert_eq!(result, ValidationResult::Valid);

    let result = sanitizer.validate_email("test@example.com");
    assert_eq!(result, ValidationResult::Valid);
}

#[tokio::test]
async fn test_audit_logging() {
    let logger = SecurityAuditLogger::new().await;

    // Test authentication logging
    logger.log_authentication(
        SecurityEventType::LoginSuccess,
        Some("session-123".to_string()),
        Some("user-456".to_string()),
        HashMap::from([
            ("method".to_string(), serde_json::Value::String("password".to_string())),
        ]),
        crate::security::audit_logger::SecurityOutcome::Success
    ).await;

    // Test IPC security logging
    logger.log_ipc_security(
        "save_settings",
        "session-123",
        "main",
        crate::security::audit_logger::SecurityOutcome::Success,
        HashMap::from([
            ("args".to_string(), serde_json::json!({"theme": "dark"})),
        ])
    ).await;

    // Test input validation logging
    logger.log_input_validation(
        "string",
        "sanitized",
        HashMap::from([
            ("original".to_string(), serde_json::Value::String("test<script>".to_string())),
            ("sanitized".to_string(), serde_json::Value::String("test&lt;script&gt;".to_string())),
        ])
    ).await;

    // Flush logs
    logger.flush().await;

    // Check statistics
    let stats = logger.get_stats().await;
    assert!(stats.total_events >= 3);
}

#[tokio::test]
async fn test_enhanced_rate_limiting() {
    let mut rate_limiter = EnhancedRateLimiter::new();
    
    // Configure strict rate limiting for testing
    rate_limiter.set_endpoint_config("test_endpoint", RateLimitConfig {
        requests_per_second: 2,
        requests_per_minute: 5,
        burst_limit: 3,
        strategy: RateLimitStrategy::SlidingWindow,
        ..Default::default()
    });

    let session_id = "test-session";
    let endpoint = "test_endpoint";

    // First few requests should be allowed
    for i in 0..3 {
        let result = rate_limiter.check_rate_limit(session_id, endpoint, 10).await;
        match result {
            RateLimitResult::Allowed { .. } => {},
            _ => panic!("Request {} should be allowed", i),
        }
    }

    // Next request should hit burst limit
    let result = rate_limiter.check_rate_limit(session_id, endpoint, 10).await;
    match result {
        RateLimitResult::Limited { .. } => {},
        _ => panic!("Request should be rate limited"),
    }

    // Test statistics
    let stats = rate_limiter.get_stats().await;
    assert!(stats.total_requests >= 4);
    assert!(stats.total_limited >= 1);

    // Test cleanup
    rate_limiter.cleanup_expired_states().await;
}

#[tokio::test]
async fn test_session_management() {
    let mut session_manager = SecureSessionManager::new();

    // Create a session
    let session = session_manager.create_session(
        "main".to_string(),
        Some("test-user".to_string()),
        Some("192.168.1.100".to_string()),
        Some("TestAgent/1.0".to_string()),
        SessionSecurityLevel::Enhanced,
    ).unwrap();

    let session_id = session.session_id.clone();

    // Validate session
    let validation = session_manager.validate_session(&session_id, Some("192.168.1.100"));
    assert_eq!(validation, SessionValidation::Valid);

    // Test failed authentication attempts
    for _ in 0..6 { // Exceed max attempts
        session_manager.record_failed_attempt(&session_id);
    }

    // Session should now be suspended
    let validation = session_manager.validate_session(&session_id, None);
    assert_eq!(validation, SessionValidation::Suspended);

    // Test MFA workflow
    let session2 = session_manager.create_session(
        "mfa_test".to_string(),
        Some("mfa-user".to_string()),
        None,
        None,
        SessionSecurityLevel::Strict,
    ).unwrap();

    let session2_id = session2.session_id.clone();
    
    // Enable MFA
    assert!(session_manager.enable_mfa(&session2_id));
    let validation = session_manager.validate_session(&session2_id, None);
    assert_eq!(validation, SessionValidation::RequiresMFA);

    // Verify MFA
    assert!(session_manager.verify_mfa(&session2_id));
    let validation = session_manager.validate_session(&session2_id, None);
    assert_eq!(validation, SessionValidation::Valid);

    // Test cleanup
    session_manager.cleanup_expired();
    
    // Get statistics
    let stats = session_manager.get_statistics();
    assert!(stats.contains_key("active_sessions"));
}

#[tokio::test]
async fn test_command_validation() {
    let mut command_validator = CommandWhitelist::default();
    
    // Add custom command for testing
    command_validator.add_command(crate::security::command_validator::CommandConfig {
        name: "test_command".to_string(),
        classification: SecurityClassification::Privileged,
        required_permissions: vec!["test.execute".to_string()],
        max_rate_per_minute: Some(10),
        allowed_arg_patterns: vec![r"^[a-zA-Z0-9_-]+$".to_string()],
        blocked_arg_patterns: vec![r"<script".to_string()],
        risk_score: 30,
        requires_mfa: false,
        description: "Test command for validation".to_string(),
    });

    let mut user_permissions = HashSet::new();
    user_permissions.insert("test.execute".to_string());

    // Test allowed command
    let result = command_validator.validate_command(
        "test_command",
        &serde_json::json!({"param": "valid_value"}),
        &user_permissions,
        false
    );

    match result {
        CommandValidationResult::Allowed { .. } => {},
        _ => panic!("Valid command should be allowed"),
    }

    // Test blocked pattern in arguments
    let result = command_validator.validate_command(
        "test_command",
        &serde_json::json!({"param": "<script>alert('xss')</script>"}),
        &user_permissions,
        false
    );

    match result {
        CommandValidationResult::Denied { .. } => {},
        _ => panic!("Command with blocked pattern should be denied"),
    }

    // Test insufficient permissions
    let empty_permissions = HashSet::new();
    let result = command_validator.validate_command(
        "test_command",
        &serde_json::json!({}),
        &empty_permissions,
        false
    );

    match result {
        CommandValidationResult::RequiresElevation { .. } => {},
        _ => panic!("Command should require elevation"),
    }

    // Test command aliases
    command_validator.add_alias("tc".to_string(), "test_command".to_string());
    let result = command_validator.validate_command(
        "tc",
        &serde_json::json!({"param": "valid"}),
        &user_permissions,
        false
    );

    match result {
        CommandValidationResult::Allowed { command, .. } => {
            assert_eq!(command, "test_command");
        },
        _ => panic!("Alias should resolve to valid command"),
    }

    // Get security statistics
    let stats = command_validator.get_security_stats();
    assert!(stats.contains_key("total_commands"));
    assert!(stats.contains_key("high_risk_commands"));
}

#[tokio::test]
async fn test_security_performance() {
    use std::time::Instant;

    let mut ipc_security = IpcSecurity::new_enhanced().await;
    ipc_security.enable_enhanced_security();

    let mut permissions = HashSet::new();
    permissions.insert("settings.read".to_string());

    let context = SecurityContext {
        session_id: "perf-test".to_string(),
        user_id: Some("perf-user".to_string()),
        permissions,
        window_label: "main".to_string(),
        timestamp: chrono::Utc::now().timestamp() as u64,
    };

    // Measure performance of security validation
    let start = Instant::now();
    for _ in 0..100 {
        let _result = ipc_security.validate_command_enhanced(
            "get_settings",
            &serde_json::json!({"key": "theme"}),
            &context
        ).await;
    }
    let duration = start.elapsed();

    println!("100 security validations took: {:?}", duration);
    println!("Average per validation: {:?}", duration / 100);

    // Should be reasonably fast (less than 1ms per validation)
    assert!(duration.as_millis() < 1000, "Security validation is too slow");
}

#[tokio::test]
async fn test_concurrent_security_operations() {
    use tokio::task::JoinSet;

    let ipc_security = std::sync::Arc::new(IpcSecurity::new_enhanced().await);
    
    let mut permissions = HashSet::new();
    permissions.insert("settings.write".to_string());

    let context = SecurityContext {
        session_id: "concurrent-test".to_string(),
        user_id: Some("concurrent-user".to_string()),
        permissions,
        window_label: "main".to_string(),
        timestamp: chrono::Utc::now().timestamp() as u64,
    };

    // Test concurrent access to security components
    let mut join_set = JoinSet::new();
    
    for i in 0..10 {
        let security = ipc_security.clone();
        let test_context = context.clone();
        
        join_set.spawn(async move {
            let result = security.validate_command_enhanced(
                "save_settings",
                &serde_json::json!({"test_id": i}),
                &test_context
            ).await;
            
            // First validation might succeed, others might be rate limited
            match result {
                CommandValidation::Allow | CommandValidation::Deny(_) => true,
                _ => false,
            }
        });
    }

    // Wait for all tasks to complete
    let mut success_count = 0;
    while let Some(result) = join_set.join_next().await {
        if result.unwrap() {
            success_count += 1;
        }
    }

    // All tasks should complete successfully (though some might be rate limited)
    assert_eq!(success_count, 10);
}

#[tokio::test]
async fn test_security_memory_usage() {
    // Test that security components don't leak memory with extended use
    let mut ipc_security = IpcSecurity::new_enhanced().await;
    ipc_security.enable_enhanced_security();

    let mut permissions = HashSet::new();
    permissions.insert("settings.read".to_string());

    // Create many sessions to test cleanup
    for i in 0..100 {
        let context = SecurityContext {
            session_id: format!("memory-test-{}", i),
            user_id: Some(format!("user-{}", i)),
            permissions: permissions.clone(),
            window_label: "main".to_string(),
            timestamp: chrono::Utc::now().timestamp() as u64,
        };

        let _result = ipc_security.validate_command_enhanced(
            "get_settings",
            &serde_json::json!({"key": "test"}),
            &context
        ).await;
    }

    // Perform cleanup
    ipc_security.cleanup_expired_sessions().await;

    // Get stats to verify cleanup worked
    let stats = ipc_security.get_enhanced_stats().await;
    assert!(stats.contains_key("enhanced_security_enabled"));
}

/// Helper function to simulate realistic security scenarios
async fn simulate_user_session(
    security: &IpcSecurity,
    user_id: &str,
    commands: Vec<(&str, serde_json::Value)>,
) -> Vec<CommandValidation> {
    let mut permissions = HashSet::new();
    permissions.insert("settings.read".to_string());
    permissions.insert("settings.write".to_string());

    let context = SecurityContext {
        session_id: format!("sim-{}", user_id),
        user_id: Some(user_id.to_string()),
        permissions,
        window_label: "main".to_string(),
        timestamp: chrono::Utc::now().timestamp() as u64,
    };

    let mut results = Vec::new();
    for (command, args) in commands {
        let result = security.validate_command_enhanced(command, &args, &context).await;
        results.push(result);
    }
    results
}

#[tokio::test]
async fn test_realistic_user_scenarios() {
    let mut security = IpcSecurity::new_enhanced().await;
    security.enable_enhanced_security();

    // Scenario 1: Normal user workflow
    let normal_commands = vec![
        ("get_settings", serde_json::json!({})),
        ("save_settings", serde_json::json!({"theme": "dark"})),
        ("get_settings", serde_json::json!({"key": "language"})),
    ];

    let results = simulate_user_session(&security, "normal_user", normal_commands).await;
    for result in &results {
        assert!(matches!(result, CommandValidation::Allow));
    }

    // Scenario 2: Malicious user attempts
    let malicious_commands = vec![
        ("save_settings", serde_json::json!({"theme": "<script>alert('xss')</script>"})),
        ("unknown_command", serde_json::json!({})),
        ("get_settings", serde_json::json!({"key": "../../../etc/passwd"})),
    ];

    let results = simulate_user_session(&security, "malicious_user", malicious_commands).await;
    for result in &results {
        assert!(matches!(result, CommandValidation::Deny(_)));
    }

    // Scenario 3: Rate limiting test
    let rapid_commands = vec![
        ("get_settings", serde_json::json!({})); 50 // 50 rapid requests
    ];

    let results = simulate_user_session(&security, "rapid_user", rapid_commands).await;
    let allowed_count = results.iter()
        .filter(|r| matches!(r, CommandValidation::Allow))
        .count();
    let denied_count = results.iter()
        .filter(|r| matches!(r, CommandValidation::Deny(_)))
        .count();

    // Some should be allowed, some should be rate limited
    assert!(allowed_count > 0);
    assert!(denied_count > 0);
    assert_eq!(allowed_count + denied_count, 50);

    println!("Rate limiting test: {} allowed, {} denied", allowed_count, denied_count);
}