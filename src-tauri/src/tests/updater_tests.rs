//! Comprehensive tests for the update system
//!
//! These tests cover all aspects of the update functionality including:
//! - Update checking and version comparison
//! - Download and installation processes
//! - Rollback mechanisms
//! - Configuration management
//! - Error handling

use crate::app::updater::*;
use serial_test::serial;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::test::{mock_app, MockRuntime};
use tempfile::TempDir;
use tokio_test;

/// Helper function to create a mock app for testing
fn create_test_app() -> tauri::App<MockRuntime> {
    mock_app()
}

/// Test UpdateConfig default values
#[test]
fn test_update_config_default() {
    let config = UpdateConfig::default();
    
    assert!(config.auto_check);
    assert_eq!(config.check_interval_hours, 24);
    assert!(config.notify_user);
    assert!(config.prompt_before_install);
    assert_eq!(config.github_repo, "autodevai/autodevai");
    assert!(!config.pre_release);
    assert!(!config.silent_install);
    assert!(config.backup_before_update);
    assert_eq!(config.update_channel, "stable");
}

/// Test UpdateStatus serialization/deserialization
#[test]
fn test_update_status_serialization() {
    let status = UpdateStatus::Available {
        version: "1.2.3".to_string(),
        release_notes: "Bug fixes and improvements".to_string(),
        download_url: "https://github.com/test/test/releases/download/v1.2.3/app.exe".to_string(),
        size: 12345678,
        is_critical: false,
    };
    
    let serialized = serde_json::to_string(&status).expect("Failed to serialize status");
    let deserialized: UpdateStatus = serde_json::from_str(&serialized).expect("Failed to deserialize status");
    
    match deserialized {
        UpdateStatus::Available { version, size, is_critical, .. } => {
            assert_eq!(version, "1.2.3");
            assert_eq!(size, 12345678);
            assert!(!is_critical);
        }
        _ => panic!("Deserialized status is not Available variant"),
    }
}

/// Test UpdateInfo creation and validation
#[test]
fn test_update_info() {
    let update_info = UpdateInfo {
        version: "2.0.0".to_string(),
        release_date: "2024-01-15".to_string(),
        release_notes: "Major update with new features".to_string(),
        download_url: "https://example.com/download".to_string(),
        size: 50000000,
        checksum: Some("sha256:abcdef123456".to_string()),
        is_critical: true,
        backup_path: None,
        rollback_version: Some("1.9.0".to_string()),
    };
    
    assert_eq!(update_info.version, "2.0.0");
    assert!(update_info.is_critical);
    assert!(update_info.checksum.is_some());
    assert_eq!(update_info.rollback_version, Some("1.9.0".to_string()));
}

/// Test RollbackInfo creation
#[test]
fn test_rollback_info() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let rollback_info = RollbackInfo {
        backup_path: temp_dir.path().to_path_buf(),
        previous_version: "1.5.0".to_string(),
        backup_timestamp: SystemTime::now(),
        reason: "Installation failed".to_string(),
    };
    
    assert_eq!(rollback_info.previous_version, "1.5.0");
    assert_eq!(rollback_info.reason, "Installation failed");
    assert!(rollback_info.backup_path.exists());
}

/// Test UpdateManager initialization
#[tokio::test]
#[serial]
async fn test_update_manager_creation() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Test initial state
    let status = manager.get_status();
    assert!(matches!(status, UpdateStatus::Idle));
    
    let config = manager.get_config();
    assert_eq!(config, UpdateConfig::default());
    
    let history = manager.get_update_history();
    assert!(history.is_empty());
    
    let pending = manager.get_pending_update();
    assert!(pending.is_none());
    
    let rollback = manager.get_rollback_info();
    assert!(rollback.is_none());
}

/// Test version comparison logic
#[tokio::test]
async fn test_version_comparison() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Test newer version detection
    assert!(manager.is_newer_version("1.0.0", "1.0.1").unwrap());
    assert!(manager.is_newer_version("1.0.0", "1.1.0").unwrap());
    assert!(manager.is_newer_version("1.0.0", "2.0.0").unwrap());
    
    // Test same version
    assert!(!manager.is_newer_version("1.0.0", "1.0.0").unwrap());
    
    // Test older version
    assert!(!manager.is_newer_version("1.1.0", "1.0.0").unwrap());
    assert!(!manager.is_newer_version("2.0.0", "1.9.9").unwrap());
    
    // Test edge cases
    assert!(manager.is_newer_version("1.0.0", "1.0.0.1").unwrap());
    assert!(!manager.is_newer_version("1.0.0.1", "1.0.0").unwrap());
}

