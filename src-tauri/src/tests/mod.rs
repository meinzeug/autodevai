//! Test module declarations for the Tauri backend
//! 
//! This module organizes all test modules for easy compilation and execution

#[cfg(test)]
mod window_state_tests;

#[cfg(test)]
mod menu_tests;

#[cfg(test)]
mod security_tests;

#[cfg(test)]
mod tray_tests;

#[cfg(test)]
mod integration_tests;

#[cfg(test)]
mod updater_tests;

#[cfg(test)]
mod security_integration_test;

// Re-export test utilities for use in other test modules
#[cfg(test)]
pub mod test_utils {
    use std::collections::HashMap;
    use serde_json::Value;

    /// Create a mock JSON response for testing
    pub fn create_mock_response(success: bool, message: &str, data: Option<Value>) -> Value {
        serde_json::json!({
            "success": success,
            "message": message,
            "data": data
        })
    }

    /// Create mock system info for testing
    pub fn create_mock_system_info() -> Value {
        serde_json::json!({
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "version": "0.1.0",
            "tauri_version": "2.0",
            "build_date": "2024-01-01T00:00:00Z"
        })
    }

    /// Mock app handle for testing
    pub struct MockAppHandle {
        pub windows: Vec<String>,
    }

    impl MockAppHandle {
        pub fn new() -> Self {
            Self {
                windows: vec!["main".to_string()],
            }
        }

        pub fn with_windows(windows: Vec<String>) -> Self {
            Self { windows }
        }

        pub fn window_count(&self) -> usize {
            self.windows.len()
        }

        pub fn has_window(&self, label: &str) -> bool {
            self.windows.contains(&label.to_string())
        }
    }

    /// Mock window for testing
    #[derive(Debug, Clone)]
    pub struct MockWindow {
        pub label: String,
        pub width: u32,
        pub height: u32,
        pub x: i32,
        pub y: i32,
        pub maximized: bool,
        pub fullscreen: bool,
        pub visible: bool,
        pub focused: bool,
    }

    impl MockWindow {
        pub fn new(label: &str) -> Self {
            Self {
                label: label.to_string(),
                width: 1200,
                height: 800,
                x: 0,
                y: 0,
                maximized: false,
                fullscreen: false,
                visible: true,
                focused: false,
            }
        }

        pub fn with_size(mut self, width: u32, height: u32) -> Self {
            self.width = width;
            self.height = height;
            self
        }

        pub fn with_position(mut self, x: i32, y: i32) -> Self {
            self.x = x;
            self.y = y;
            self
        }

        pub fn maximized(mut self) -> Self {
            self.maximized = true;
            self
        }

        pub fn fullscreen(mut self) -> Self {
            self.fullscreen = true;
            self
        }

        pub fn hidden(mut self) -> Self {
            self.visible = false;
            self
        }
    }

    /// Test assertion helpers
    pub fn assert_json_contains_key(json: &Value, key: &str) {
        assert!(
            json.get(key).is_some(),
            "JSON does not contain expected key: {}",
            key
        );
    }

    pub fn assert_json_string_equals(json: &Value, key: &str, expected: &str) {
        let actual = json.get(key)
            .and_then(|v| v.as_str())
            .unwrap_or_else(|| panic!("Key '{}' not found or not a string", key));
        
        assert_eq!(actual, expected, "JSON string value mismatch for key '{}'", key);
    }

    pub fn assert_json_bool_equals(json: &Value, key: &str, expected: bool) {
        let actual = json.get(key)
            .and_then(|v| v.as_bool())
            .unwrap_or_else(|| panic!("Key '{}' not found or not a boolean", key));
        
        assert_eq!(actual, expected, "JSON boolean value mismatch for key '{}'", key);
    }

    /// Performance test helpers
    pub struct PerformanceTimer {
        start: std::time::Instant,
    }

    impl PerformanceTimer {
        pub fn start() -> Self {
            Self {
                start: std::time::Instant::now(),
            }
        }

        pub fn elapsed_ms(&self) -> u128 {
            self.start.elapsed().as_millis()
        }

        pub fn assert_faster_than(&self, max_ms: u128) {
            let elapsed = self.elapsed_ms();
            assert!(
                elapsed < max_ms,
                "Operation took {}ms, expected < {}ms",
                elapsed,
                max_ms
            );
        }
    }

    /// Test data generators
    pub fn generate_test_strings(count: usize) -> Vec<String> {
        (0..count)
            .map(|i| format!("test_string_{}", i))
            .collect()
    }

    pub fn generate_large_json(size_kb: usize) -> Value {
        let string_size = size_kb * 1024 / 20; // Rough estimate
        let large_string = "x".repeat(string_size);
        
        serde_json::json!({
            "large_data": large_string,
            "metadata": {
                "size_kb": size_kb,
                "generated_at": chrono::Utc::now().to_rfc3339()
            }
        })
    }

    /// Error simulation helpers
    pub fn simulate_network_error() -> Result<Value, String> {
        Err("Network connection failed".to_string())
    }

    pub fn simulate_permission_error() -> Result<Value, String> {
        Err("Permission denied".to_string())
    }

    pub fn simulate_timeout_error() -> Result<Value, String> {
        Err("Operation timed out".to_string())
    }
}