// AutoDev-AI Neural Bridge Platform - Logging System
//! Advanced logging system with search and analysis capabilities

use crate::errors::{NeuralBridgeError, Result};
use crate::types::LogEntry;
use option_ext::OptionExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::fs;
use tracing::{error, info, warn};
use uuid;

/// Log configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogConfig {
    pub level: String,
    pub file_enabled: bool,
    pub console_enabled: bool,
    pub max_file_size: u64,
    pub max_files: u32,
    pub log_directory: String,
    pub structured_logging: bool,
    pub include_location: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            file_enabled: true,
            console_enabled: true,
            max_file_size: 10 * 1024 * 1024, // 10MB
            max_files: 5,
            log_directory: "./logs".to_string(),
            structured_logging: true,
            include_location: true,
        }
    }
}

/// Log level enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "trace" => Some(Self::Trace),
            "debug" => Some(Self::Debug),
            "info" => Some(Self::Info),
            "warn" => Some(Self::Warn),
            "error" => Some(Self::Error),
            _ => None,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            Self::Trace => "trace",
            Self::Debug => "debug",
            Self::Info => "info",
            Self::Warn => "warn",
            Self::Error => "error",
        }
    }
}

/// Initialize the logging system
pub fn initialize_logging(config: LogConfig) -> Result<()> {
    info!("Initializing logging system");

    // Create log directory if it doesn't exist
    if config.file_enabled {
        std::fs::create_dir_all(&config.log_directory).map_err(|e| {
            NeuralBridgeError::file_system(format!("Failed to create log directory: {}", e))
        })?;
    }

    // Initialize tracing subscriber
    let level = match config.level.as_str() {
        "trace" => tracing::Level::TRACE,
        "debug" => tracing::Level::DEBUG,
        "info" => tracing::Level::INFO,
        "warn" => tracing::Level::WARN,
        "error" => tracing::Level::ERROR,
        _ => tracing::Level::INFO,
    };

    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(config.include_location)
        .with_thread_ids(true)
        .with_file(config.include_location)
        .with_line_number(config.include_location)
        .init();

    info!("Logging system initialized successfully");
    Ok(())
}

/// Search logs based on query and filters
pub async fn search_logs(
    query: &str,
    start_date: Option<String>,
    end_date: Option<String>,
    level: Option<String>,
) -> Result<Vec<LogEntry>> {
    info!("Searching logs: query='{}', level={:?}", query, level);

    // Parse date filters
    let start_dt = if let Some(start) = start_date {
        Some(parse_datetime(&start)?)
    } else {
        None
    };

    let end_dt = if let Some(end) = end_date {
        Some(parse_datetime(&end)?)
    } else {
        None
    };

    // Parse level filter
    let level_filter = if let Some(l) = level {
        LogLevel::from_str(&l)
    } else {
        None
    };

    // Read log files and search
    let log_entries = read_log_files().await?;

    let filtered_entries: Vec<LogEntry> = log_entries
        .into_iter()
        .filter(|entry| {
            // Apply query filter
            let matches_query = if query.is_empty() {
                true
            } else {
                entry.message.to_lowercase().contains(&query.to_lowercase())
                    || entry.target.to_lowercase().contains(&query.to_lowercase())
            };

            // Apply date filters
            let matches_date = match (start_dt, end_dt) {
                (Some(start), Some(end)) => entry.timestamp >= start && entry.timestamp <= end,
                (Some(start), None) => entry.timestamp >= start,
                (None, Some(end)) => entry.timestamp <= end,
                (None, None) => true,
            };

            // Apply level filter
            let matches_level = if let Some(ref filter_level) = level_filter {
                entry.level.to_lowercase() == filter_level.to_str()
            } else {
                true
            };

            matches_query && matches_date && matches_level
        })
        .collect();

    info!("Found {} matching log entries", filtered_entries.len());
    Ok(filtered_entries)
}

