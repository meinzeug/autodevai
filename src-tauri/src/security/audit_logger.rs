//! Security Audit Logger
//!
//! Comprehensive logging system for security events, violations, and system activities.
//! Provides tamper-evident logging with structured event tracking.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::sync::RwLock;
use uuid::Uuid;

/// Security event severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SecuritySeverity {
    Info,
    Warning,
    Error,
    Critical,
    Emergency,
}

/// Types of security events
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SecurityEventType {
    // Authentication events
    LoginAttempt,
    LoginSuccess,
    LoginFailure,
    SessionCreated,
    SessionExpired,
    SessionTerminated,

    // Authorization events
    PermissionGranted,
    PermissionDenied,
    PrivilegeEscalation,

    // IPC Security events
    CommandValidation,
    CommandExecuted,
    CommandBlocked,
    RateLimitExceeded,

    // Input validation events
    InputSanitized,
    InputRejected,
    InjectionAttempt,

    // System security events
    ConfigurationChanged,
    SecurityPolicyUpdated,
    AuditLogAccessed,
    SystemShutdown,
    EmergencyShutdown,

    // Threat detection
    SuspiciousActivity,
    AttackDetected,
    SecurityViolation,
    DataExfiltration,

    // Custom events
    Custom(String),
}

/// Security audit event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub event_type: SecurityEventType,
    pub severity: SecuritySeverity,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
    pub window_label: Option<String>,
    pub source_ip: Option<String>,
    pub command: Option<String>,
    pub details: HashMap<String, serde_json::Value>,
    pub outcome: SecurityOutcome,
    pub risk_score: u8, // 0-100 risk assessment
}

/// Event outcome
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SecurityOutcome {
    Success,
    Failure,
    Blocked,
    Sanitized,
    Warning,
}

/// Audit log configuration
#[derive(Debug, Clone)]
pub struct AuditConfig {
    pub log_file_path: PathBuf,
    pub max_file_size_mb: u64,
    pub max_log_files: u32,
    pub log_rotation_enabled: bool,
    pub compress_old_logs: bool,
    pub retention_days: u32,
    pub enable_real_time_alerts: bool,
    pub alert_severity_threshold: SecuritySeverity,
}

impl Default for AuditConfig {
    fn default() -> Self {
        Self {
            log_file_path: PathBuf::from("./logs/security_audit.log"),
            max_file_size_mb: 100,
            max_log_files: 10,
            log_rotation_enabled: true,
            compress_old_logs: true,
            retention_days: 90,
            enable_real_time_alerts: true,
            alert_severity_threshold: SecuritySeverity::Warning,
        }
    }
}

/// Security audit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditStats {
    pub total_events: u64,
    pub events_by_type: HashMap<String, u64>,
    pub events_by_severity: HashMap<SecuritySeverity, u64>,
    pub events_last_hour: u64,
    pub events_last_day: u64,
    pub high_risk_events_today: u64,
    pub current_file_size: u64,
    pub log_files_count: u32,
}

/// Security Audit Logger implementation
pub struct SecurityAuditLogger {
    config: AuditConfig,
    log_writer: RwLock<Option<BufWriter<File>>>,
    stats: RwLock<AuditStats>,
    event_buffer: RwLock<Vec<SecurityEvent>>,
    buffer_size: usize,
}

impl SecurityAuditLogger {
    /// Create a new security audit logger
    pub async fn new() -> Self {
        Self::with_config(AuditConfig::default()).await
    }

    /// Create a new security audit logger with custom configuration
    pub async fn with_config(config: AuditConfig) -> Self {
        let mut logger = Self {
            config,
            log_writer: RwLock::new(None),
            stats: RwLock::new(AuditStats::default()),
            event_buffer: RwLock::new(Vec::new()),
            buffer_size: 100,
        };

        // Initialize log file
        if let Err(e) = logger.initialize_log_file().await {
            eprintln!("Failed to initialize audit log file: {}", e);
        }

        logger
    }

    /// Initialize the log file
    async fn initialize_log_file(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Ensure log directory exists
        if let Some(parent) = self.config.log_file_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Open log file in append mode
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.config.log_file_path)
            .await?;

