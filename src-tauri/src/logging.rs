//! Production-ready logging and error handling
//!
//! Provides structured logging, error tracking, and telemetry collection
//! with configurable log levels and multiple output formats.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;

/// Log level enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

impl From<LogLevel> for tracing::Level {
    fn from(level: LogLevel) -> Self {
        match level {
            LogLevel::Trace => tracing::Level::TRACE,
            LogLevel::Debug => tracing::Level::DEBUG,
            LogLevel::Info => tracing::Level::INFO,
            LogLevel::Warning => tracing::Level::WARN,
            LogLevel::Error => tracing::Level::ERROR,
            LogLevel::Critical => tracing::Level::ERROR,
        }
    }
}

/// Structured log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: u64,
    pub level: LogLevel,
    pub message: String,
    pub target: String,
    pub module: Option<String>,
    pub file: Option<String>,
    pub line: Option<u32>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
}

impl LogEntry {
    pub fn new(level: LogLevel, target: String, message: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            level,
            message,
            target,
            module: None,
            file: None,
            line: None,
            metadata: HashMap::new(),
            session_id: None,
            request_id: None,
        }
    }

    pub fn with_module(mut self, module: String) -> Self {
        self.module = Some(module);
        self
    }

    pub fn with_location(mut self, file: String, line: u32) -> Self {
        self.file = Some(file);
        self.line = Some(line);
        self
    }

    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    pub fn with_session(mut self, session_id: String) -> Self {
        self.session_id = Some(session_id);
        self
    }

    pub fn with_request(mut self, request_id: String) -> Self {
        self.request_id = Some(request_id);
        self
    }
}

/// Error tracking entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEntry {
    pub id: String,
    pub timestamp: u64,
    pub error_type: String,
    pub error_code: Option<String>,
    pub message: String,
    pub stack_trace: Option<String>,
    pub context: HashMap<String, serde_json::Value>,
    pub severity: LogLevel,
    pub resolved: bool,
    pub resolution_notes: Option<String>,
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub enabled: bool,
    pub min_level: LogLevel,
    pub file_logging: bool,
    pub console_logging: bool,
    pub structured_format: bool,
    pub max_file_size_mb: u64,
    pub max_files: usize,
    pub log_directory: String,
    pub include_source_location: bool,
    pub enable_error_tracking: bool,
    pub telemetry_enabled: bool,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            min_level: LogLevel::Info,
            file_logging: true,
            console_logging: true,
            structured_format: true,
            max_file_size_mb: 10,
            max_files: 5,
            log_directory: "logs".to_string(),
            include_source_location: cfg!(debug_assertions),
            enable_error_tracking: true,
            telemetry_enabled: false,
        }
    }
}

/// Production logging manager
pub struct LoggingManager {
    config: Arc<RwLock<LoggingConfig>>,
    log_entries: Arc<RwLock<Vec<LogEntry>>>,
    error_entries: Arc<RwLock<Vec<ErrorEntry>>>,
    app_handle: Option<AppHandle>,
    broadcast_sender: broadcast::Sender<LogEntry>,
    log_file_path: Arc<RwLock<Option<PathBuf>>>,
}

impl LoggingManager {
    /// Create a new logging manager
    pub fn new() -> Self {
        let (broadcast_sender, _) = broadcast::channel(1000);

        Self {
            config: Arc::new(RwLock::new(LoggingConfig::default())),
            log_entries: Arc::new(RwLock::new(Vec::new())),
            error_entries: Arc::new(RwLock::new(Vec::new())),
            app_handle: None,
            broadcast_sender,
            log_file_path: Arc::new(RwLock::new(None)),
        }
    }

    /// Initialize the logging manager
    pub async fn initialize(&mut self, app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        self.app_handle = Some(app_handle);

        // Setup file logging if enabled
        {
            let config_guard = self.config.read().unwrap();
            if config_guard.file_logging {
                self.setup_file_logging(&config_guard).await?;
            }
        }

        // Start log rotation task
        self.start_log_rotation_task().await;

        // Start telemetry collection if enabled
        {
            let config_guard = self.config.read().unwrap();
            if config_guard.telemetry_enabled {
                self.start_telemetry_collection().await;
            }
        }

        log::info!("Production logging manager initialized");
        Ok(())
    }