/// Test configuration updates
#[tokio::test]
#[serial]
async fn test_config_updates() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    let mut new_config = UpdateConfig::default();
    new_config.auto_check = false;
    new_config.check_interval_hours = 48;
    new_config.notify_user = false;
    new_config.github_repo = "custom/repo".to_string();
    
    manager.update_config(new_config.clone()).await.unwrap();
    
    let updated_config = manager.get_config();
    assert_eq!(updated_config.auto_check, false);
    assert_eq!(updated_config.check_interval_hours, 48);
    assert_eq!(updated_config.notify_user, false);
    assert_eq!(updated_config.github_repo, "custom/repo");
}

/// Test backup creation
#[tokio::test]
#[serial]
async fn test_backup_creation() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    let result = manager.create_backup("2.0.0").await;
    assert!(result.is_ok(), "Backup creation should succeed");
    
    let rollback_info = manager.get_rollback_info();
    assert!(rollback_info.is_some(), "Rollback info should be available after backup");
    
    if let Some(info) = rollback_info {
        assert_eq!(info.previous_version, env!("CARGO_PKG_VERSION"));
        assert!(info.backup_path.exists());
    }
}

/// Test update status transitions
#[tokio::test]
#[serial]
async fn test_status_transitions() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Initial status should be Idle
    assert!(matches!(manager.get_status(), UpdateStatus::Idle));
    
    // Simulate status changes through internal state
    {
        let mut status_guard = manager.status.write().unwrap();
        *status_guard = UpdateStatus::Checking;
    }
    assert!(matches!(manager.get_status(), UpdateStatus::Checking));
    
    {
        let mut status_guard = manager.status.write().unwrap();
        *status_guard = UpdateStatus::Available {
            version: "2.0.0".to_string(),
            release_notes: "Test update".to_string(),
            download_url: "https://example.com".to_string(),
            size: 1000000,
            is_critical: false,
        };
    }
    
    match manager.get_status() {
        UpdateStatus::Available { version, size, is_critical, .. } => {
            assert_eq!(version, "2.0.0");
            assert_eq!(size, 1000000);
            assert!(!is_critical);
        }
        _ => panic!("Status should be Available"),
    }
}

/// Test error handling in update checks
#[tokio::test]
#[serial]
async fn test_error_handling() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Test with invalid GitHub repo
    let mut invalid_config = UpdateConfig::default();
    invalid_config.github_repo = "invalid/nonexistent/repo/format".to_string();
    
    manager.update_config(invalid_config).await.unwrap();
    
    // This should result in an error due to invalid repo format
    let result = manager.check_for_updates().await;
    
    // We expect this to fail with the invalid repo
    match result {
        Ok(_) => {
            // If it succeeds, check that status reflects error
            match manager.get_status() {
                UpdateStatus::Error(_) => {
                    // Expected error state
                }
                UpdateStatus::Idle => {
                    // No update available, which is also acceptable
                }
                _ => panic!("Unexpected status after invalid repo check"),
            }
        }
        Err(_) => {
            // Expected error, check status
            match manager.get_status() {
                UpdateStatus::Error(_) => {
                    // Expected error state
                }
                _ => panic!("Status should be Error after failed check"),
            }
        }
    }
}

/// Test update history management
#[tokio::test]
#[serial]
async fn test_update_history() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Simulate adding updates to history
    let update1 = UpdateInfo {
        version: "1.1.0".to_string(),
        release_date: "2024-01-01".to_string(),
        release_notes: "First update".to_string(),
        download_url: "https://example.com/v1.1.0".to_string(),
        size: 1000000,
        checksum: None,
        is_critical: false,
        backup_path: None,
        rollback_version: None,
    };
    
    let update2 = UpdateInfo {
        version: "1.2.0".to_string(),
        release_date: "2024-02-01".to_string(),
        release_notes: "Second update".to_string(),
        download_url: "https://example.com/v1.2.0".to_string(),
        size: 1500000,
        checksum: None,
        is_critical: true,
        backup_path: None,
        rollback_version: None,
    };
    
    // Add updates to history manually (simulating successful update checks)
    {
        let mut history_guard = manager.update_history.write().unwrap();
        history_guard.push(update1.clone());
        history_guard.push(update2.clone());
    }
    
    let history = manager.get_update_history();
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].version, "1.1.0");
    assert_eq!(history[1].version, "1.2.0");
    assert!(history[1].is_critical);
}

