// AutoDev-AI Neural Bridge Platform - Claude-Flow API Integration
//! Claude-Flow API integration for swarm orchestration

use crate::{
    api::{ApiClient, ApiConfig},
    errors::Result,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn};

/// Claude-Flow swarm initialization request
#[derive(Debug, Serialize)]
struct SwarmInitRequest {
    topology: String,
    #[serde(rename = "maxAgents")]
    max_agents: u32,
    strategy: String,
}

/// Claude-Flow swarm initialization response
#[derive(Debug, Deserialize)]
struct SwarmInitResponse {
    #[serde(rename = "swarmId")]
    swarm_id: String,
    status: String,
    #[serde(rename = "agentsCreated")]
    agents_created: u32,
}

/// Claude-Flow task orchestration request
#[derive(Debug, Serialize)]
struct TaskOrchestrationRequest {
    task: String,
    priority: String,
    strategy: String,
    #[serde(rename = "maxAgents", skip_serializing_if = "Option::is_none")]
    max_agents: Option<u32>,
}

/// Claude-Flow task orchestration response
#[derive(Debug, Deserialize)]
struct TaskOrchestrationResponse {
    #[serde(rename = "taskId")]
    task_id: String,
    status: String,
    #[serde(rename = "assignedAgents")]
    assigned_agents: Vec<String>,
}

/// Claude-Flow agent information
#[derive(Debug, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub agent_type: String,
    pub capabilities: Vec<String>,
    pub status: String,
    #[serde(rename = "currentTask", skip_serializing_if = "Option::is_none")]
    pub current_task: Option<String>,
}

/// Claude-Flow swarm status
#[derive(Debug, Deserialize)]
pub struct SwarmStatus {
    #[serde(rename = "swarmId")]
    pub swarm_id: String,
    pub topology: String,
    pub agents: Vec<AgentInfo>,
    #[serde(rename = "activeTasks")]
    pub active_tasks: u32,
    #[serde(rename = "completedTasks")]
    pub completed_tasks: u32,
    pub uptime: u64,
}

/// Initialize a Claude-Flow swarm
pub async fn initialize_swarm(topology: &str, max_agents: u32) -> Result<String> {
    info!("Initializing Claude-Flow swarm with topology: {}", topology);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let request = SwarmInitRequest {
        topology: topology.to_string(),
        max_agents,
        strategy: "balanced".to_string(),
    };

    match client
        .post::<SwarmInitRequest, SwarmInitResponse>("api/v1/swarm/init", &request)
        .await
    {
        Ok(response) => {
            info!("Swarm initialized successfully: {}", response.swarm_id);
            Ok(response.swarm_id)
        }
        Err(e) => {
            error!("Failed to initialize swarm: {}", e);
            Err(e)
        }
    }
}

/// Execute a task using Claude-Flow orchestration
pub async fn execute_task(task_description: &str, priority: Option<String>) -> Result<String> {
    info!("Executing Claude-Flow task: {}", task_description);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let request = TaskOrchestrationRequest {
        task: task_description.to_string(),
        priority: priority.unwrap_or_else(|| "medium".to_string()),
        strategy: "adaptive".to_string(),
        max_agents: None,
    };

    match client
        .post::<TaskOrchestrationRequest, TaskOrchestrationResponse>(
            "api/v1/task/orchestrate",
            &request,
        )
        .await
    {
        Ok(response) => {
            info!("Task orchestrated successfully: {}", response.task_id);
            Ok(response.task_id)
        }
        Err(e) => {
            error!("Failed to orchestrate task: {}", e);
            Err(e)
        }
    }
}

/// Get swarm status and agent information
pub async fn get_swarm_status(swarm_id: &str) -> Result<SwarmStatus> {
    info!("Getting swarm status for: {}", swarm_id);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    match client
        .get::<SwarmStatus>(&format!("api/v1/swarm/{}/status", swarm_id))
        .await
    {
        Ok(status) => {
            info!(
                "Retrieved swarm status: {} agents active",
                status.agents.len()
            );
            Ok(status)
        }
        Err(e) => {
            error!("Failed to get swarm status: {}", e);
            Err(e)
        }
    }
}

/// Spawn a new agent in the swarm
pub async fn spawn_agent(
    swarm_id: &str,
    agent_type: &str,
    capabilities: Vec<String>,
) -> Result<String> {
    info!("Spawning agent type: {} in swarm: {}", agent_type, swarm_id);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let mut request_data = HashMap::new();
    request_data.insert("type".to_string(), agent_type.to_string());
    let capabilities_json = serde_json::to_string(&capabilities).map_err(|e| {
        crate::errors::NeuralBridgeError::api(format!("Failed to serialize capabilities: {}", e))
    })?;
    request_data.insert("capabilities".to_string(), capabilities_json);
    request_data.insert("swarmId".to_string(), swarm_id.to_string());

    #[derive(Deserialize)]
    struct SpawnResponse {
        #[serde(rename = "agentId")]
        agent_id: String,
    }

    match client
        .post::<HashMap<String, String>, SpawnResponse>("api/v1/agent/spawn", &request_data)
        .await
    {
        Ok(response) => {
            info!("Agent spawned successfully: {}", response.agent_id);
            Ok(response.agent_id)
        }
        Err(e) => {
            error!("Failed to spawn agent: {}", e);
            Err(e)
        }
    }
}

