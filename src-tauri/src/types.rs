// AutoDev-AI Neural Bridge Platform - Common Types
//! Common type definitions for the Neural Bridge Platform

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// System information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    /// Operating system platform
    pub platform: String,
    /// System architecture
    pub arch: String,
    /// Application version
    pub version: String,
    /// Tauri version
    pub tauri_version: String,
    /// Rust version used to build
    pub rust_version: Option<String>,
    /// Build timestamp
    pub build_date: Option<String>,
    /// System uptime in seconds
    pub uptime: Option<u64>,
    /// Available memory in bytes
    pub memory: Option<u64>,
}

/// Window state information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    /// Window label/identifier
    pub label: String,
    /// X position
    pub x: i32,
    /// Y position
    pub y: i32,
    /// Window width
    pub width: u32,
    /// Window height
    pub height: u32,
    /// Whether window is maximized
    pub maximized: bool,
    /// Whether window is minimized
    pub minimized: bool,
    /// Whether window is focused
    pub focused: bool,
    /// Whether window is visible
    pub visible: bool,
    /// Window scale factor
    pub scale_factor: f64,
    /// Last updated timestamp
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Application settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Application theme (light, dark, auto)
    pub theme: String,
    /// Language/locale setting
    pub language: String,
    /// Auto-start with system
    pub auto_start: bool,
    /// Minimize to tray on close
    pub minimize_to_tray: bool,
    /// Show notifications
    pub show_notifications: bool,
    /// Check for updates automatically
    pub auto_update: bool,
    /// Claude-Flow integration settings
    pub claude_flow: ClaudeFlowSettings,
    /// Developer settings
    pub developer: DeveloperSettings,
    /// Security settings
    pub security: SecuritySettings,
}

/// Claude-Flow integration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeFlowSettings {
    /// Enable Claude-Flow integration
    pub enabled: bool,
    /// API endpoint URL
    pub api_endpoint: String,
    /// Authentication token
    pub auth_token: Option<String>,
    /// Default swarm topology
    pub default_topology: String,
    /// Maximum agents per swarm
    pub max_agents: u32,
    /// Enable neural features
    pub neural_enabled: bool,
    /// Memory persistence enabled
    pub memory_persistence: bool,
}

/// Developer settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperSettings {
    /// Enable developer tools
    pub dev_tools: bool,
    /// Show debug information
    pub debug_mode: bool,
    /// Enable hot reload
    pub hot_reload: bool,
    /// Log level (trace, debug, info, warn, error)
    pub log_level: String,
    /// Enable performance monitoring
    pub performance_monitoring: bool,
}

/// Security settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    /// Enable IPC security validation
    pub ipc_security: bool,
    /// Session timeout in minutes
    pub session_timeout: u32,
    /// Maximum failed authentication attempts
    pub max_auth_attempts: u32,
    /// Enable audit logging
    pub audit_logging: bool,
    /// Rate limiting enabled
    pub rate_limiting: bool,
    /// Rate limit requests per minute
    pub rate_limit_rpm: u32,
}

/// Event structure for the event system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppEvent {
    /// Unique event identifier
    pub id: Uuid,
    /// Event type/name
    pub event_type: String,
    /// Event payload data
    pub payload: serde_json::Value,
    /// Event source component
    pub source: String,
    /// Event target (optional)
    pub target: Option<String>,
    /// Event timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Event priority level
    pub priority: EventPriority,
}

/// Event priority levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventPriority {
    /// Low priority event
    Low,
    /// Normal priority event
    Normal,
    /// High priority event
    High,
    /// Critical priority event
    Critical,
}

/// API response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T> {
    /// Response success status
    pub success: bool,
    /// Response data
    pub data: Option<T>,
    /// Error message if any
    pub error: Option<String>,
    /// Response metadata
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    /// Response timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl<T> ApiResponse<T> {
    /// Create a successful response
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            metadata: None,
            timestamp: chrono::Utc::now(),
        }
    }

    /// Create an error response
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
            metadata: None,
            timestamp: chrono::Utc::now(),
        }
    }

    /// Add metadata to response
    pub fn with_metadata(mut self, metadata: HashMap<String, serde_json::Value>) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

