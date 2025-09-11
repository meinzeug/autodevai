// use crate::{SandboxRequest, SandboxResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxRequest {
    pub id: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxResponse {
    pub id: String,
    pub result: String,
    pub success: bool,
}
use anyhow::{anyhow, Result};
use bollard::container::{
    Config, CreateContainerOptions, ListContainersOptions, RemoveContainerOptions,
    StartContainerOptions, StopContainerOptions,
};
use bollard::image::CreateImageOptions;
use bollard::models::{ContainerSummary, HostConfig, PortBinding};
use bollard::Docker;
use futures_util::stream::StreamExt;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::Arc;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone)]
pub struct DockerManager {
    client: Docker,
    port_counter: Arc<AtomicU16>,
    base_port: u16,
    max_port: u16,
}

impl DockerManager {
    pub fn new() -> Result<Self> {
        let client = Docker::connect_with_local_defaults()
            .map_err(|e| anyhow!("Failed to connect to Docker: {}", e))?;

        Ok(Self {
            client,
            port_counter: Arc::new(AtomicU16::new(0)),
            base_port: 50000,
            max_port: 50100,
        })
    }

    pub async fn create_sandbox(&self, request: SandboxRequest) -> Result<SandboxResponse> {
        info!("Creating sandbox: {}", request.name);

        // Allocate a port
        let port = self.allocate_port().await?;

        // Default to Ubuntu if no image specified
        let image = request.image.unwrap_or_else(|| "ubuntu:22.04".to_string());

        // Pull image if it doesn't exist
        self.ensure_image_exists(&image).await?;

        // Prepare port bindings
        let mut port_bindings = HashMap::new();
        port_bindings.insert(
            format!("{}/tcp", port),
            Some(vec![PortBinding {
                host_ip: Some("127.0.0.1".to_string()),
                host_port: Some(port.to_string()),
            }]),
        );

        // Add custom ports if specified
        if let Some(custom_ports) = &request.ports {
            for &custom_port in custom_ports {
                port_bindings.insert(
                    format!("{}/tcp", custom_port),
                    Some(vec![PortBinding {
                        host_ip: Some("127.0.0.1".to_string()),
                        host_port: Some(custom_port.to_string()),
                    }]),
                );
            }
        }

        // Prepare environment variables
        let mut env_vars = vec![
            "DEBIAN_FRONTEND=noninteractive".to_string(),
            format!("SANDBOX_PORT={}", port),
        ];

        if let Some(env) = &request.environment {
            for (key, value) in env {
                env_vars.push(format!("{}={}", key, value));
            }
        }

        // Create container configuration
        let config = Config {
            image: Some(image.clone()),
            env: Some(env_vars),
            cmd: Some(vec![
                "/bin/bash".to_string(),
                "-c".to_string(),
                "while true; do sleep 30; done".to_string(), // Keep container running
            ]),
            working_dir: Some("/workspace".to_string()),
            host_config: Some(HostConfig {
                port_bindings: Some(port_bindings),
                auto_remove: Some(true),
                memory: Some(512 * 1024 * 1024), // 512MB
                cpu_quota: Some(50000),          // 50% of CPU
                ..Default::default()
            }),
            labels: Some({
                let mut labels = HashMap::new();
                labels.insert("neural-bridge".to_string(), "true".to_string());
                labels.insert("sandbox-name".to_string(), request.name.clone());
                labels.insert(
                    "created-by".to_string(),
                    "neural-bridge-platform".to_string(),
                );
                labels
            }),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: format!("neural-bridge-{}", request.name),
            platform: None,
        };

        debug!("Creating container with config: {:?}", config);

        // Create the container
        match self.client.create_container(Some(options), config).await {
            Ok(response) => {
                let container_id = response.id;
                info!("Container created with ID: {}", container_id);

                // Start the container
                match self
                    .client
                    .start_container(&container_id, None::<StartContainerOptions<String>>)
                    .await
                {
                    Ok(_) => {
                        info!("Container started successfully on port {}", port);

                        // Install basic tools in the container
                        self.setup_container(&container_id).await?;

                        Ok(SandboxResponse {
                            success: true,
                            container_id: Some(container_id),
                            port: Some(port),
                            error: None,
                        })
                    }
                    Err(e) => {
                        error!("Failed to start container: {}", e);
                        // Try to remove the created container
                        let _ = self
                            .client
                            .remove_container(
                                &container_id,
                                Some(RemoveContainerOptions {
                                    force: true,
                                    ..Default::default()
                                }),
                            )
                            .await;

                        Ok(SandboxResponse {
                            success: false,
                            container_id: None,
                            port: None,
                            error: Some(format!("Failed to start container: {}", e)),
                        })
                    }
                }
            }
            Err(e) => {
                error!("Failed to create container: {}", e);
                Ok(SandboxResponse {
                    success: false,
                    container_id: None,
                    port: None,
                    error: Some(format!("Failed to create container: {}", e)),
                })
            }
        }
    }

    async fn allocate_port(&self) -> Result<u16> {
        let current = self.port_counter.load(Ordering::SeqCst);
        let port = self.base_port + current;

        if port > self.max_port {
            return Err(anyhow!(
                "No available ports in range {}-{}",
                self.base_port,
                self.max_port
            ));
        }

        self.port_counter.store(current + 1, Ordering::SeqCst);
        Ok(port)
    }