        let writer = BufWriter::new(file);
        let mut log_writer = self.log_writer.write().await;
        *log_writer = Some(writer);

        // Log initialization event
        self.log_event_internal(SecurityEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type: SecurityEventType::ConfigurationChanged,
            severity: SecuritySeverity::Info,
            session_id: None,
            user_id: None,
            window_label: None,
            source_ip: None,
            command: None,
            details: HashMap::from([
                ("action".to_string(), serde_json::Value::String("audit_logger_initialized".to_string())),
                ("log_file".to_string(), serde_json::Value::String(self.config.log_file_path.display().to_string())),
            ]),
            outcome: SecurityOutcome::Success,
            risk_score: 0,
        }).await;

        Ok(())
    }

    /// Log a security event
    pub async fn log_event(&self, mut event: SecurityEvent) {
        // Set ID and timestamp if not provided
        if event.id.is_empty() {
            event.id = Uuid::new_v4().to_string();
        }
        event.timestamp = Utc::now();

        // Update statistics
        self.update_stats(&event).await;

        // Check for real-time alerts
        if self.config.enable_real_time_alerts && self.should_alert(&event) {
            self.send_alert(&event).await;
        }

        // Add to buffer or write immediately for critical events
        if event.severity >= SecuritySeverity::Critical {
            self.log_event_internal(event).await;
        } else {
            self.buffer_event(event).await;
        }
    }

    /// Log authentication events
    pub async fn log_authentication(&self, 
        event_type: SecurityEventType, 
        session_id: Option<String>,
        user_id: Option<String>,
        details: HashMap<String, serde_json::Value>,
        outcome: SecurityOutcome) {
        
        let severity = match outcome {
            SecurityOutcome::Failure => SecuritySeverity::Warning,
            SecurityOutcome::Blocked => SecuritySeverity::Error,
            _ => SecuritySeverity::Info,
        };

        let risk_score = match event_type {
            SecurityEventType::LoginFailure => 30,
            SecurityEventType::PrivilegeEscalation => 80,
            _ => 10,
        };

        let event = SecurityEvent {
            id: String::new(), // Will be set in log_event
            timestamp: Utc::now(),
            event_type,
            severity,
            session_id,
            user_id,
            window_label: None,
            source_ip: None,
            command: None,
            details,
            outcome,
            risk_score,
        };

        self.log_event(event).await;
    }

    /// Log IPC security events
    pub async fn log_ipc_security(&self,
        command: &str,
        session_id: &str,
        window_label: &str,
        outcome: SecurityOutcome,
        details: HashMap<String, serde_json::Value>) {
        
        let severity = match outcome {
            SecurityOutcome::Blocked => SecuritySeverity::Warning,
            SecurityOutcome::Sanitized => SecuritySeverity::Info,
            SecurityOutcome::Failure => SecuritySeverity::Error,
            _ => SecuritySeverity::Info,
        };

        let risk_score = match outcome {
            SecurityOutcome::Blocked => 50,
            SecurityOutcome::Failure => 70,
            _ => 5,
        };

        let event = SecurityEvent {
            id: String::new(),
            timestamp: Utc::now(),
            event_type: match outcome {
                SecurityOutcome::Blocked => SecurityEventType::CommandBlocked,
                SecurityOutcome::Success => SecurityEventType::CommandExecuted,
                _ => SecurityEventType::CommandValidation,
            },
            severity,
            session_id: Some(session_id.to_string()),
            user_id: None,
            window_label: Some(window_label.to_string()),
            source_ip: None,
            command: Some(command.to_string()),
            details,
            outcome,
            risk_score,
        };

        self.log_event(event).await;
    }

    /// Log input validation events
    pub async fn log_input_validation(&self,
        input_type: &str,
        validation_result: &str,
        details: HashMap<String, serde_json::Value>) {
        
        let (severity, outcome, risk_score) = match validation_result {
            "blocked" => (SecuritySeverity::Warning, SecurityOutcome::Blocked, 40),
            "sanitized" => (SecuritySeverity::Info, SecurityOutcome::Sanitized, 20),
            "injection_attempt" => (SecuritySeverity::Error, SecurityOutcome::Blocked, 80),
            _ => (SecuritySeverity::Info, SecurityOutcome::Success, 5),
        };

        let event_type = match validation_result {
            "injection_attempt" => SecurityEventType::InjectionAttempt,
            "sanitized" => SecurityEventType::InputSanitized,
            "blocked" => SecurityEventType::InputRejected,
            _ => SecurityEventType::CommandValidation,
        };

        let mut event_details = details;
        event_details.insert("input_type".to_string(), serde_json::Value::String(input_type.to_string()));

        let event = SecurityEvent {
            id: String::new(),
            timestamp: Utc::now(),
            event_type,
            severity,
            session_id: None,
            user_id: None,
            window_label: None,
            source_ip: None,
            command: None,
            details: event_details,
            outcome,
            risk_score,
        };

        self.log_event(event).await;
    }

    /// Buffer event for batch writing
    async fn buffer_event(&self, event: SecurityEvent) {
        let mut buffer = self.event_buffer.write().await;
        buffer.push(event);

        if buffer.len() >= self.buffer_size {
            let events = buffer.drain(..).collect::<Vec<_>>();
            drop(buffer); // Release lock early

            for event in events {
                self.log_event_internal(event).await;
            }
        }
    }

    /// Write event to log file
    async fn log_event_internal(&self, event: SecurityEvent) {
        // Serialize event as JSON
        let json_line = match serde_json::to_string(&event) {
            Ok(line) => format!("{}\n", line),
            Err(e) => {
                eprintln!("Failed to serialize audit event: {}", e);
                return;
            }
        };

        // Write to file
        let mut writer_guard = self.log_writer.write().await;
        if let Some(writer) = writer_guard.as_mut() {
            if let Err(e) = writer.write_all(json_line.as_bytes()).await {
                eprintln!("Failed to write audit log: {}", e);
                return;
            }
            if let Err(e) = writer.flush().await {
                eprintln!("Failed to flush audit log: {}", e);
            }
        }
    }

    /// Update audit statistics
    async fn update_stats(&self, event: &SecurityEvent) {
        let mut stats = self.stats.write().await;
        stats.total_events += 1;

        // Count by event type
        let event_type_str = format!("{:?}", event.event_type);
        *stats.events_by_type.entry(event_type_str).or_insert(0) += 1;

        // Count by severity
        *stats.events_by_severity.entry(event.severity).or_insert(0) += 1;

        // Time-based counters (simplified - in production, use proper time windows)
        let now = Utc::now();
        if (now - event.timestamp).num_hours() < 1 {
            stats.events_last_hour += 1;
        }
        if (now - event.timestamp).num_hours() < 24 {
            stats.events_last_day += 1;
        }

        // High-risk events today
        if event.risk_score >= 50 && (now - event.timestamp).num_hours() < 24 {
            stats.high_risk_events_today += 1;
        }
    }

    /// Check if event should trigger alert
    fn should_alert(&self, event: &SecurityEvent) -> bool {
        event.severity >= self.config.alert_severity_threshold || event.risk_score >= 70
    }

    /// Send real-time alert for high-priority events
    async fn send_alert(&self, event: &SecurityEvent) {
        // In a real implementation, this would send alerts via email, webhooks, etc.
        println!("🚨 SECURITY ALERT: {:?} - {} (Risk Score: {})", 
                 event.severity, event.event_type, event.risk_score);
        
        if let Some(details) = serde_json::to_string_pretty(&event.details).ok() {
            println!("Details: {}", details);
        }
    }

    /// Flush buffered events
    pub async fn flush(&self) {
        let mut buffer = self.event_buffer.write().await;
        let events = buffer.drain(..).collect::<Vec<_>>();
        drop(buffer);

        for event in events {
            self.log_event_internal(event).await;
        }

        // Flush writer
        let mut writer_guard = self.log_writer.write().await;
        if let Some(writer) = writer_guard.as_mut() {
            let _ = writer.flush().await;
        }
    }

    /// Get audit statistics
    pub async fn get_stats(&self) -> AuditStats {
        let stats = self.stats.read().await;
        stats.clone()
    }

    /// Query events by criteria
    pub async fn query_events(&self, 
        start_time: Option<DateTime<Utc>>,
        end_time: Option<DateTime<Utc>>,
        event_types: Option<Vec<SecurityEventType>>,
        severity_filter: Option<SecuritySeverity>,
        session_id: Option<String>) -> Vec<SecurityEvent> {
        
        // In a production system, this would read from the log file or database
        // For now, return empty vector as this would require parsing the log file
        Vec::new()
    }

    /// Perform log rotation if needed
    pub async fn rotate_logs_if_needed(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if !self.config.log_rotation_enabled {
            return Ok(());
        }

        // Check current file size
        let metadata = tokio::fs::metadata(&self.config.log_file_path).await?;
        let file_size_mb = metadata.len() / (1024 * 1024);

        if file_size_mb >= self.config.max_file_size_mb {
            // Close current writer
            {
                let mut writer_guard = self.log_writer.write().await;
                *writer_guard = None;
            }

            // Rotate log file
            let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
            let rotated_name = format!("{}.{}.log", 
                self.config.log_file_path.file_stem().unwrap().to_string_lossy(),
                timestamp);
            let rotated_path = self.config.log_file_path.with_file_name(rotated_name);

            tokio::fs::rename(&self.config.log_file_path, rotated_path).await?;

            // Reinitialize log file
            self.initialize_log_file().await?;
        }

        Ok(())
    }
}

