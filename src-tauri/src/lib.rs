// AutoDev-AI Neural Bridge Platform - Core Library
//! # Neural Bridge Platform Library
//!
//! This library provides the core functionality for the AutoDev-AI Neural Bridge Platform,
//! including security, state management, event handling, and API interfaces.
//!
//! ## Modules
//!
//! - [`app`] - Application setup and configuration management
//! - [`commands`] - Tauri command handlers for frontend-backend communication
//! - [`security`] - Security and authentication modules
//! - [`settings`] - Application settings and configuration
//! - [`events`] - Event system for cross-component communication
//! - [`window_state`] - Window state persistence and restoration
//! - [`tray`] - System tray integration
//! - [`menu`] - Application menu management
//! - [`errors`] - Error types and handling
//! - [`types`] - Common type definitions
//! - [`api`] - API layer for external integrations
//! - [`database`] - Database integration and models

#![deny(missing_docs)]
#![deny(unsafe_code)]
#![warn(clippy::all)]

// Public module exports
pub mod app;
pub mod commands;
pub mod errors;
pub mod events;
pub mod menu;
pub mod security;
pub mod settings;
pub mod tray;
pub mod types;
pub mod window_state;

// Internal modules
mod api;
mod database;
mod dev_window;
mod logging;
mod orchestration;
mod performance;

// Re-export commonly used types
pub use errors::{NeuralBridgeError, Result};
pub use types::*;

/// Version information for the Neural Bridge Platform
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Build timestamp
pub const BUILD_TIMESTAMP: &str = env!("BUILD_TIMESTAMP");

/// Initialize the Neural Bridge Platform library
///
/// This function sets up logging, initializes core components,
/// and prepares the platform for use.
pub fn init() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(true)
        .with_thread_ids(true)
        .init();

    tracing::info!("Neural Bridge Platform v{} initialized", VERSION);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_info() {
        assert!(!VERSION.is_empty());
        assert!(!BUILD_TIMESTAMP.is_empty());
    }

    #[test]
    fn test_initialization() {
        // Test library initialization
        let result = init();
        assert!(result.is_ok());
    }
}