/// Get task execution results
pub async fn get_task_results(task_id: &str) -> Result<serde_json::Value> {
    info!("Getting task results for: {}", task_id);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    match client
        .get::<serde_json::Value>(&format!("api/v1/task/{}/results", task_id))
        .await
    {
        Ok(results) => {
            info!("Retrieved task results for: {}", task_id);
            Ok(results)
        }
        Err(e) => {
            error!("Failed to get task results: {}", e);
            Err(e)
        }
    }
}

/// Scale swarm up or down
pub async fn scale_swarm(swarm_id: &str, target_agents: u32) -> Result<()> {
    info!("Scaling swarm {} to {} agents", swarm_id, target_agents);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let mut request_data = HashMap::new();
    request_data.insert("targetAgents".to_string(), target_agents.to_string());

    match client
        .put::<HashMap<String, String>, serde_json::Value>(
            &format!("api/v1/swarm/{}/scale", swarm_id),
            &request_data,
        )
        .await
    {
        Ok(_) => {
            info!("Swarm scaled successfully");
            Ok(())
        }
        Err(e) => {
            error!("Failed to scale swarm: {}", e);
            Err(e)
        }
    }
}

/// Destroy swarm and cleanup resources
pub async fn destroy_swarm(swarm_id: &str) -> Result<()> {
    info!("Destroying swarm: {}", swarm_id);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    match client.delete(&format!("api/v1/swarm/{}", swarm_id)).await {
        Ok(_) => {
            info!("Swarm destroyed successfully");
            Ok(())
        }
        Err(e) => {
            error!("Failed to destroy swarm: {}", e);
            Err(e)
        }
    }
}

/// Store data in swarm memory
pub async fn store_memory(key: &str, value: &str, namespace: Option<&str>) -> Result<()> {
    info!("Storing memory: {}", key);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let mut request_data = HashMap::new();
    request_data.insert("action".to_string(), "store".to_string());
    request_data.insert("key".to_string(), key.to_string());
    request_data.insert("value".to_string(), value.to_string());

    if let Some(ns) = namespace {
        request_data.insert("namespace".to_string(), ns.to_string());
    }

    match client
        .post::<HashMap<String, String>, serde_json::Value>("api/v1/memory", &request_data)
        .await
    {
        Ok(_) => {
            info!("Memory stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("Failed to store memory: {}", e);
            Err(e)
        }
    }
}

/// Retrieve data from swarm memory
pub async fn retrieve_memory(key: &str, namespace: Option<&str>) -> Result<String> {
    info!("Retrieving memory: {}", key);

    let config = ApiConfig {
        base_url: "http://localhost:3000".to_string(),
        ..Default::default()
    };

    let client = ApiClient::new(config)?;

    let mut query_params = vec![("action", "retrieve"), ("key", key)];

    if let Some(ns) = namespace {
        query_params.push(("namespace", ns));
    }

    let query_string = query_params
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("&");

    #[derive(Deserialize)]
    struct MemoryResponse {
        value: String,
    }

    match client
        .get::<MemoryResponse>(&format!("api/v1/memory?{}", query_string))
        .await
    {
        Ok(response) => {
            info!("Memory retrieved successfully");
            Ok(response.value)
        }
        Err(e) => {
            error!("Failed to retrieve memory: {}", e);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_swarm_initialization_request_serialization() {
        let request = SwarmInitRequest {
            topology: "hierarchical".to_string(),
            max_agents: 8,
            strategy: "balanced".to_string(),
        };

        let json = serde_json::to_string(&request).expect("Failed to serialize request");
        assert!(json.contains("hierarchical"));
        assert!(json.contains("maxAgents"));
    }

    #[tokio::test]
    async fn test_task_orchestration_request_serialization() {
        let request = TaskOrchestrationRequest {
            task: "test task".to_string(),
            priority: "high".to_string(),
            strategy: "adaptive".to_string(),
            max_agents: Some(5),
        };

        let json = serde_json::to_string(&request).expect("Failed to serialize request");
        assert!(json.contains("test task"));
        assert!(json.contains("maxAgents"));
    }

    #[test]
    fn test_agent_info_deserialization() {
        let json = r#"{
            "id": "agent-123",
            "type": "coder",
            "capabilities": ["rust", "typescript"],
            "status": "active",
            "currentTask": "task-456"
        }"#;

        let agent: AgentInfo = serde_json::from_str(json).expect("Failed to deserialize agent info");
        assert_eq!(agent.id, "agent-123");
        assert_eq!(agent.agent_type, "coder");
        assert_eq!(agent.capabilities, vec!["rust", "typescript"]);
    }
}