/// Analyze log patterns and generate insights
pub async fn analyze_log_patterns() -> Result<LogAnalysis> {
    info!("Analyzing log patterns");

    let log_entries = read_log_files().await?;

    let mut analysis = LogAnalysis::new();

    for entry in log_entries {
        analysis.total_entries += 1;

        // Count by level
        *analysis
            .level_counts
            .entry(entry.level.clone())
            .or_insert(0) += 1;

        // Count by target/module
        *analysis
            .target_counts
            .entry(entry.target.clone())
            .or_insert(0) += 1;

        // Detect error patterns
        if entry.level.to_lowercase() == "error" {
            analysis.error_patterns.push(ErrorPattern {
                message: entry.message.clone(),
                count: 1,
                first_seen: entry.timestamp,
                last_seen: entry.timestamp,
            });
        }

        // Track hourly distribution
        let hour = entry.timestamp.format("%Y-%m-%d %H:00:00").to_string();
        *analysis.hourly_distribution.entry(hour).or_insert(0) += 1;
    }

    // Consolidate error patterns
    analysis.consolidate_error_patterns();

    info!(
        "Log analysis completed: {} total entries",
        analysis.total_entries
    );
    Ok(analysis)
}

/// Get log statistics
pub async fn get_log_statistics() -> Result<LogStatistics> {
    info!("Generating log statistics");

    let log_entries = read_log_files().await?;

    let mut stats = LogStatistics {
        total_entries: log_entries.len() as u64,
        ..Default::default()
    };

    for entry in log_entries {
        match entry.level.to_lowercase().as_str() {
            "trace" => stats.trace_count += 1,
            "debug" => stats.debug_count += 1,
            "info" => stats.info_count += 1,
            "warn" => stats.warn_count += 1,
            "error" => stats.error_count += 1,
            _ => stats.other_count += 1,
        }
    }

    // Calculate error rate
    if stats.total_entries > 0 {
        stats.error_rate = (stats.error_count as f64 / stats.total_entries as f64) * 100.0;
    }

    Ok(stats)
}

/// Export logs to different formats
pub async fn export_logs(
    format: &str,
    output_path: &str,
    filters: Option<LogFilters>,
) -> Result<String> {
    info!("Exporting logs to {} format: {}", format, output_path);

    let mut log_entries = read_log_files().await?;

    // Apply filters if provided
    if let Some(filters) = filters {
        log_entries = apply_filters(log_entries, filters);
    }

    match format.to_lowercase().as_str() {
        "json" => export_as_json(&log_entries, output_path).await,
        "csv" => export_as_csv(&log_entries, output_path).await,
        "txt" => export_as_text(&log_entries, output_path).await,
        _ => Err(NeuralBridgeError::validation("Unsupported export format")),
    }
}

// Supporting structures and functions

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogAnalysis {
    pub total_entries: u64,
    pub level_counts: HashMap<String, u64>,
    pub target_counts: HashMap<String, u64>,
    pub error_patterns: Vec<ErrorPattern>,
    pub hourly_distribution: HashMap<String, u64>,
}

impl LogAnalysis {
    fn new() -> Self {
        Self {
            total_entries: 0,
            level_counts: HashMap::new(),
            target_counts: HashMap::new(),
            error_patterns: Vec::new(),
            hourly_distribution: HashMap::new(),
        }
    }

