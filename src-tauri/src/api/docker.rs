// AutoDev-AI Neural Bridge Platform - Docker API Integration
//! Docker API integration for container management

use crate::{
    errors::Result,
    types::DockerContainer,
};
use bollard::{Docker, API_DEFAULT_VERSION};
use bollard::container::{
    Config, CreateContainerOptions, ListContainersOptions, 
    StartContainerOptions, StopContainerOptions
};
use bollard::image::CreateImageOptions;
use bollard::models::{ContainerSummary, HostConfig, PortBinding};
use futures_util::stream::StreamExt;
use serde_json::Value;
use std::collections::HashMap;
use tracing::{error, info, warn};

/// Docker client wrapper
pub struct DockerClient {
    client: Docker,
}

impl DockerClient {
    /// Create a new Docker client
    pub fn new() -> Result<Self> {
        let client = Docker::connect_with_socket_defaults()
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to connect to Docker: {}", e)))?;

        Ok(Self { client })
    }

    /// List all containers
    pub async fn list_containers(&self, all: bool) -> Result<Vec<DockerContainer>> {
        info!("Listing Docker containers (all: {})", all);

        let options = Some(ListContainersOptions::<String> {
            all,
            ..Default::default()
        });

        let containers = self.client
            .list_containers(options)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to list containers: {}", e)))?;

        let result = containers
            .into_iter()
            .map(|container| container_summary_to_docker_container(container))
            .collect();

        Ok(result)
    }

    /// Create and start a new container
    pub async fn create_container(&self, image: &str, name: &str, config: Value) -> Result<String> {
        info!("Creating Docker container: {} with image: {}", name, image);

        // Pull image if not exists
        self.pull_image_if_needed(image).await?;

        // Parse configuration
        let container_config = self.parse_container_config(image, config)?;

        // Create container
        let options = CreateContainerOptions { name, platform: None };
        
        let container = self.client
            .create_container(Some(options), container_config)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to create container: {}", e)))?;

        // Start container
        self.client
            .start_container(&container.id, None::<StartContainerOptions<String>>)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to start container: {}", e)))?;

        info!("Container created and started: {}", container.id);
        Ok(container.id)
    }

    /// Stop a container
    pub async fn stop_container(&self, container_id: &str, timeout: Option<i64>) -> Result<()> {
        info!("Stopping Docker container: {}", container_id);

        let options = StopContainerOptions { t: timeout.unwrap_or(10) };

        self.client
            .stop_container(container_id, Some(options))
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to stop container: {}", e)))?;

        info!("Container stopped: {}", container_id);
        Ok(())
    }

    /// Remove a container
    pub async fn remove_container(&self, container_id: &str, force: bool) -> Result<()> {
        info!("Removing Docker container: {} (force: {})", container_id, force);

        let options = Some(bollard::container::RemoveContainerOptions {
            force,
            ..Default::default()
        });

        self.client
            .remove_container(container_id, options)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to remove container: {}", e)))?;

        info!("Container removed: {}", container_id);
        Ok(())
    }

    /// Get container logs
    pub async fn get_container_logs(&self, container_id: &str, lines: Option<String>) -> Result<String> {
        info!("Getting logs for container: {}", container_id);

        let options = Some(bollard::container::LogsOptions::<String> {
            stdout: true,
            stderr: true,
            tail: lines.unwrap_or_else(|| "100".to_string()),
            ..Default::default()
        });

        let mut stream = self.client.logs(container_id, options);
        let mut logs = String::new();

        while let Some(log_result) = stream.next().await {
            match log_result {
                Ok(log_output) => {
                    logs.push_str(&format!("{}", log_output));
                }
                Err(e) => {
                    warn!("Error reading log: {}", e);
                    break;
                }
            }
        }

        Ok(logs)
    }

    /// Execute command in container
    pub async fn exec_in_container(&self, container_id: &str, command: Vec<String>) -> Result<String> {
        info!("Executing command in container {}: {:?}", container_id, command);

        let exec_config = bollard::exec::CreateExecOptions {
            cmd: Some(command),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        };

        let exec = self.client
            .create_exec(container_id, exec_config)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to create exec: {}", e)))?;

        let mut stream = self.client.start_exec(&exec.id, None);
        let mut output = String::new();

        while let Some(result) = stream.next().await {
            match result {
                Ok(log_output) => {
                    output.push_str(&format!("{}", log_output));
                }
                Err(e) => {
                    warn!("Error reading exec output: {}", e);
                    break;
                }
            }
        }

        Ok(output)
    }

    /// Pull image if not exists locally
    async fn pull_image_if_needed(&self, image: &str) -> Result<()> {
        info!("Checking if image exists: {}", image);

        // Check if image exists locally
        let images = self.client
            .list_images(None::<bollard::image::ListImagesOptions<String>>)
            .await
            .map_err(|e| crate::errors::NeuralBridgeError::docker(format!("Failed to list images: {}", e)))?;

        let image_exists = images.iter().any(|img| {
            img.repo_tags.iter().any(|tag| tag == image)
        });

        if !image_exists {
            info!("Pulling image: {}", image);
            let options = Some(CreateImageOptions {
                from_image: image,
                ..Default::default()
            });

            let mut stream = self.client.create_image(options, None, None);
            
            while let Some(result) = stream.next().await {
                match result {
                    Ok(_) => continue,
                    Err(e) => {
                        error!("Failed to pull image: {}", e);
                        return Err(crate::errors::NeuralBridgeError::docker(format!("Failed to pull image: {}", e)));
                    }
                }
            }

            info!("Image pulled successfully: {}", image);
        } else {
            info!("Image already exists locally: {}", image);
        }

        Ok(())
    }

