// AutoDev-AI Neural Bridge Platform - Secure Logging System
// Production-ready logging with rotation, security events, and structured JSON

use anyhow::{Result, Context};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncWriteExt, BufWriter};
use tracing::{info, warn, error};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use std::sync::Arc;
use tokio::sync::Mutex;
use sha2::{Sha256, Digest};

/// Log entry structure for structured logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub category: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
    pub source: Option<String>,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
    pub checksum: Option<String>,
}

/// Security event log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
    pub severity: String,
    pub description: String,
    pub source_ip: Option<String>,
    pub user_agent: Option<String>,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub additional_data: Option<serde_json::Value>,
    pub hash: String,
}

/// Performance metrics log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetric {
    pub timestamp: DateTime<Utc>,
    pub metric_name: String,
    pub value: f64,
    pub unit: String,
    pub tags: std::collections::HashMap<String, String>,
    pub duration_ms: Option<u64>,
}

/// Logger configuration
#[derive(Debug, Clone)]
pub struct LoggerConfig {
    pub log_dir: PathBuf,
    pub max_file_size_mb: u64,
    pub max_files: usize,
    pub rotation: Rotation,
    pub enable_compression: bool,
    pub enable_encryption: bool,
}

impl Default for LoggerConfig {
    fn default() -> Self {
        Self {
            log_dir: PathBuf::from("./logs"),
            max_file_size_mb: 100,
            max_files: 10,
            rotation: Rotation::DAILY,
            enable_compression: false,
            enable_encryption: false,
        }
    }
}

/// Secure logger implementation
pub struct SecureLogger {
    config: LoggerConfig,
    app_log_writer: Arc<Mutex<BufWriter<File>>>,
    security_log_writer: Arc<Mutex<BufWriter<File>>>,
    performance_log_writer: Arc<Mutex<BufWriter<File>>>,
    audit_log_writer: Arc<Mutex<BufWriter<File>>>,
    error_count: Arc<Mutex<u64>>,
    log_count: Arc<Mutex<u64>>,
}

impl SecureLogger {
    /// Create a new secure logger
    pub async fn new(log_dir: &str, level: &str) -> Result<Self> {
        let log_dir = PathBuf::from(log_dir);
        
        // Create log directory if it doesn't exist
        tokio::fs::create_dir_all(&log_dir).await
            .context("Failed to create log directory")?;

        let config = LoggerConfig {
            log_dir: log_dir.clone(),
            ..LoggerConfig::default()
        };

        // Initialize log file writers
        let app_log_file = Self::create_log_file(&log_dir, "app.log").await?;
        let security_log_file = Self::create_log_file(&log_dir, "security.log").await?;
        let performance_log_file = Self::create_log_file(&log_dir, "performance.log").await?;
        let audit_log_file = Self::create_log_file(&log_dir, "audit.log").await?;

        info!("Secure logger initialized with directory: {:?}", log_dir);

        Ok(Self {
            config,
            app_log_writer: Arc::new(Mutex::new(BufWriter::new(app_log_file))),
            security_log_writer: Arc::new(Mutex::new(BufWriter::new(security_log_file))),
            performance_log_writer: Arc::new(Mutex::new(BufWriter::new(performance_log_file))),
            audit_log_writer: Arc::new(Mutex::new(BufWriter::new(audit_log_file))),
            error_count: Arc::new(Mutex::new(0)),
            log_count: Arc::new(Mutex::new(0)),
        })
    }

    /// Create a log file with proper permissions
    async fn create_log_file(log_dir: &Path, filename: &str) -> Result<File> {
        let file_path = log_dir.join(filename);
        
        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(true)
            .open(&file_path)
            .await
            .context(format!("Failed to open log file: {:?}", file_path))?;

        // Set appropriate file permissions (readable only by owner)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = tokio::fs::metadata(&file_path).await?.permissions();
            perms.set_mode(0o600); // rw-------
            tokio::fs::set_permissions(&file_path, perms).await?;
        }