/// Update information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    /// Available update version
    pub version: String,
    /// Update release notes
    pub notes: String,
    /// Update download URL
    pub download_url: String,
    /// Update file size in bytes
    pub size: u64,
    /// Update signature for verification
    pub signature: String,
    /// Whether update is critical
    pub critical: bool,
    /// Release date
    pub release_date: chrono::DateTime<chrono::Utc>,
}

/// Database connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfig {
    /// Database type (sqlite, postgres, mysql)
    pub db_type: String,
    /// Connection URL or path
    pub connection: String,
    /// Maximum connections in pool
    pub max_connections: u32,
    /// Connection timeout in seconds
    pub timeout: u32,
    /// Enable SSL/TLS
    pub ssl_enabled: bool,
}

/// Docker container configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerConfig {
    /// Container image name
    pub image: String,
    /// Container name
    pub name: String,
    /// Port mappings
    pub ports: HashMap<String, String>,
    /// Environment variables
    pub env_vars: HashMap<String, String>,
    /// Volume mounts
    pub volumes: HashMap<String, String>,
    /// Container labels
    pub labels: HashMap<String, String>,
}

/// Docker container information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerContainer {
    /// Container ID
    pub id: String,
    /// Container name
    pub name: String,
    /// Container image
    pub image: String,
    /// Container status
    pub status: String,
    /// Port mappings
    pub ports: Vec<String>,
    /// Container creation timestamp
    pub created: chrono::DateTime<chrono::Utc>,
}

/// Log entry structure for logging system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    /// Log entry ID
    pub id: String,
    /// Log level (trace, debug, info, warn, error)
    pub level: String,
    /// Log message content
    pub message: String,
    /// Source module or component
    pub source: String,
    /// Log target (optional)
    pub target: Option<String>,
    /// Log fields/metadata
    pub fields: Option<HashMap<String, serde_json::Value>>,
    /// Additional metadata
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    /// Log timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Performance metrics structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    /// CPU usage percentage
    pub cpu_usage: f64,
    /// Memory usage in bytes
    pub memory_usage: u64,
    /// Network bytes received
    pub network_rx: u64,
    /// Network bytes transmitted
    pub network_tx: u64,
    /// Disk read bytes
    pub disk_read: u64,
    /// Disk write bytes
    pub disk_write: u64,
    /// Active connections count
    pub active_connections: u32,
    /// Metrics timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// Default implementations
impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "auto".to_string(),
            language: "en".to_string(),
            auto_start: false,
            minimize_to_tray: true,
            show_notifications: true,
            auto_update: true,
            claude_flow: ClaudeFlowSettings::default(),
            developer: DeveloperSettings::default(),
            security: SecuritySettings::default(),
        }
    }
}

impl Default for ClaudeFlowSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            api_endpoint: "http://localhost:3000".to_string(),
            auth_token: None,
            default_topology: "hierarchical".to_string(),
            max_agents: 8,
            neural_enabled: false,
            memory_persistence: true,
        }
    }
}

impl Default for DeveloperSettings {
    fn default() -> Self {
        Self {
            dev_tools: false,
            debug_mode: false,
            hot_reload: false,
            log_level: "info".to_string(),
            performance_monitoring: false,
        }
    }
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            ipc_security: true,
            session_timeout: 60,
            max_auth_attempts: 3,
            audit_logging: true,
            rate_limiting: true,
            rate_limit_rpm: 100,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_response_success() {
        let response = ApiResponse::success("test data");
        assert!(response.success);
        assert_eq!(response.data, Some("test data"));
        assert!(response.error.is_none());
    }

    #[test]
    fn test_api_response_error() {
        let response: ApiResponse<String> = ApiResponse::error("test error");
        assert!(!response.success);
        assert!(response.data.is_none());
        assert_eq!(response.error, Some("test error".to_string()));
    }

    #[test]
    fn test_default_settings() {
        let settings = AppSettings::default();
        assert_eq!(settings.theme, "auto");
        assert_eq!(settings.language, "en");
        assert!(settings.minimize_to_tray);
    }

    #[test]
    fn test_event_creation() {
        let event = AppEvent {
            id: Uuid::new_v4(),
            event_type: "test_event".to_string(),
            payload: serde_json::json!({"test": "data"}),
            source: "test_component".to_string(),
            target: None,
            timestamp: chrono::Utc::now(),
            priority: EventPriority::Normal,
        };

        assert_eq!(event.event_type, "test_event");
        assert_eq!(event.source, "test_component");
    }
}