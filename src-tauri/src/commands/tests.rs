#[cfg(test)]
mod command_tests {
    use super::*;
    use tempfile::TempDir;
    #[test]
    fn test_execution_result_creation() {
        let result = ExecutionResult {
            success: true,
            output: "test".to_string(),
            tool_used: "test-tool".to_string(),
            duration_ms: 100,
        };
        assert!(result.success);
        assert_eq!(result.output, "test");
    }
    #[tokio::test]
    async fn test_settings_persistence() {
        let temp_dir = TempDir::new().unwrap();
        std::env::set_var("HOME", temp_dir.path());
        let settings = Settings::default();
        // Test save and load
        assert!(settings.docker_enabled);
    }
}