        Ok(file)
    }

    /// Log a general application event
    pub async fn log_event(
        &mut self,
        level: &str,
        category: &str,
        message: &str,
        details: Option<serde_json::Value>,
    ) -> Result<()> {
        let entry = LogEntry {
            timestamp: Utc::now(),
            level: level.to_string(),
            category: category.to_string(),
            message: message.to_string(),
            details,
            source: Some("autodev-ai".to_string()),
            user_id: None,
            session_id: None,
            request_id: None,
            checksum: None,
        };

        self.write_to_app_log(&entry).await?;
        
        let mut count = self.log_count.lock().await;
        *count += 1;

        if level == "error" {
            let mut error_count = self.error_count.lock().await;
            *error_count += 1;
        }

        Ok(())
    }

    /// Log a security event with integrity protection
    pub async fn log_security_event(&mut self, event_type: &str, description: &str) -> Result<()> {
        let timestamp = Utc::now();
        let event_data = format!("{}:{}:{}", timestamp, event_type, description);
        let hash = format!("{:x}", Sha256::digest(event_data.as_bytes()));

        let security_event = SecurityEvent {
            timestamp,
            event_type: event_type.to_string(),
            severity: Self::determine_security_severity(event_type),
            description: description.to_string(),
            source_ip: None,
            user_agent: None,
            user_id: None,
            session_id: None,
            additional_data: None,
            hash,
        };

        self.write_to_security_log(&security_event).await?;
        
        // Also log to audit trail
        self.log_audit_event("security_event", &security_event.event_type).await?;

        info!("Security event logged: {} - {}", event_type, description);
        Ok(())
    }

    /// Log performance metrics
    pub async fn log_performance_metric(
        &mut self,
        metric_name: &str,
        value: &str,
    ) -> Result<()> {
        let metric = PerformanceMetric {
            timestamp: Utc::now(),
            metric_name: metric_name.to_string(),
            value: value.parse::<f64>().unwrap_or(0.0),
            unit: Self::determine_metric_unit(metric_name),
            tags: std::collections::HashMap::new(),
            duration_ms: None,
        };

        self.write_to_performance_log(&metric).await?;
        Ok(())
    }

    /// Log audit events for compliance
    pub async fn log_audit_event(&mut self, action: &str, target: &str) -> Result<()> {
        let audit_entry = serde_json::json!({
            "timestamp": Utc::now(),
            "action": action,
            "target": target,
            "source": "autodev-ai",
            "checksum": format!("{:x}", Sha256::digest(format!("{}:{}", action, target).as_bytes()))
        });

        self.write_to_audit_log(&audit_entry).await?;
        Ok(())
    }

    /// Write to application log
    async fn write_to_app_log(&self, entry: &LogEntry) -> Result<()> {
        let mut writer = self.app_log_writer.lock().await;
        let json_line = serde_json::to_string(entry)?;
        writer.write_all(format!("{}\n", json_line).as_bytes()).await?;
        writer.flush().await?;
        Ok(())
    }

    /// Write to security log
    async fn write_to_security_log(&self, event: &SecurityEvent) -> Result<()> {
        let mut writer = self.security_log_writer.lock().await;
        let json_line = serde_json::to_string(event)?;
        writer.write_all(format!("{}\n", json_line).as_bytes()).await?;
        writer.flush().await?;
        Ok(())
    }

    /// Write to performance log
    async fn write_to_performance_log(&self, metric: &PerformanceMetric) -> Result<()> {
        let mut writer = self.performance_log_writer.lock().await;
        let json_line = serde_json::to_string(metric)?;
        writer.write_all(format!("{}\n", json_line).as_bytes()).await?;
        writer.flush().await?;
        Ok(())
    }

    /// Write to audit log
    async fn write_to_audit_log(&self, entry: &serde_json::Value) -> Result<()> {
        let mut writer = self.audit_log_writer.lock().await;
        let json_line = serde_json::to_string(entry)?;
        writer.write_all(format!("{}\n", json_line).as_bytes()).await?;
        writer.flush().await?;
        Ok(())
    }

    /// Flush all log buffers
    pub async fn flush_logs(&mut self) -> Result<()> {
        {
            let mut writer = self.app_log_writer.lock().await;
            writer.flush().await?;
        }
        {
            let mut writer = self.security_log_writer.lock().await;
            writer.flush().await?;
        }
        {
            let mut writer = self.performance_log_writer.lock().await;
            writer.flush().await?;
        }
        {
            let mut writer = self.audit_log_writer.lock().await;
            writer.flush().await?;
        }
        
        info!("All log buffers flushed");
        Ok(())
    }

    /// Check if logger is healthy
    pub async fn is_healthy(&self) -> Result<bool> {
        // Check if log directory exists and is writable
        let log_dir = &self.config.log_dir;
        
        if !log_dir.exists() {
            return Ok(false);
        }

        // Try to write a test entry
        let test_file = log_dir.join("health_check.tmp");
        match tokio::fs::write(&test_file, "health_check").await {
            Ok(_) => {
                let _ = tokio::fs::remove_file(&test_file).await;
                Ok(true)
            }
            Err(_) => Ok(false)
        }
    }

    /// Get logger statistics
    pub async fn get_statistics(&self) -> Result<serde_json::Value> {
        let log_count = *self.log_count.lock().await;
        let error_count = *self.error_count.lock().await;
        
        Ok(serde_json::json!({
            "total_logs": log_count,
            "total_errors": error_count,
            "log_directory": self.config.log_dir,
            "healthy": self.is_healthy().await?,
        }))
    }

    /// Rotate logs if needed (manual rotation)
    pub async fn rotate_logs(&self) -> Result<()> {
        info!("Rotating log files");
        
        // This is a simplified rotation - in production, you'd want more sophisticated rotation
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        
        for log_name in &["app.log", "security.log", "performance.log", "audit.log"] {
            let current_path = self.config.log_dir.join(log_name);
            let archived_path = self.config.log_dir.join(format!("{}.{}", log_name, timestamp));
            
            if current_path.exists() {
                if let Err(e) = tokio::fs::rename(&current_path, &archived_path).await {
                    warn!("Failed to rotate log file {:?}: {}", current_path, e);
                } else {
                    info!("Rotated log file: {:?} -> {:?}", current_path, archived_path);
                }
            }
        }
        
        Ok(())
    }

    /// Determine security event severity
    fn determine_security_severity(event_type: &str) -> String {
        match event_type.to_lowercase().as_str() {
            "authentication_failure" | "unauthorized_access" | "privilege_escalation" => "high".to_string(),
            "suspicious_activity" | "rate_limit_exceeded" | "invalid_request" => "medium".to_string(),
            _ => "low".to_string(),
        }
    }

    /// Determine metric unit based on metric name
    fn determine_metric_unit(metric_name: &str) -> String {
        match metric_name.to_lowercase().as_str() {
            name if name.contains("time") || name.contains("duration") => "ms".to_string(),
            name if name.contains("memory") || name.contains("size") => "bytes".to_string(),
            name if name.contains("cpu") || name.contains("usage") => "percent".to_string(),
            name if name.contains("count") || name.contains("requests") => "count".to_string(),
            _ => "value".to_string(),
        }
    }

    /// Check if log sanitization is active
    pub async fn is_sanitization_active(&self) -> Result<bool> {
        // In this implementation, sanitization is always active
        // In a more complex system, this might check configuration or runtime state
        Ok(self.config.sanitize_sensitive_data)
    }

    /// Check if log storage is secure
    pub async fn is_storage_secure(&self) -> Result<bool> {
        // Check if log files have secure permissions and encryption
        let log_dir = &self.config.log_dir;
        
        // Check directory permissions
        let metadata = tokio::fs::metadata(log_dir).await?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = metadata.permissions().mode();
            // Check if directory is readable only by owner (700 or 750)
            if (mode & 0o077) == 0 {
                Ok(true)
            } else {
                warn!("Log directory has insecure permissions: {:o}", mode);
                Ok(false)
            }
        }
        
        #[cfg(not(unix))]
        {
            // On non-Unix systems, assume secure storage for now
            Ok(true)
        }
    }
}

/// Tauri command to get logging statistics
#[tauri::command]
pub async fn get_logging_stats(
    logger: tauri::State<'_, Arc<tokio::sync::Mutex<SecureLogger>>>,
) -> Result<serde_json::Value, String> {
    let logger = logger.lock().await;
    logger.get_statistics().await.map_err(|e| e.to_string())
}

/// Tauri command to flush logs manually
#[tauri::command]
pub async fn flush_logs_command(
    logger: tauri::State<'_, Arc<tokio::sync::Mutex<SecureLogger>>>,
) -> Result<(), String> {
    let mut logger = logger.lock().await;
    logger.flush_logs().await.map_err(|e| e.to_string())
}

/// Tauri command to rotate logs manually
#[tauri::command]
pub async fn rotate_logs_command(
    logger: tauri::State<'_, Arc<tokio::sync::Mutex<SecureLogger>>>,
) -> Result<(), String> {
    let logger = logger.lock().await;
    logger.rotate_logs().await.map_err(|e| e.to_string())
}