    async fn ensure_image_exists(&self, image: &str) -> Result<()> {
        info!("Ensuring image exists: {}", image);

        // Check if image exists locally
        match self.client.inspect_image(image).await {
            Ok(_) => {
                debug!("Image {} already exists locally", image);
                return Ok(());
            }
            Err(_) => {
                info!("Image {} not found locally, pulling...", image);
            }
        }

        // Pull the image
        let options = Some(CreateImageOptions {
            from_image: image,
            ..Default::default()
        });

        let mut stream = self.client.create_image(options, None, None);

        while let Some(result) = stream.next().await {
            match result {
                Ok(info) => {
                    debug!("Pull progress: {:?}", info);
                }
                Err(e) => {
                    error!("Failed to pull image {}: {}", image, e);
                    return Err(anyhow!("Failed to pull image: {}", e));
                }
            }
        }

        info!("Successfully pulled image: {}", image);
        Ok(())
    }

    async fn setup_container(&self, container_id: &str) -> Result<()> {
        info!("Setting up container: {}", container_id);

        // Install basic development tools
        let setup_commands = vec![
            "apt-get update",
            "apt-get install -y curl wget git nano vim python3 python3-pip nodejs npm",
            "mkdir -p /workspace",
            "chmod 777 /workspace",
        ];

        for cmd in setup_commands {
            debug!("Executing setup command: {}", cmd);

            let exec_config = bollard::exec::CreateExecOptions {
                cmd: Some(vec!["/bin/bash", "-c", cmd]),
                attach_stdout: Some(true),
                attach_stderr: Some(true),
                ..Default::default()
            };

            match self.client.create_exec(container_id, exec_config).await {
                Ok(exec_result) => {
                    if let Err(e) = self.client.start_exec(&exec_result.id, None).await {
                        warn!("Setup command failed: {} ({})", cmd, e);
                    }
                }
                Err(e) => {
                    warn!("Failed to create exec for setup command: {} ({})", cmd, e);
                }
            }
        }

        info!("Container setup completed");
        Ok(())
    }

    pub async fn list_containers(&self) -> Result<Vec<Value>> {
        info!("Listing Neural Bridge containers");

        let options = Some(ListContainersOptions::<String> {
            all: true,
            filters: {
                let mut filters = HashMap::new();
                filters.insert("label".to_string(), vec!["neural-bridge=true".to_string()]);
                filters
            },
            ..Default::default()
        });

        match self.client.list_containers(options).await {
            Ok(containers) => {
                let result: Vec<Value> = containers
                    .into_iter()
                    .map(|container| self.container_to_json(container))
                    .collect();

                info!("Found {} Neural Bridge containers", result.len());
                Ok(result)
            }
            Err(e) => {
                error!("Failed to list containers: {}", e);
                Err(anyhow!("Failed to list containers: {}", e))
            }
        }
    }

    fn container_to_json(&self, container: ContainerSummary) -> Value {
        json!({
            "id": container.id.unwrap_or_default(),
            "names": container.names.unwrap_or_default(),
            "image": container.image.unwrap_or_default(),
            "state": container.state.unwrap_or_default(),
            "status": container.status.unwrap_or_default(),
            "created": container.created.unwrap_or_default(),
            "ports": container.ports.unwrap_or_default(),
            "labels": container.labels.unwrap_or_default(),
        })
    }

    pub async fn stop_container(&self, container_id: &str) -> Result<()> {
        info!("Stopping container: {}", container_id);

        let options = Some(StopContainerOptions { t: 10 });

        match self.client.stop_container(container_id, options).await {
            Ok(_) => {
                info!("Container stopped successfully: {}", container_id);
                Ok(())
            }
            Err(e) => {
                error!("Failed to stop container {}: {}", container_id, e);
                Err(anyhow!("Failed to stop container: {}", e))
            }
        }
    }

    pub async fn remove_container(&self, container_id: &str) -> Result<()> {
        info!("Removing container: {}", container_id);

        let options = Some(RemoveContainerOptions {
            force: true,
            ..Default::default()
        });

        match self.client.remove_container(container_id, options).await {
            Ok(_) => {
                info!("Container removed successfully: {}", container_id);
                Ok(())
            }
            Err(e) => {
                error!("Failed to remove container {}: {}", container_id, e);
                Err(anyhow!("Failed to remove container: {}", e))
            }
        }
    }

    pub async fn execute_command(&self, container_id: &str, command: &str) -> Result<String> {
        debug!(
            "Executing command in container {}: {}",
            container_id, command
        );

        let exec_config = bollard::exec::CreateExecOptions {
            cmd: Some(vec!["/bin/bash", "-c", command]),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        };

        let exec_result = self.client.create_exec(container_id, exec_config).await?;

        let mut output = String::new();

        // For now, just return a success message since the exec API is complex
        // In a production environment, you would properly handle the stream
        match self.client.start_exec(&exec_result.id, None).await {
            Ok(_) => {
                info!("Command executed successfully");
                output = "Command executed successfully".to_string();
            }
            Err(e) => {
                error!("Failed to start exec: {}", e);
                return Err(anyhow!("Failed to start exec: {}", e));
            }
        }

        Ok(output)
    }

    pub async fn health_check(&self) -> Result<bool> {
        match self.client.ping().await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Docker health check failed: {}", e);
                Ok(false)
            }
        }
    }

    pub async fn cleanup_old_containers(&self) -> Result<usize> {
        info!("Cleaning up old Neural Bridge containers");

        let containers = self.list_containers().await?;
        let mut cleaned = 0;

        for container in containers {
            if let Some(state) = container.get("state").and_then(|s| s.as_str()) {
                if state == "exited" || state == "dead" {
                    if let Some(id) = container.get("id").and_then(|i| i.as_str()) {
                        if let Ok(_) = self.remove_container(id).await {
                            cleaned += 1;
                        }
                    }
                }
            }
        }

        info!("Cleaned up {} old containers", cleaned);
        Ok(cleaned)
    }
}
