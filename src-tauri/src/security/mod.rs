//! Security Module
//!
//! Contains security-related functionality including IPC security, input validation,
//! audit logging, and comprehensive security controls for Tauri applications

pub mod ipc_security;
pub mod input_sanitizer;
pub mod audit_logger;
pub mod rate_limiter;
pub mod session_manager;
pub mod command_validator;

use std::sync::Arc;
use tokio::sync::RwLock;

/// Security Manager - Central security coordination
#[derive(Debug, Clone)]
pub struct SecurityManager {
    pub ipc_security: Arc<ipc_security::IpcSecurity>,
    pub audit_logger: Arc<RwLock<audit_logger::SecurityAuditLogger>>,
    pub rate_limiter: Arc<RwLock<rate_limiter::EnhancedRateLimiter>>,
    pub session_manager: Arc<RwLock<session_manager::SecureSessionManager>>,
}

impl SecurityManager {
    /// Create a new security manager with all components initialized
    pub async fn new() -> Self {
        let ipc_security = Arc::new(ipc_security::IpcSecurity::default());
        let audit_logger = Arc::new(RwLock::new(audit_logger::SecurityAuditLogger::new().await));
        let rate_limiter = Arc::new(RwLock::new(rate_limiter::EnhancedRateLimiter::new()));
        let session_manager = Arc::new(RwLock::new(session_manager::SecureSessionManager::new()));

        Self {
            ipc_security,
            audit_logger,
            rate_limiter,
            session_manager,
        }
    }
}
