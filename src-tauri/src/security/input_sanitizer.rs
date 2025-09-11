//! Input Sanitization Module
//!
//! Provides comprehensive input validation and sanitization for IPC commands
//! to prevent XSS, injection attacks, and other security vulnerabilities.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use url::Url;

/// Input validation result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ValidationResult {
    Valid,
    Invalid { reason: String, code: u16 },
    Sanitized { original: String, sanitized: String },
}

/// Input sanitization configuration
#[derive(Debug, Clone)]
pub struct SanitizationConfig {
    pub max_string_length: usize,
    pub max_array_length: usize,
    pub max_object_depth: usize,
    pub allowed_html_tags: HashSet<String>,
    pub allowed_url_schemes: HashSet<String>,
    pub blocked_patterns: Vec<Regex>,
}

impl Default for SanitizationConfig {
    fn default() -> Self {
        let mut allowed_html_tags = HashSet::new();
        allowed_html_tags.insert("b".to_string());
        allowed_html_tags.insert("i".to_string());
        allowed_html_tags.insert("u".to_string());
        allowed_html_tags.insert("em".to_string());
        allowed_html_tags.insert("strong".to_string());

        let mut allowed_url_schemes = HashSet::new();
        allowed_url_schemes.insert("http".to_string());
        allowed_url_schemes.insert("https".to_string());

        let blocked_patterns = vec![
            Regex::new(r"<script[\s\S]*?</script>").unwrap(), // Script tags
            Regex::new(r"javascript:").unwrap(),              // JavaScript URLs
            Regex::new(r"data:text/html").unwrap(),           // Data URLs with HTML
            Regex::new(r"eval\s*\(").unwrap(),                // eval() calls
            Regex::new(r"setTimeout\s*\(").unwrap(),          // setTimeout calls
            Regex::new(r"setInterval\s*\(").unwrap(),         // setInterval calls
            Regex::new(r"Function\s*\(").unwrap(),            // Function constructor
            Regex::new(r"\.\.[\\/]").unwrap(),                // Path traversal
            Regex::new(r"(rm\s+-rf|sudo\s+rm)").unwrap(),     // Dangerous commands
        ];

        Self {
            max_string_length: 10000,
            max_array_length: 1000,
            max_object_depth: 10,
            allowed_html_tags,
            allowed_url_schemes,
            blocked_patterns,
        }
    }
}

/// Input sanitizer with comprehensive validation rules
#[derive(Debug)]
pub struct InputSanitizer {
    config: SanitizationConfig,
    html_entity_map: HashMap<char, String>,
}

impl Default for InputSanitizer {
    fn default() -> Self {
        Self::new(SanitizationConfig::default())
    }
}

impl InputSanitizer {
    /// Create a new input sanitizer with custom configuration
    pub fn new(config: SanitizationConfig) -> Self {
        let mut html_entity_map = HashMap::new();
        html_entity_map.insert('<', "&lt;".to_string());
        html_entity_map.insert('>', "&gt;".to_string());
        html_entity_map.insert('&', "&amp;".to_string());
        html_entity_map.insert('"', "&quot;".to_string());
        html_entity_map.insert('\'', "&#39;".to_string());
        html_entity_map.insert('/', "&#x2F;".to_string());
        html_entity_map.insert('\\', "&#x5C;".to_string());

        Self {
            config,
            html_entity_map,
        }
    }

    /// Validate and sanitize a string input
    pub fn sanitize_string(&self, input: &str) -> ValidationResult {
        // Check length limits
        if input.len() > self.config.max_string_length {
            return ValidationResult::Invalid {
                reason: format!(
                    "String length {} exceeds maximum {}",
                    input.len(),
                    self.config.max_string_length
                ),
                code: 1001,
            };
        }

        // Check for blocked patterns
        for pattern in &self.config.blocked_patterns {
            if pattern.is_match(input) {
                return ValidationResult::Invalid {
                    reason: format!("Input contains blocked pattern: {}", pattern.as_str()),
                    code: 1002,
                };
            }
        }

        // Check for binary data or non-printable characters
        if !input
            .chars()
            .all(|c| c.is_ascii() && (c.is_ascii_graphic() || c.is_ascii_whitespace()))
        {
            return ValidationResult::Invalid {
                reason: "Input contains non-printable or non-ASCII characters".to_string(),
                code: 1003,
            };
        }

        // HTML entity encoding for special characters
        let sanitized = self.html_encode(input);
        if sanitized != input {
            ValidationResult::Sanitized {
                original: input.to_string(),
                sanitized,
            }
        } else {
            ValidationResult::Valid
        }
    }

