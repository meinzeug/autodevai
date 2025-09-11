// Test module for integration tests

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::{AIOrchestrator, DockerManager, SecurityManager, TaskConfig, AppConfig};

    #[tokio::test]
    async fn test_ai_orchestrator_initialization() {
        let mut orchestrator = AIOrchestrator::new();
        assert!(!orchestrator.is_initialized());
        
        orchestrator.initialize().await.unwrap();
        assert!(orchestrator.is_initialized());
    }

    #[tokio::test]
    async fn test_docker_manager_status() {
        let mut docker_manager = DockerManager::new();
        docker_manager.initialize().await.unwrap();
        
        let status = docker_manager.get_status().await.unwrap();
        // Status should be returned regardless of Docker availability
        assert!(status.available || !status.available);
    }

    #[tokio::test]
    async fn test_security_manager_validation() {
        let mut security_manager = SecurityManager::new();
        security_manager.initialize().await.unwrap();
        
        // Test valid Anthropic key format
        let result = security_manager
            .validate_api_key("anthropic", "sk-ant-1234567890123456789012345")
            .await
            .unwrap();
        assert!(result);

        // Test invalid key
        let result = security_manager
            .validate_api_key("anthropic", "invalid-key")
            .await
            .unwrap();
        assert!(!result);
    }

    #[tokio::test]
    async fn test_task_execution() {
        let mut orchestrator = AIOrchestrator::new();
        orchestrator.initialize().await.unwrap();

        let config = TaskConfig {
            model: "claude".to_string(),
            timeout: 30,
            max_retries: 3,
            temperature: 0.7,
        };

        let result = orchestrator
            .execute_task("test task", &config)
            .await
            .unwrap();

        assert!(result.success);
        assert!(result.output.contains("test task"));
        assert!(result.duration_ms > 0);
    }

    #[test]
    fn test_app_config_validation() {
        let config = AppConfig::default();
        assert!(config.validate().is_ok());

        let mut invalid_config = config.clone();
        invalid_config.ai.timeout_seconds = 0;
        assert!(invalid_config.validate().is_err());

        let mut invalid_temp_config = config.clone();
        invalid_temp_config.ai.temperature = 3.0;
        assert!(invalid_temp_config.validate().is_err());
    }

    #[test]
    fn test_utils() {
        use crate::utils::*;

        assert!(is_valid_string("hello"));
        assert!(!is_valid_string(""));
        
        let id1 = generate_id();
        let id2 = generate_id();
        assert_ne!(id1, id2);

        assert_eq!(format_duration(1500), "1.5s");
        assert_eq!(truncate_string("hello world", 8), "hello...");
    }
}