// AutoDev-AI Neural Bridge Platform - Error Handling
//! Error types and handling for the Neural Bridge Platform

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Result type alias for Neural Bridge Platform operations
pub type Result<T> = std::result::Result<T, NeuralBridgeError>;

/// Main error type for the Neural Bridge Platform
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum NeuralBridgeError {
    /// Configuration related errors
    #[error("Configuration error: {message}")]
    Config { message: String },

    /// Database operation errors
    #[error("Database error: {message}")]
    Database { message: String },

    /// Authentication and security errors
    #[error("Security error: {message}")]
    Security { message: String },

    /// Window state management errors
    #[error("Window state error: {message}")]
    WindowState { message: String },

    /// Settings management errors
    #[error("Settings error: {message}")]
    Settings { message: String },

    /// Event system errors
    #[error("Event system error: {message}")]
    Events { message: String },

    /// API communication errors
    #[error("API error: {message}, status: {status:?}")]
    Api {
        message: String,
        status: Option<u16>,
    },

    /// File system operation errors
    #[error("File system error: {message}")]
    FileSystem { message: String },

    /// Network operation errors
    #[error("Network error: {message}")]
    Network { message: String },

    /// Validation errors
    #[error("Validation error: {message}")]
    Validation { message: String },

    /// Internal application errors
    #[error("Internal error: {message}")]
    Internal { message: String },

    /// Tauri specific errors
    #[error("Tauri error: {message}")]
    Tauri { message: String },

    /// Docker integration errors
    #[error("Docker error: {message}")]
    Docker { message: String },

    /// Claude-Flow orchestration errors
    #[error("Claude-Flow error: {message}")]
    ClaudeFlow { message: String },
}

impl NeuralBridgeError {
    /// Create a new configuration error
    pub fn config(message: impl Into<String>) -> Self {
        Self::Config {
            message: message.into(),
        }
    }

    /// Create a new database error
    pub fn database(message: impl Into<String>) -> Self {
        Self::Database {
            message: message.into(),
        }
    }

    /// Create a new security error
    pub fn security(message: impl Into<String>) -> Self {
        Self::Security {
            message: message.into(),
        }
    }

    /// Create a new window state error
    pub fn window_state(message: impl Into<String>) -> Self {
        Self::WindowState {
            message: message.into(),
        }
    }

    /// Create a new settings error
    pub fn settings(message: impl Into<String>) -> Self {
        Self::Settings {
            message: message.into(),
        }
    }

    /// Create a new events error
    pub fn events(message: impl Into<String>) -> Self {
        Self::Events {
            message: message.into(),
        }
    }

    /// Create a new API error
    pub fn api(message: impl Into<String>, status: Option<u16>) -> Self {
        Self::Api {
            message: message.into(),
            status,
        }
    }

    /// Create a new file system error
    pub fn file_system(message: impl Into<String>) -> Self {
        Self::FileSystem {
            message: message.into(),
        }
    }

    /// Create a new network error
    pub fn network(message: impl Into<String>) -> Self {
        Self::Network {
            message: message.into(),
        }
    }

    /// Create a new validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
        }
    }

    /// Create a new internal error
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }

    /// Create a new Tauri error
    pub fn tauri(message: impl Into<String>) -> Self {
        Self::Tauri {
            message: message.into(),
        }
    }

    /// Create a new Docker error
    pub fn docker(message: impl Into<String>) -> Self {
        Self::Docker {
            message: message.into(),
        }
    }

    /// Create a new Claude-Flow error
    pub fn claude_flow(message: impl Into<String>) -> Self {
        Self::ClaudeFlow {
            message: message.into(),
        }
    }

    /// Get the error message
    pub fn message(&self) -> &str {
        match self {
            Self::Config { message } => message,
            Self::Database { message } => message,
            Self::Security { message } => message,
            Self::WindowState { message } => message,
            Self::Settings { message } => message,
            Self::Events { message } => message,
            Self::Api { message, .. } => message,
            Self::FileSystem { message } => message,
            Self::Network { message } => message,
            Self::Validation { message } => message,
            Self::Internal { message } => message,
            Self::Tauri { message } => message,
            Self::Docker { message } => message,
            Self::ClaudeFlow { message } => message,
        }
    }

    /// Get the error category
    pub fn category(&self) -> &'static str {
        match self {
            Self::Config { .. } => "config",
            Self::Database { .. } => "database",
            Self::Security { .. } => "security",
            Self::WindowState { .. } => "window_state",
            Self::Settings { .. } => "settings",
            Self::Events { .. } => "events",
            Self::Api { .. } => "api",
            Self::FileSystem { .. } => "file_system",
            Self::Network { .. } => "network",
            Self::Validation { .. } => "validation",
            Self::Internal { .. } => "internal",
            Self::Tauri { .. } => "tauri",
            Self::Docker { .. } => "docker",
            Self::ClaudeFlow { .. } => "claude_flow",
        }
    }

    /// Check if error is recoverable
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::Network { .. } | Self::Api { .. } | Self::Docker { .. }
        )
    }
}

// Convert from standard library errors
impl From<std::io::Error> for NeuralBridgeError {
    fn from(err: std::io::Error) -> Self {
        Self::file_system(err.to_string())
    }
}

impl From<serde_json::Error> for NeuralBridgeError {
    fn from(err: serde_json::Error) -> Self {
        Self::validation(format!("JSON error: {}", err))
    }
}

impl From<reqwest::Error> for NeuralBridgeError {
    fn from(err: reqwest::Error) -> Self {
        let status = err.status().map(|s| s.as_u16());
        Self::api(err.to_string(), status)
    }
}

impl From<tauri::Error> for NeuralBridgeError {
    fn from(err: tauri::Error) -> Self {
        Self::tauri(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = NeuralBridgeError::config("test config error");
        assert_eq!(err.message(), "test config error");
        assert_eq!(err.category(), "config");
        assert!(!err.is_recoverable());
    }

    #[test]
    fn test_api_error() {
        let err = NeuralBridgeError::api("API call failed", Some(404));
        assert_eq!(err.message(), "API call failed");
        assert_eq!(err.category(), "api");
        assert!(err.is_recoverable());
    }

    #[test]
    fn test_error_serialization() {
        let err = NeuralBridgeError::security("unauthorized access");
        let serialized = serde_json::to_string(&err).unwrap();
        let deserialized: NeuralBridgeError = serde_json::from_str(&serialized).unwrap();
        assert_eq!(err.message(), deserialized.message());
    }
}