    /// Validate a URL input
    pub fn validate_url(&self, url_str: &str) -> ValidationResult {
        match Url::parse(url_str) {
            Ok(url) => {
                // Check allowed schemes
                if !self.config.allowed_url_schemes.contains(url.scheme()) {
                    ValidationResult::Invalid {
                        reason: format!("URL scheme '{}' is not allowed", url.scheme()),
                        code: 1004,
                    }
                } else {
                    ValidationResult::Valid
                }
            }
            Err(e) => ValidationResult::Invalid {
                reason: format!("Invalid URL format: {}", e),
                code: 1005,
            },
        }
    }

    /// Validate file path input
    pub fn validate_file_path(&self, path: &str) -> ValidationResult {
        // Check for path traversal attempts
        if path.contains("..") || path.contains("~") {
            return ValidationResult::Invalid {
                reason: "Path contains traversal patterns".to_string(),
                code: 1006,
            };
        }

        // Check for absolute paths outside of allowed directories
        if path.starts_with("/") && !path.starts_with("/tmp/") && !path.starts_with("/var/") {
            return ValidationResult::Invalid {
                reason: "Absolute path outside allowed directories".to_string(),
                code: 1007,
            };
        }

        // Check for dangerous file extensions
        let dangerous_extensions = [
            ".exe", ".bat", ".cmd", ".ps1", ".sh", ".scr", ".com", ".pif", ".vbs", ".js",
        ];
        for ext in &dangerous_extensions {
            if path.to_lowercase().ends_with(ext) {
                return ValidationResult::Invalid {
                    reason: format!("File extension '{}' is not allowed", ext),
                    code: 1008,
                };
            }
        }

        ValidationResult::Valid
    }

    /// Validate command name
    pub fn validate_command_name(&self, command: &str) -> ValidationResult {
        // Command names should be alphanumeric with underscores only
        if !command.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return ValidationResult::Invalid {
                reason: "Command name contains invalid characters".to_string(),
                code: 1009,
            };
        }

        // Check length
        if command.len() > 100 {
            return ValidationResult::Invalid {
                reason: "Command name too long".to_string(),
                code: 1010,
            };
        }

