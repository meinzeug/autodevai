// Utility functions and helpers

use anyhow::Result;
use std::time::{SystemTime, UNIX_EPOCH};

/// Get current timestamp in milliseconds
pub fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Format duration in human readable format
pub fn format_duration(duration_ms: u64) -> String {
    if duration_ms < 1000 {
        format!("{}ms", duration_ms)
    } else if duration_ms < 60000 {
        format!("{:.1}s", duration_ms as f64 / 1000.0)
    } else {
        let minutes = duration_ms / 60000;
        let seconds = (duration_ms % 60000) / 1000;
        format!("{}m {}s", minutes, seconds)
    }
}

/// Sanitize string for logging
pub fn sanitize_for_log(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_control() { '_' } else { c })
        .collect()
}

/// Generate a random ID
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Validate that a string is not empty and doesn't contain only whitespace
pub fn is_valid_string(s: &str) -> bool {
    !s.trim().is_empty()
}

/// Truncate string to max length with ellipsis
pub fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len.saturating_sub(3)])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(500), "500ms");
        assert_eq!(format_duration(1500), "1.5s");
        assert_eq!(format_duration(65000), "1m 5s");
    }

    #[test]
    fn test_is_valid_string() {
        assert!(is_valid_string("hello"));
        assert!(!is_valid_string(""));
        assert!(!is_valid_string("   "));
        assert!(is_valid_string("  hello  "));
    }

    #[test]
    fn test_truncate_string() {
        assert_eq!(truncate_string("hello", 10), "hello");
        assert_eq!(truncate_string("hello world", 8), "hello...");
        assert_eq!(truncate_string("hi", 5), "hi");
    }

    #[test]
    fn test_generate_id() {
        let id1 = generate_id();
        let id2 = generate_id();
        assert_ne!(id1, id2);
        assert!(id1.len() > 0);
    }
}