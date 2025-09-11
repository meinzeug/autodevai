// Configuration management

use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ai: AIConfig,
    pub docker: DockerConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub default_model: String,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerConfig {
    pub enabled: bool,
    pub default_image: String,
    pub timeout_seconds: u64,
    pub cleanup_on_exit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub api_key_encryption: bool,
    pub require_https: bool,
    pub max_request_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub file_logging: bool,
    pub max_file_size_mb: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ai: AIConfig {
                default_model: "claude".to_string(),
                timeout_seconds: 30,
                max_retries: 3,
                temperature: 0.7,
            },
            docker: DockerConfig {
                enabled: false,
                default_image: "autodev-ai/sandbox".to_string(),
                timeout_seconds: 300,
                cleanup_on_exit: true,
            },
            security: SecurityConfig {
                api_key_encryption: true,
                require_https: true,
                max_request_size: 10 * 1024 * 1024, // 10MB
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                file_logging: true,
                max_file_size_mb: 100,
            },
        }
    }
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        // In a real implementation, this would load from a file
        // For now, return default config
        Ok(Self::default())
    }

    pub fn save(&self) -> Result<()> {
        // In a real implementation, this would save to a file
        tracing::debug!("Config saved (simulated)");
        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        if self.ai.timeout_seconds == 0 {
            return Err(anyhow::anyhow!("AI timeout cannot be zero"));
        }

        if self.ai.temperature < 0.0 || self.ai.temperature > 2.0 {
            return Err(anyhow::anyhow!("AI temperature must be between 0.0 and 2.0"));
        }

        if self.security.max_request_size == 0 {
            return Err(anyhow::anyhow!("Max request size cannot be zero"));
        }

        Ok(())
    }
}