    fn consolidate_error_patterns(&mut self) {
        // Group similar error messages
        let mut consolidated: Vec<ErrorPattern> = Vec::new();

        for pattern in &self.error_patterns {
            if let Some(existing) = consolidated
                .iter_mut()
                .find(|p| similar_error_messages(&p.message, &pattern.message))
            {
                existing.count += pattern.count;
                if pattern.first_seen < existing.first_seen {
                    existing.first_seen = pattern.first_seen;
                }
                if pattern.last_seen > existing.last_seen {
                    existing.last_seen = pattern.last_seen;
                }
            } else {
                consolidated.push(pattern.clone());
            }
        }

        self.error_patterns = consolidated;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPattern {
    pub message: String,
    pub count: u64,
    pub first_seen: chrono::DateTime<chrono::Utc>,
    pub last_seen: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LogStatistics {
    pub total_entries: u64,
    pub trace_count: u64,
    pub debug_count: u64,
    pub info_count: u64,
    pub warn_count: u64,
    pub error_count: u64,
    pub other_count: u64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFilters {
    pub level: Option<String>,
    pub target: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub message_contains: Option<String>,
}

async fn read_log_files() -> Result<Vec<LogEntry>> {
    // In a real implementation, this would:
    // 1. Read all log files from the configured directory
    // 2. Parse structured log entries
    // 3. Return a vector of LogEntry objects

    // Placeholder implementation
    Ok(vec![
        LogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now(),
            level: "info".to_string(),
            message: "Application started".to_string(),
            source: "neural_bridge_platform".to_string(),
            target: Some("neural_bridge_platform".to_string()),
            fields: Some(HashMap::new()),
            metadata: Some(HashMap::new()),
        },
        LogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now(),
            level: "warn".to_string(),
            message: "High memory usage detected".to_string(),
            source: "monitor".to_string(),
            target: Some("monitor".to_string()),
            fields: Some(HashMap::new()),
            metadata: Some(HashMap::new()),
        },
    ])
}

fn parse_datetime(date_str: &str) -> Result<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::parse_from_rfc3339(date_str)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .map_err(|e| NeuralBridgeError::validation(format!("Invalid date format: {}", e)))
}

fn similar_error_messages(msg1: &str, msg2: &str) -> bool {
    // Simple similarity check - in practice you might use more sophisticated algorithms
    let words1: std::collections::HashSet<&str> = msg1.split_whitespace().collect();
    let words2: std::collections::HashSet<&str> = msg2.split_whitespace().collect();

    let intersection_size = words1.intersection(&words2).count();
    let union_size = words1.union(&words2).count();

    if union_size == 0 {
        return false;
    }

    let similarity = intersection_size as f64 / union_size as f64;
    similarity > 0.7 // 70% similarity threshold
}

fn apply_filters(mut entries: Vec<LogEntry>, filters: LogFilters) -> Vec<LogEntry> {
    if let Some(level) = filters.level {
        entries.retain(|e| e.level.to_lowercase() == level.to_lowercase());
    }

    if let Some(target) = filters.target {
        entries.retain(|e| e.target.contains(&target));
    }

    if let Some(message) = filters.message_contains {
        entries.retain(|e| e.message.to_lowercase().contains(&message.to_lowercase()));
    }

    // Apply date filters here if needed

    entries
}

async fn export_as_json(entries: &[LogEntry], output_path: &str) -> Result<String> {
    let json = serde_json::to_string_pretty(entries)
        .map_err(|e| NeuralBridgeError::validation(format!("JSON serialization failed: {}", e)))?;

    fs::write(output_path, json)
        .await
        .map_err(|e| NeuralBridgeError::file_system(format!("Failed to write file: {}", e)))?;

    Ok(output_path.to_string())
}

async fn export_as_csv(entries: &[LogEntry], output_path: &str) -> Result<String> {
    let mut csv_content = String::new();
    csv_content.push_str("timestamp,level,message,target\n");

    for entry in entries {
        csv_content.push_str(&format!(
            "{},{},{},{}\n",
            entry.timestamp.to_rfc3339(),
            entry.level,
            entry.message.replace(',', ";"),
            entry.target
        ));
    }

    fs::write(output_path, csv_content)
        .await
        .map_err(|e| NeuralBridgeError::file_system(format!("Failed to write file: {}", e)))?;

    Ok(output_path.to_string())
}

async fn export_as_text(entries: &[LogEntry], output_path: &str) -> Result<String> {
    let mut text_content = String::new();

    for entry in entries {
        text_content.push_str(&format!(
            "[{}] {} {}: {}\n",
            entry.timestamp.format("%Y-%m-%d %H:%M:%S UTC"),
            entry.level.to_uppercase(),
            entry.target,
            entry.message
        ));
    }

    fs::write(output_path, text_content)
        .await
        .map_err(|e| NeuralBridgeError::file_system(format!("Failed to write file: {}", e)))?;

    Ok(output_path.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_config_default() {
        let config = LogConfig::default();
        assert_eq!(config.level, "info");
        assert!(config.file_enabled);
        assert!(config.console_enabled);
    }

    #[test]
    fn test_log_level_parsing() {
        assert!(matches!(LogLevel::from_str("info"), Some(LogLevel::Info)));
        assert!(matches!(LogLevel::from_str("ERROR"), Some(LogLevel::Error)));
        assert!(LogLevel::from_str("invalid").is_none());
    }

    #[test]
    fn test_similar_error_messages() {
        assert!(similar_error_messages(
            "Connection failed to database",
            "Database connection failed"
        ));
        assert!(!similar_error_messages(
            "Connection failed",
            "File not found"
        ));
    }

    #[tokio::test]
    async fn test_log_statistics() {
        // This would test with actual log data in a real implementation
        let stats = LogStatistics::default();
        assert_eq!(stats.total_entries, 0);
        assert_eq!(stats.error_rate, 0.0);
    }
}