        ValidationResult::Valid
    }

    /// Validate JSON input structure
    pub fn validate_json_structure(
        &self,
        value: &serde_json::Value,
        depth: usize,
    ) -> ValidationResult {
        if depth > self.config.max_object_depth {
            return ValidationResult::Invalid {
                reason: format!(
                    "JSON depth {} exceeds maximum {}",
                    depth, self.config.max_object_depth
                ),
                code: 1011,
            };
        }

        match value {
            serde_json::Value::Object(obj) => {
                if obj.len() > 100 {
                    // Reasonable limit for object properties
                    return ValidationResult::Invalid {
                        reason: "JSON object has too many properties".to_string(),
                        code: 1012,
                    };
                }
                for (key, val) in obj {
                    // Validate keys
                    if let ValidationResult::Invalid { reason, code } = self.sanitize_string(key) {
                        return ValidationResult::Invalid { reason, code };
                    }
                    // Recursively validate values
                    if let ValidationResult::Invalid { reason, code } =
                        self.validate_json_structure(val, depth + 1)
                    {
                        return ValidationResult::Invalid { reason, code };
                    }
                }
            }
            serde_json::Value::Array(arr) => {
                if arr.len() > self.config.max_array_length {
                    return ValidationResult::Invalid {
                        reason: format!(
                            "Array length {} exceeds maximum {}",
                            arr.len(),
                            self.config.max_array_length
                        ),
                        code: 1013,
                    };
                }
                for item in arr {
                    if let ValidationResult::Invalid { reason, code } =
                        self.validate_json_structure(item, depth + 1)
                    {
                        return ValidationResult::Invalid { reason, code };
                    }
                }
            }
            serde_json::Value::String(s) => {
                if let ValidationResult::Invalid { reason, code } = self.sanitize_string(s) {
                    return ValidationResult::Invalid { reason, code };
                }
            }
            _ => {} // Numbers, booleans, null are safe
        }

        ValidationResult::Valid
    }

    /// HTML encode special characters
    fn html_encode(&self, input: &str) -> String {
        let mut result = String::with_capacity(input.len() * 2);
        for ch in input.chars() {
            if let Some(encoded) = self.html_entity_map.get(&ch) {
                result.push_str(encoded);
            } else {
                result.push(ch);
            }
        }
        result
    }

    /// Sanitize SQL input (prevent SQL injection)
    pub fn sanitize_sql_input(&self, input: &str) -> ValidationResult {
        let sql_keywords = [
            "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "EXEC", "EXECUTE",
            "UNION", "SCRIPT", "--", "/*", "*/", "xp_", "sp_",
        ];

        let input_upper = input.to_uppercase();
        for keyword in &sql_keywords {
            if input_upper.contains(keyword) {
                return ValidationResult::Invalid {
                    reason: format!("Input contains SQL keyword: {}", keyword),
                    code: 1014,
                };
            }
        }

        // Check for SQL injection patterns
        let sql_patterns = [
            r"'[\s]*;",                       // Quote followed by semicolon
            r"'[\s]*\|\|",                    // Quote followed by OR operator
            r"'[\s]*OR[\s]",                  // Quote followed by OR
            r"'[\s]*AND[\s]",                 // Quote followed by AND
            r"\bOR\b[\s]*\d+[\s]*=[\s]*\d+",  // OR 1=1 pattern
            r"\bAND\b[\s]*\d+[\s]*=[\s]*\d+", // AND 1=1 pattern
        ];

        for pattern_str in &sql_patterns {
            if let Ok(pattern) = Regex::new(pattern_str) {
                if pattern.is_match(&input_upper) {
                    return ValidationResult::Invalid {
                        reason: format!("Input matches SQL injection pattern: {}", pattern_str),
                        code: 1015,
                    };
                }
            }
        }

        ValidationResult::Valid
    }

    /// Validate email format
    pub fn validate_email(&self, email: &str) -> ValidationResult {
        let email_regex = match Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") {
            Ok(regex) => regex,
            Err(_) => {
                return ValidationResult::Invalid {
                    reason: "Internal regex error".to_string(),
                    code: 1016,
                }
            }
        };

        if email_regex.is_match(email) {
            ValidationResult::Valid
        } else {
            ValidationResult::Invalid {
                reason: "Invalid email format".to_string(),
                code: 1017,
            }
        }
    }

    /// Validate numeric input within range
    pub fn validate_number(
        &self,
        num: f64,
        min: Option<f64>,
        max: Option<f64>,
    ) -> ValidationResult {
        if let Some(min_val) = min {
            if num < min_val {
                return ValidationResult::Invalid {
                    reason: format!("Number {} is below minimum {}", num, min_val),
                    code: 1018,
                };
            }
        }

        if let Some(max_val) = max {
            if num > max_val {
                return ValidationResult::Invalid {
                    reason: format!("Number {} exceeds maximum {}", num, max_val),
                    code: 1019,
                };
            }
        }

        if !num.is_finite() {
            return ValidationResult::Invalid {
                reason: "Number is not finite".to_string(),
                code: 1020,
            };
        }

        ValidationResult::Valid
    }

    /// Comprehensive input validation for IPC commands
    pub fn validate_ipc_input(&self, command: &str, args: &serde_json::Value) -> ValidationResult {
        // Validate command name
        if let ValidationResult::Invalid { reason, code } = self.validate_command_name(command) {
            return ValidationResult::Invalid { reason, code };
        }

        // Validate arguments structure
        if let ValidationResult::Invalid { reason, code } = self.validate_json_structure(args, 0) {
            return ValidationResult::Invalid { reason, code };
        }

        ValidationResult::Valid
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_sanitization() {
        let sanitizer = InputSanitizer::default();

        // Test normal string
        assert_eq!(
            sanitizer.sanitize_string("normal text"),
            ValidationResult::Valid
        );

        // Test HTML characters
        match sanitizer.sanitize_string("<script>alert('xss')</script>") {
            ValidationResult::Invalid { code: 1002, .. } => {} // Should be blocked by pattern
            _ => panic!("Should block script tags"),
        }

        // Test length limit
        let long_string = "a".repeat(20000);
        match sanitizer.sanitize_string(&long_string) {
            ValidationResult::Invalid { code: 1001, .. } => {}
            _ => panic!("Should reject overly long strings"),
        }
    }

    #[test]
    fn test_url_validation() {
        let sanitizer = InputSanitizer::default();

        // Valid URLs
        assert_eq!(
            sanitizer.validate_url("https://example.com"),
            ValidationResult::Valid
        );
        assert_eq!(
            sanitizer.validate_url("http://localhost:8080"),
            ValidationResult::Valid
        );

        // Invalid scheme
        match sanitizer.validate_url("javascript:alert('xss')") {
            ValidationResult::Invalid { code: 1004, .. } => {}
            _ => panic!("Should reject javascript: URLs"),
        }

        // Invalid format
        match sanitizer.validate_url("not-a-url") {
            ValidationResult::Invalid { code: 1005, .. } => {}
            _ => panic!("Should reject malformed URLs"),
        }
    }

    #[test]
    fn test_file_path_validation() {
        let sanitizer = InputSanitizer::default();

        // Valid paths
        assert_eq!(
            sanitizer.validate_file_path("./file.txt"),
            ValidationResult::Valid
        );
        assert_eq!(
            sanitizer.validate_file_path("folder/file.txt"),
            ValidationResult::Valid
        );

        // Path traversal
        match sanitizer.validate_file_path("../../../etc/passwd") {
            ValidationResult::Invalid { code: 1006, .. } => {}
            _ => panic!("Should reject path traversal"),
        }

        // Dangerous extensions
        match sanitizer.validate_file_path("malware.exe") {
            ValidationResult::Invalid { code: 1008, .. } => {}
            _ => panic!("Should reject executable files"),
        }
    }

    #[test]
    fn test_sql_injection_prevention() {
        let sanitizer = InputSanitizer::default();

        // Safe input
        assert_eq!(
            sanitizer.sanitize_sql_input("username123"),
            ValidationResult::Valid
        );

        // SQL injection attempts
        match sanitizer.sanitize_sql_input("'; DROP TABLE users; --") {
            ValidationResult::Invalid { code: 1014, .. } => {}
            _ => panic!("Should detect SQL injection"),
        }

        match sanitizer.sanitize_sql_input("' OR 1=1 --") {
            ValidationResult::Invalid { .. } => {}
            _ => panic!("Should detect OR injection"),
        }
    }

    #[test]
    fn test_json_validation() {
        let sanitizer = InputSanitizer::default();

        // Valid JSON
        let valid_json = serde_json::json!({
            "name": "test",
            "value": 123,
            "nested": {"key": "value"}
        });
        assert_eq!(
            sanitizer.validate_json_structure(&valid_json, 0),
            ValidationResult::Valid
        );

        // Too deep nesting (create 15 levels)
        let mut deep_json = serde_json::json!("value");
        for _ in 0..15 {
            deep_json = serde_json::json!({"nested": deep_json});
        }
        match sanitizer.validate_json_structure(&deep_json, 0) {
            ValidationResult::Invalid { code: 1011, .. } => {}
            _ => panic!("Should reject deeply nested JSON"),
        }
    }
}