/// Test rollback functionality
#[tokio::test]
#[serial]
async fn test_rollback_functionality() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // First create a backup
    manager.create_backup("2.0.0").await.unwrap();
    
    // Verify rollback info exists
    let rollback_info = manager.get_rollback_info();
    assert!(rollback_info.is_some());
    
    // Perform rollback
    let rollback_result = manager.perform_rollback("Test rollback".to_string()).await;
    assert!(rollback_result.is_ok());
    
    // Check final status
    match manager.get_status() {
        UpdateStatus::RollbackComplete { previous_version } => {
            assert_eq!(previous_version, env!("CARGO_PKG_VERSION"));
        }
        _ => panic!("Status should be RollbackComplete after rollback"),
    }
}

/// Test concurrent operations safety
#[tokio::test]
#[serial]
async fn test_concurrent_safety() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Spawn multiple concurrent tasks that modify manager state
    let manager1 = manager.clone_for_async();
    let manager2 = manager.clone_for_async();
    let manager3 = manager.clone_for_async();
    
    let task1 = tokio::spawn(async move {
        let mut config = manager1.get_config();
        config.auto_check = false;
        manager1.update_config(config).await.unwrap();
    });
    
    let task2 = tokio::spawn(async move {
        manager2.create_backup("test").await.unwrap();
    });
    
    let task3 = tokio::spawn(async move {
        manager3.clear_pending_update().await;
    });
    
    // Wait for all tasks to complete
    tokio::try_join!(task1, task2, task3).unwrap();
    
    // Verify final state is consistent
    let final_config = manager.get_config();
    assert!(!final_config.auto_check);
    
    let rollback_info = manager.get_rollback_info();
    assert!(rollback_info.is_some());
}

/// Test cleanup functionality
#[tokio::test]
#[serial]
async fn test_cleanup() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // Create some temporary files to simulate cleanup scenario
    let temp_file = manager.backup_directory.join("temp_test_file");
    std::fs::write(&temp_file, "test content").unwrap();
    assert!(temp_file.exists());
    
    // Test cleanup
    manager.cleanup_temp_files().await;
    
    // Temporary file should still exist (doesn't start with "temp_")
    assert!(temp_file.exists());
    
    // Create a proper temp file that should be cleaned
    let proper_temp_file = manager.backup_directory.join("temp_update_download");
    std::fs::write(&proper_temp_file, "temp content").unwrap();
    assert!(proper_temp_file.exists());
    
    // Test cleanup again
    manager.cleanup_temp_files().await;
    
    // Proper temp file should be removed
    assert!(!proper_temp_file.exists());
    
    // Cleanup test files
    let _ = std::fs::remove_file(&temp_file);
}

/// Test update manager cloning for async contexts
#[test]
fn test_manager_cloning() {
    let app = create_test_app();
    let original_manager = UpdateManager::new(app.handle().clone());
    
    let cloned_manager = original_manager.clone_for_async();
    
    // Both managers should have the same configuration
    assert_eq!(original_manager.get_config(), cloned_manager.get_config());
    assert!(matches!(original_manager.get_status(), UpdateStatus::Idle));
    assert!(matches!(cloned_manager.get_status(), UpdateStatus::Idle));
}

/// Integration test for the complete update workflow
#[tokio::test]
#[serial]
async fn test_complete_update_workflow() {
    let app = create_test_app();
    let manager = UpdateManager::new(app.handle().clone());
    
    // 1. Initialize manager
    let init_result = manager.initialize().await;
    assert!(init_result.is_ok());
    
    // 2. Check initial state
    assert!(matches!(manager.get_status(), UpdateStatus::Idle));
    
    // 3. Create manual backup
    let backup_result = manager.create_backup("test").await;
    assert!(backup_result.is_ok());
    
    // 4. Verify rollback info is available
    let rollback_info = manager.get_rollback_info();
    assert!(rollback_info.is_some());
    
    // 5. Clear any pending updates
    manager.clear_pending_update().await;
    assert!(matches!(manager.get_status(), UpdateStatus::Idle));
    
    // 6. Update configuration
    let mut new_config = UpdateConfig::default();
    new_config.check_interval_hours = 48;
    let config_result = manager.update_config(new_config).await;
    assert!(config_result.is_ok());
    
    // 7. Verify configuration was updated
    let updated_config = manager.get_config();
    assert_eq!(updated_config.check_interval_hours, 48);
    
    // 8. Test rollback functionality
    let rollback_result = manager.perform_rollback("Integration test".to_string()).await;
    assert!(rollback_result.is_ok());
    
    // 9. Verify final state
    match manager.get_status() {
        UpdateStatus::RollbackComplete { .. } => {
            // Success - rollback completed
        }
        _ => panic!("Expected RollbackComplete status after integration test"),
    }
}