    /// Parse container configuration from JSON
    fn parse_container_config(&self, image: &str, config: Value) -> Result<Config<String>> {
        let env: Option<Vec<String>> = config.get("env")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            });

        let cmd: Option<Vec<String>> = config.get("cmd")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            });

        // Parse port bindings
        let mut port_bindings: HashMap<String, Option<Vec<PortBinding>>> = HashMap::new();
        if let Some(ports) = config.get("ports").and_then(|v| v.as_object()) {
            for (container_port, host_port) in ports {
                if let Some(host_port_str) = host_port.as_str() {
                    port_bindings.insert(
                        format!("{}/tcp", container_port),
                        Some(vec![PortBinding {
                            host_ip: Some("0.0.0.0".to_string()),
                            host_port: Some(host_port_str.to_string()),
                        }]),
                    );
                }
            }
        }

        let host_config = if !port_bindings.is_empty() {
            Some(HostConfig {
                port_bindings: Some(port_bindings),
                ..Default::default()
            })
        } else {
            None
        };

        Ok(Config {
            image: Some(image.to_string()),
            env,
            cmd,
            host_config,
            ..Default::default()
        })
    }
}

/// Convert ContainerSummary to DockerContainer
fn container_summary_to_docker_container(summary: ContainerSummary) -> DockerContainer {
    DockerContainer {
        id: summary.id.unwrap_or_default(),
        name: summary.names
            .and_then(|names| names.first().cloned())
            .unwrap_or_default()
            .trim_start_matches('/')
            .to_string(),
        image: summary.image.unwrap_or_default(),
        status: summary.status.unwrap_or_default(),
        ports: summary.ports
            .unwrap_or_default()
            .into_iter()
            .filter_map(|port| {
                if let (Some(private_port), Some(public_port)) = (port.private_port, port.public_port) {
                    Some(format!("{}:{}", public_port, private_port))
                } else if let Some(private_port) = port.private_port {
                    Some(format!("{}", private_port))
                } else {
                    None
                }
            })
            .collect(),
        created: chrono::DateTime::from_timestamp(summary.created.unwrap_or(0), 0)
            .unwrap_or_else(chrono::Utc::now),
    }
}

// Public API functions
static DOCKER_CLIENT: std::sync::OnceLock<std::sync::Arc<std::sync::Mutex<Option<DockerClient>>>> = std::sync::OnceLock::new();

fn get_docker_client() -> Result<std::sync::Arc<std::sync::Mutex<Option<DockerClient>>>> {
    Ok(DOCKER_CLIENT.get_or_init(|| std::sync::Arc::new(std::sync::Mutex::new(None))).clone())
}

/// List all containers
pub async fn list_containers() -> Result<Vec<DockerContainer>> {
    let client_mutex = get_docker_client()?;
    let mut client_guard = client_mutex.lock().unwrap();
    
    if client_guard.is_none() {
        *client_guard = Some(DockerClient::new()?);
    }
    
    let client = client_guard.as_ref().unwrap();
    client.list_containers(false).await
}

/// Create and start a container
pub async fn create_container(image: &str, name: &str, config: Value) -> Result<String> {
    let client_mutex = get_docker_client()?;
    let mut client_guard = client_mutex.lock().unwrap();
    
    if client_guard.is_none() {
        *client_guard = Some(DockerClient::new()?);
    }
    
    let client = client_guard.as_ref().unwrap();
    client.create_container(image, name, config).await
}

/// Stop a container
pub async fn stop_container(container_id: &str) -> Result<()> {
    let client_mutex = get_docker_client()?;
    let mut client_guard = client_mutex.lock().unwrap();
    
    if client_guard.is_none() {
        *client_guard = Some(DockerClient::new()?);
    }
    
    let client = client_guard.as_ref().unwrap();
    client.stop_container(container_id, None).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_container_summary_conversion() {
        let summary = ContainerSummary {
            id: Some("container-123".to_string()),
            names: Some(vec!["/test-container".to_string()]),
            image: Some("nginx:latest".to_string()),
            status: Some("running".to_string()),
            created: Some(1640995200), // 2022-01-01
            ports: Some(vec![]),
            ..Default::default()
        };

        let container = container_summary_to_docker_container(summary);
        assert_eq!(container.id, "container-123");
        assert_eq!(container.name, "test-container");
        assert_eq!(container.image, "nginx:latest");
        assert_eq!(container.status, "running");
    }

    #[tokio::test]
    async fn test_docker_client_creation() {
        // This test may fail if Docker is not running
        match DockerClient::new() {
            Ok(_) => println!("Docker client created successfully"),
            Err(e) => println!("Docker client creation failed (expected if Docker not running): {}", e),
        }
    }

    #[test]
    fn test_container_config_parsing() {
        let client = DockerClient::new();
        if client.is_err() {
            return; // Skip test if Docker not available
        }
        
        let client = client.unwrap();
        let config = serde_json::json!({
            "env": ["NODE_ENV=production", "PORT=3000"],
            "cmd": ["npm", "start"],
            "ports": {
                "3000": "3000",
                "8080": "8080"
            }
        });

        let result = client.parse_container_config("node:18", config);
        assert!(result.is_ok());
        
        let parsed_config = result.unwrap();
        assert_eq!(parsed_config.image, Some("node:18".to_string()));
        assert!(parsed_config.env.is_some());
        assert!(parsed_config.cmd.is_some());
    }
}