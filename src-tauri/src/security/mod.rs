//! Security Module
//!
//! Contains security-related functionality including IPC security, input validation,
//! audit logging, and comprehensive security controls for Tauri applications.
//!
//! This module provides both basic security (for backward compatibility) and
//! enhanced security features for comprehensive protection.

pub mod audit_logger;
pub mod command_validator;
pub mod enhanced_ipc_security;
pub mod input_sanitizer;
pub mod ipc_security;
pub mod rate_limiter;
pub mod session_manager;

use std::sync::Arc;
use tokio::sync::RwLock;

/// Security Manager - Central security coordination
#[derive(Debug)]
pub struct SecurityManager {
    pub basic_security: ipc_security::IpcSecurity,
    pub enhanced_security: Arc<RwLock<enhanced_ipc_security::EnhancedIpcSecurity>>,
}

impl SecurityManager {
    /// Create a new security manager with all components initialized
    pub async fn new() -> Self {
        let basic_security = ipc_security::IpcSecurity::default();
        let enhanced_security = Arc::new(RwLock::new(
            enhanced_ipc_security::EnhancedIpcSecurity::new().await,
        ));

        Self {
            basic_security,
            enhanced_security,
        }
    }

    /// Get enhanced security for advanced operations
    pub async fn enhanced(
        &self,
    ) -> tokio::sync::RwLockReadGuard<'_, enhanced_ipc_security::EnhancedIpcSecurity> {
        self.enhanced_security.read().await
    }
}