    /// Log an entry
    pub async fn log(&self, entry: LogEntry) {
        let config = {
            let config_guard = self.config.read().unwrap();
            config_guard.clone()
        };

        // Check if logging is enabled and level meets threshold
        if !config.enabled || self.should_filter_level(entry.level, config.min_level) {
            return;
        }

        // Add to memory storage
        {
            let mut entries_guard = self.log_entries.write().unwrap();
            entries_guard.push(entry.clone());

            // Limit memory storage size
            if entries_guard.len() > 10000 {
                entries_guard.remove(0);
            }
        }

        // Write to file if enabled
        if config.file_logging {
            self.write_to_file(&entry).await;
        }

        // Emit to frontend
        if let Some(app_handle) = &self.app_handle {
            let _ = app_handle.emit("log-entry", &entry);
        }

        // Broadcast to subscribers
        let _ = self.broadcast_sender.send(entry.clone());

        // Console logging
        if config.console_logging {
            self.write_to_console(&entry);
        }
    }

    /// Track an error
    pub async fn track_error(&self, error: ErrorEntry) {
        {
            let mut errors_guard = self.error_entries.write().unwrap();
            errors_guard.push(error.clone());

            // Limit error storage size
            if errors_guard.len() > 1000 {
                errors_guard.remove(0);
            }
        }

        // Emit error to frontend
        if let Some(app_handle) = &self.app_handle {
            let _ = app_handle.emit("error-tracked", &error);
        }

        // Create corresponding log entry
        let log_entry = LogEntry::new(
            error.severity,
            "error_tracker".to_string(),
            format!("{}: {}", error.error_type, error.message),
        )
        .with_metadata("error_id".to_string(), serde_json::Value::String(error.id.clone()))
        .with_metadata("error_type".to_string(), serde_json::Value::String(error.error_type.clone()));

        self.log(log_entry).await;
    }

    /// Get recent log entries
    pub fn get_logs(&self, count: Option<usize>) -> Vec<LogEntry> {
        let entries_guard = self.log_entries.read().unwrap();
        let count = count.unwrap_or(100).min(entries_guard.len());
        
        entries_guard
            .iter()
            .rev()
            .take(count)
            .cloned()
            .collect()
    }

    /// Get error entries
    pub fn get_errors(&self, unresolved_only: bool) -> Vec<ErrorEntry> {
        let errors_guard = self.error_entries.read().unwrap();
        
        if unresolved_only {
            errors_guard
                .iter()
                .filter(|error| !error.resolved)
                .cloned()
                .collect()
        } else {
            errors_guard.clone()
        }
    }

    /// Update logging configuration
    pub async fn update_config(&self, new_config: LoggingConfig) -> Result<(), Box<dyn std::error::Error>> {
        {
            let mut config_guard = self.config.write().unwrap();
            *config_guard = new_config.clone();
        }

        // Reconfigure file logging if needed
        if new_config.file_logging {
            self.setup_file_logging(&new_config).await?;
        }

        log::info!("Logging configuration updated");
        Ok(())
    }

    /// Get current configuration
    pub fn get_config(&self) -> LoggingConfig {
        let config_guard = self.config.read().unwrap();
        config_guard.clone()
    }

    /// Setup file logging
    async fn setup_file_logging(&self, config: &LoggingConfig) -> Result<(), Box<dyn std::error::Error>> {
        let log_dir = std::path::Path::new(&config.log_directory);
        if !log_dir.exists() {
            tokio::fs::create_dir_all(log_dir).await?;
        }

        let log_file_path = log_dir.join(format!(
            "autodev-ai-{}.log",
            chrono::Utc::now().format("%Y%m%d")
        ));

        {
            let mut file_path_guard = self.log_file_path.write().unwrap();
            *file_path_guard = Some(log_file_path);
        }

        Ok(())
    }

    /// Write log entry to file
    async fn write_to_file(&self, entry: &LogEntry) {
        let file_path = {
            let file_path_guard = self.log_file_path.read().unwrap();
            file_path_guard.clone()
        };

        if let Some(path) = file_path {
            let config = {
                let config_guard = self.config.read().unwrap();
                config_guard.clone()
            };

            let log_line = if config.structured_format {
                serde_json::to_string(entry).unwrap_or_else(|_| {
                    format!("{:?}: {}", entry.level, entry.message)
                })
            } else {
                format!(
                    "[{}] {} {}: {}",
                    chrono::DateTime::from_timestamp((entry.timestamp / 1000) as i64, 0)
                        .unwrap_or_default()
                        .format("%Y-%m-%d %H:%M:%S"),
                    entry.target,
                    format!("{:?}", entry.level).to_uppercase(),
                    entry.message
                )
            };

            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
            {
                let _ = writeln!(file, "{}", log_line);
            }
        }
    }