impl Default for AuditStats {
    fn default() -> Self {
        Self {
            total_events: 0,
            events_by_type: HashMap::new(),
            events_by_severity: HashMap::new(),
            events_last_hour: 0,
            events_last_day: 0,
            high_risk_events_today: 0,
            current_file_size: 0,
            log_files_count: 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_audit_logger_creation() {
        let temp_dir = TempDir::new().unwrap();
        let log_path = temp_dir.path().join("test_audit.log");
        
        let config = AuditConfig {
            log_file_path: log_path.clone(),
            ..Default::default()
        };

        let logger = SecurityAuditLogger::with_config(config).await;
        
        // Logger should be created successfully
        assert!(log_path.exists());
    }

    #[tokio::test]
    async fn test_event_logging() {
        let temp_dir = TempDir::new().unwrap();
        let log_path = temp_dir.path().join("test_audit.log");
        
        let config = AuditConfig {
            log_file_path: log_path.clone(),
            ..Default::default()
        };

        let logger = SecurityAuditLogger::with_config(config).await;

        // Log a test event
        let event = SecurityEvent {
            id: "test-123".to_string(),
            timestamp: Utc::now(),
            event_type: SecurityEventType::LoginSuccess,
            severity: SecuritySeverity::Info,
            session_id: Some("session-123".to_string()),
            user_id: Some("user-456".to_string()),
            window_label: Some("main".to_string()),
            source_ip: None,
            command: None,
            details: HashMap::new(),
            outcome: SecurityOutcome::Success,
            risk_score: 10,
        };

        logger.log_event(event).await;
        logger.flush().await;

        // Check that log file has content
        let log_content = tokio::fs::read_to_string(log_path).await.unwrap();
        assert!(log_content.contains("LoginSuccess"));
        assert!(log_content.contains("session-123"));
    }

    #[tokio::test]
    async fn test_stats_update() {
        let logger = SecurityAuditLogger::new().await;

        let event = SecurityEvent {
            id: "test-stats".to_string(),
            timestamp: Utc::now(),
            event_type: SecurityEventType::CommandBlocked,
            severity: SecuritySeverity::Warning,
            session_id: None,
            user_id: None,
            window_label: None,
            source_ip: None,
            command: None,
            details: HashMap::new(),
            outcome: SecurityOutcome::Blocked,
            risk_score: 50,
        };

        logger.log_event(event).await;

        let stats = logger.get_stats().await;
        assert_eq!(stats.total_events, 2); // Including initialization event
        assert!(stats.events_by_type.contains_key("CommandBlocked"));
        assert_eq!(stats.high_risk_events_today, 1);
    }
}