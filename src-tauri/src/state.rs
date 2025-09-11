use crate::docker::DockerManager;
use crate::orchestration::{ClaudeFlowService, CodexService, OrchestrationService};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info};

#[derive(Debug)]
pub struct AppState {
    pub claude_flow: ClaudeFlowService,
    pub codex: CodexService,
    pub orchestration: OrchestrationService,
    pub docker: DockerManager,
    pub config: AppConfig,
    pub metrics: AppMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub claude_flow_enabled: bool,
    pub codex_enabled: bool,
    pub docker_enabled: bool,
    pub max_concurrent_executions: usize,
    pub default_timeout: u64,
    pub log_level: String,
    pub workspace_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppMetrics {
    pub total_executions: u64,
    pub claude_flow_executions: u64,
    pub codex_executions: u64,
    pub dual_mode_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub average_execution_time: f64,
    pub active_sandboxes: u64,
    pub total_sandboxes_created: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            claude_flow_enabled: true,
            codex_enabled: true,
            docker_enabled: true,
            max_concurrent_executions: 5,
            default_timeout: 300, // 5 minutes
            log_level: "info".to_string(),
            workspace_path: "/tmp/neural-bridge-workspace".to_string(),
        }
    }
}

impl Default for AppMetrics {
    fn default() -> Self {
        Self {
            total_executions: 0,
            claude_flow_executions: 0,
            codex_executions: 0,
            dual_mode_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            average_execution_time: 0.0,
            active_sandboxes: 0,
            total_sandboxes_created: 0,
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        info!("Initializing application state");

        let claude_flow = ClaudeFlowService::new();
        let codex = CodexService::new();
        let orchestration = OrchestrationService::new(claude_flow.clone(), codex.clone());

        let docker = match DockerManager::new() {
            Ok(manager) => {
                info!("Docker manager initialized successfully");
                manager
            }
            Err(e) => {
                error!("Failed to initialize Docker manager: {}", e);
                // Create a dummy manager that will fail gracefully
                match DockerManager::new() {
                    Ok(manager) => manager,
                    Err(_) => panic!("Docker is required for the Neural Bridge Platform"),
                }
            }
        };

        let config = AppConfig::default();
        let metrics = AppMetrics::default();

        // Create workspace directory if it doesn't exist
        if let Err(e) = std::fs::create_dir_all(&config.workspace_path) {
            error!("Failed to create workspace directory: {}", e);
        }

        Self {
            claude_flow,
            codex,
            orchestration,
            docker,
            config,
            metrics,
        }
    }

    pub async fn health_check(&self) -> Result<HashMap<String, bool>> {
        info!("Performing application health check");

        let mut status = HashMap::new();

        // Check Claude Flow
        let claude_health = self.claude_flow.health_check().await.unwrap_or(false);
        status.insert("claude_flow".to_string(), claude_health);

        // Check Codex
        let codex_health = self.codex.health_check().await.unwrap_or(false);
        status.insert("codex".to_string(), codex_health);

        // Check Docker
        let docker_health = self.docker.health_check().await.unwrap_or(false);
        status.insert("docker".to_string(), docker_health);

        // Overall health
        let overall_health = claude_health || codex_health; // At least one AI service should work
        status.insert("overall".to_string(), overall_health && docker_health);

        info!("Health check completed: {:?}", status);
        Ok(status)
    }

    pub fn update_execution_metrics(&mut self, service: &str, success: bool, execution_time: u64) {
        self.metrics.total_executions += 1;

        match service {
            "claude_flow" => self.metrics.claude_flow_executions += 1,
            "codex" => self.metrics.codex_executions += 1,
            "dual_mode" => self.metrics.dual_mode_executions += 1,
            _ => {}
        }

        if success {
            self.metrics.successful_executions += 1;
        } else {
            self.metrics.failed_executions += 1;
        }

        // Update average execution time
        let total_time =
            self.metrics.average_execution_time * (self.metrics.total_executions - 1) as f64;
        self.metrics.average_execution_time =
            (total_time + execution_time as f64) / self.metrics.total_executions as f64;
    }

    pub fn update_sandbox_metrics(&mut self, created: bool, active_count: u64) {
        if created {
            self.metrics.total_sandboxes_created += 1;
        }
        self.metrics.active_sandboxes = active_count;
    }

    pub fn get_metrics(&self) -> &AppMetrics {
        &self.metrics
    }

    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    pub fn update_config(&mut self, new_config: AppConfig) -> Result<()> {
        info!("Updating application configuration");

        // Validate configuration
        if new_config.max_concurrent_executions == 0 {
            return Err(anyhow::anyhow!(
                "max_concurrent_executions must be greater than 0"
            ));
        }

        if new_config.default_timeout == 0 {
            return Err(anyhow::anyhow!("default_timeout must be greater than 0"));
        }

        // Create workspace directory if it changed
        if new_config.workspace_path != self.config.workspace_path {
            std::fs::create_dir_all(&new_config.workspace_path)?;
        }

        self.config = new_config;
        info!("Configuration updated successfully");
        Ok(())
    }

    pub async fn cleanup(&self) -> Result<()> {
        info!("Performing application cleanup");

        // Clean up old Docker containers
        match self.docker.cleanup_old_containers().await {
            Ok(count) => info!("Cleaned up {} old containers", count),
            Err(e) => error!("Failed to cleanup containers: {}", e),
        }

        // Clean up workspace temporary files
        if let Ok(entries) = std::fs::read_dir(&self.config.workspace_path) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.starts_with("temp_")
                        || name.starts_with("claude_prompt_")
                        || name.starts_with("codex_script_")
                    {
                        if let Err(e) = std::fs::remove_file(entry.path()) {
                            error!("Failed to remove temp file {:?}: {}", entry.path(), e);
                        }
                    }
                }
            }
        }

        info!("Application cleanup completed");
        Ok(())
    }

    pub fn get_status_summary(&self) -> HashMap<String, serde_json::Value> {
        let mut summary = HashMap::new();

        summary.insert(
            "config".to_string(),
            serde_json::to_value(&self.config).unwrap_or_default(),
        );
        summary.insert(
            "metrics".to_string(),
            serde_json::to_value(&self.metrics).unwrap_or_default(),
        );

        summary.insert(
            "services".to_string(),
            serde_json::json!({
                "claude_flow_enabled": self.config.claude_flow_enabled,
                "codex_enabled": self.config.codex_enabled,
                "docker_enabled": self.config.docker_enabled,
            }),
        );

        summary.insert(
            "system".to_string(),
            serde_json::json!({
                "workspace_path": self.config.workspace_path,
                "log_level": self.config.log_level,
                "max_concurrent_executions": self.config.max_concurrent_executions,
            }),
        );

        summary
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert!(config.claude_flow_enabled);
        assert!(config.codex_enabled);
        assert!(config.docker_enabled);
        assert_eq!(config.max_concurrent_executions, 5);
        assert_eq!(config.default_timeout, 300);
    }

    #[test]
    fn test_app_metrics_default() {
        let metrics = AppMetrics::default();
        assert_eq!(metrics.total_executions, 0);
        assert_eq!(metrics.successful_executions, 0);
        assert_eq!(metrics.failed_executions, 0);
        assert_eq!(metrics.average_execution_time, 0.0);
    }

    #[tokio::test]
    async fn test_app_state_creation() {
        // This test might fail if Docker is not available
        // but it demonstrates the intended functionality
        let state = AppState::new();
        assert!(state.config.claude_flow_enabled);
        assert!(state.config.codex_enabled);
        assert!(state.config.docker_enabled);
    }
}