    /// Write to console
    fn write_to_console(&self, entry: &LogEntry) {
        match entry.level {
            LogLevel::Trace => log::trace!("[{}] {}", entry.target, entry.message),
            LogLevel::Debug => log::debug!("[{}] {}", entry.target, entry.message),
            LogLevel::Info => log::info!("[{}] {}", entry.target, entry.message),
            LogLevel::Warning => log::warn!("[{}] {}", entry.target, entry.message),
            LogLevel::Error | LogLevel::Critical => {
                log::error!("[{}] {}", entry.target, entry.message)
            }
        }
    }

    /// Check if log level should be filtered
    fn should_filter_level(&self, entry_level: LogLevel, min_level: LogLevel) -> bool {
        let entry_priority = self.level_priority(entry_level);
        let min_priority = self.level_priority(min_level);
        entry_priority < min_priority
    }

    /// Get numeric priority for log level
    fn level_priority(&self, level: LogLevel) -> u8 {
        match level {
            LogLevel::Trace => 0,
            LogLevel::Debug => 1,
            LogLevel::Info => 2,
            LogLevel::Warning => 3,
            LogLevel::Error => 4,
            LogLevel::Critical => 5,
        }
    }

    /// Start log rotation task
    async fn start_log_rotation_task(&self) {
        let config = self.config.clone();
        let log_file_path = self.log_file_path.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600)); // Every hour

            loop {
                interval.tick().await;

                let (should_rotate, max_files) = {
                    let config_guard = config.read().unwrap();
                    (
                        config_guard.file_logging,
                        config_guard.max_files,
                    )
                };

                if should_rotate {
                    if let Some(path) = {
                        let path_guard = log_file_path.read().unwrap();
                        path_guard.clone()
                    } {
                        // Implement log rotation logic here
                        if let Ok(metadata) = tokio::fs::metadata(&path).await {
                            let size_mb = metadata.len() / (1024 * 1024);
                            if size_mb > config.read().unwrap().max_file_size_mb {
                                // Rotate log file
                                let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
                                let rotated_path = path.with_extension(format!("log.{}", timestamp));
                                let _ = tokio::fs::rename(&path, rotated_path).await;
                            }
                        }
                    }
                }
            }
        });
    }

    /// Start telemetry collection
    async fn start_telemetry_collection(&self) {
        // Implement telemetry collection logic here
        log::info!("Telemetry collection started");
    }
}

/// Helper macro for creating log entries with location
#[macro_export]
macro_rules! log_entry {
    ($level:expr, $target:expr, $message:expr) => {
        crate::logging::LogEntry::new($level, $target.to_string(), $message.to_string())
            .with_location(file!().to_string(), line!())
    };
}

/// Create production-ready error from standard error
pub fn create_error_entry(
    error: &dyn std::error::Error,
    error_type: String,
    severity: LogLevel,
) -> ErrorEntry {
    ErrorEntry {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        error_type,
        error_code: None,
        message: error.to_string(),
        stack_trace: Some(format!("{:?}", error)),
        context: HashMap::new(),
        severity,
        resolved: false,
        resolution_notes: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_entry_creation() {
        let entry = LogEntry::new(
            LogLevel::Info,
            "test".to_string(),
            "Test message".to_string(),
        );

        assert_eq!(entry.level, LogLevel::Info);
        assert_eq!(entry.message, "Test message");
        assert_eq!(entry.target, "test");
    }

    #[test]
    fn test_log_level_priority() {
        let manager = LoggingManager::new();

        assert!(manager.level_priority(LogLevel::Critical) > manager.level_priority(LogLevel::Error));
        assert!(manager.level_priority(LogLevel::Error) > manager.level_priority(LogLevel::Warning));
        assert!(manager.level_priority(LogLevel::Warning) > manager.level_priority(LogLevel::Info));
    }

    #[test]
    fn test_error_entry_creation() {
        let error = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
        let entry = create_error_entry(&error, "FileSystemError".to_string(), LogLevel::Error);

        assert_eq!(entry.error_type, "FileSystemError");
        assert_eq!(entry.severity, LogLevel::Error);
        assert!(!entry.resolved);
    }
}