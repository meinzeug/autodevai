//! AI Orchestration Tauri Commands
//! 
//! Rust command handlers for AI integration features including swarm coordination,
//! SPARC methodology, hive-mind communication, and memory persistence.

use crate::orchestration::{
    ClaudeFlowService, CodexService, OrchestrationService,
    EnhancedOrchestrationConfig, get_enhanced_orchestration_info,
    SwarmConfig, SparcMode, HiveMindCommand, DualModeRequest, DualModeResponse,
    ExecutionRequest, ExecutionResponse, MemoryState, SwarmMetrics,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{command, State};
use uuid::Uuid;

/// Global AI orchestration service state
pub struct AiOrchestrationState {
    pub service: Arc<Mutex<OrchestrationService>>,
    pub memory_layer: Arc<Mutex<MemoryLayer>>,
    pub config: EnhancedOrchestrationConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryLayer {
    pub namespace: String,
    pub session_id: String,
    pub active_sessions: usize,
}

impl Default for AiOrchestrationState {
    fn default() -> Self {
        let claude_flow = ClaudeFlowService::new();
        let codex = CodexService::new();
        let orchestration = OrchestrationService::new(claude_flow, codex);
        
        let config = EnhancedOrchestrationConfig::default();
        
        Self {
            service: Arc::new(Mutex::new(orchestration)),
            memory_layer: Arc::new(Mutex::new(MemoryLayer {
                namespace: "autodev-ai".to_string(),
                session_id: Uuid::new_v4().to_string(),
                active_sessions: 1,
            })),
            config,
        }
    }
}

/// Initialize AI orchestration swarm (Schritt 327: Swarm Command Wrapper)
#[command]
pub async fn initialize_swarm(
    swarm_config: SwarmConfig,
    state: State<'_, AiOrchestrationState>,
) -> Result<String, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    let session_id = Uuid::new_v4().to_string();
    
    // Create a dummy request to initialize swarm through Claude Flow
    let request = ExecutionRequest {
        id: session_id.clone(),
        command: "Initialize swarm".to_string(),
        prompt: "Initialize AI orchestration swarm".to_string(),
        language: None,
        context: Some("swarm_initialization".to_string()),
        temperature: Some(0.7),
        swarm_config: Some(swarm_config),
        sparc_mode: None,
        hive_mind_commands: Vec::new(),
        memory_context: Some(format!("swarm_init_{}", session_id)),
    };
    
    match service.claude_flow.execute(request).await {
        Ok(response) => {
            if response.success {
                Ok(format!("Swarm initialized with ID: {}", session_id))
            } else {
                Err(response.error.unwrap_or("Swarm initialization failed".to_string()))
            }
        },
        Err(e) => Err(format!("Failed to initialize swarm: {}", e))
    }
}

/// Execute SPARC methodology mode (Schritt 328: SPARC Modi Integration)
#[command]
pub async fn execute_sparc_mode(
    prompt: String,
    mode: SparcMode,
    swarm_enabled: bool,
    state: State<'_, AiOrchestrationState>,
) -> Result<ExecutionResponse, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    let session_id = Uuid::new_v4().to_string();
    
    let swarm_config = if swarm_enabled {
        Some(SwarmConfig {
            topology: crate::orchestration::SwarmTopology::Hierarchical,
            max_agents: 6,
            strategy: crate::orchestration::CoordinationStrategy::Adaptive,
            memory_persistence: true,
        })
    } else {
        None
    };
    
    let request = ExecutionRequest {
        id: session_id.clone(),
        command: format!("Execute SPARC {:?} mode", mode),
        prompt,
        language: None,
        context: Some(format!("sparc_{:?}", mode)),
        temperature: Some(0.7),
        swarm_config,
        sparc_mode: Some(mode),
        hive_mind_commands: Vec::new(),
        memory_context: Some(format!("sparc_{}_{}", format!("{:?}", mode).to_lowercase(), session_id)),
    };
    
    service.claude_flow.execute(request).await
        .map_err(|e| format!("SPARC execution failed: {}", e))
}

/// Process hive-mind coordination command (Schritt 329: Hive-Mind Command Integration)
#[command]
pub async fn process_hive_mind_command(
    command: HiveMindCommand,
    state: State<'_, AiOrchestrationState>,
) -> Result<String, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    let request = ExecutionRequest {
        id: command.id.clone(),
        command: format!("Hive-mind {:?}", command.command_type),
        prompt: "Process hive-mind coordination".to_string(),
        language: None,
        context: Some(format!("hive_mind_{:?}", command.command_type)),
        temperature: Some(0.7),
        swarm_config: None,
        sparc_mode: None,
        hive_mind_commands: vec![command.clone()],
        memory_context: Some(format!("hive_command_{}", command.id)),
    };
    
    match service.claude_flow.execute(request).await {
        Ok(response) => {
            if response.success {
                Ok(format!("Hive-mind command {:?} processed successfully", command.command_type))
            } else {
                Err(response.error.unwrap_or("Hive-mind command failed".to_string()))
            }
        },
        Err(e) => Err(format!("Failed to process hive-mind command: {}", e))
    }
}

/// Store data in persistent memory layer (Schritt 330: Memory Layer Persistence)
#[command]
pub async fn store_memory(
    key: String,
    value: String,
    tags: Vec<String>,
    ttl_seconds: Option<u64>,
    state: State<'_, AiOrchestrationState>,
) -> Result<String, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    // Use the internal memory store function
    match service.claude_flow.store_memory(&key, &value).await {
        Ok(_) => Ok(format!("Memory stored: {}", key)),
        Err(e) => Err(format!("Failed to store memory: {}", e))
    }
}

/// Retrieve data from persistent memory layer
#[command]
pub async fn retrieve_memory(
    key: String,
    state: State<'_, AiOrchestrationState>,
) -> Result<String, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    match service.claude_flow.retrieve_memory(&key).await {
        Ok(value) => Ok(value),
        Err(e) => Err(format!("Failed to retrieve memory: {}", e))
    }
}

/// Get current memory layer state
#[command]
pub async fn get_memory_state(
    state: State<'_, AiOrchestrationState>,
) -> Result<MemoryState, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    service.calculate_memory_state().await
        .map_err(|e| format!("Failed to get memory state: {}", e))
}

/// Execute dual mode with AI orchestration
#[command]
pub async fn execute_ai_orchestrated_dual_mode(
    prompt: String,
    swarm_config: Option<SwarmConfig>,
    sparc_mode: Option<SparcMode>,
    state: State<'_, AiOrchestrationState>,
) -> Result<DualModeResponse, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    let session_id = Uuid::new_v4().to_string();
    
    let request = DualModeRequest {
        id: session_id,
        command: prompt,
        swarm_config,
        sparc_mode,
    };
    
    service.execute_dual_mode(request).await
        .map_err(|e| format!("AI orchestrated dual mode failed: {}", e))
}

/// Get swarm metrics for active session
#[command]
pub async fn get_swarm_metrics(
    session_id: String,
    state: State<'_, AiOrchestrationState>,
) -> Result<SwarmMetrics, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    service.claude_flow.collect_swarm_metrics(&session_id).await
        .map_err(|e| format!("Failed to collect swarm metrics: {}", e))
}

/// Health check for AI orchestration services
#[command]
pub async fn ai_orchestration_health_check(
    state: State<'_, AiOrchestrationState>,
) -> Result<serde_json::Value, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    
    match service.health_check().await {
        Ok(health_status) => {
            let health_json = serde_json::json!({
                "services": health_status,
                "memory_layer": "active",
                "orchestration": "ready",
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            Ok(health_json)
        },
        Err(e) => Err(format!("Health check failed: {}", e))
    }
}

/// Get AI orchestration capabilities and features
#[command]
pub async fn get_ai_orchestration_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "features": {
            "swarm_coordination": {
                "topologies": ["hierarchical", "mesh", "ring", "star", "adaptive"],
                "max_agents": 12,
                "strategies": ["balanced", "specialized", "adaptive", "collective_intelligence"]
            },
            "sparc_methodology": {
                "modes": ["specification", "pseudocode", "architecture", "refinement", "completion", "tdd_workflow", "integration"],
                "parallel_execution": true,
                "test_driven": true
            },
            "hive_mind": {
                "command_types": ["task_distribution", "collective_decision", "knowledge_sync", "emergent_behavior", "consensus_build", "adaptive_response"],
                "coordination_levels": ["individual", "pair_wise", "group_wise", "swarm_wide", "collective_intelligence"]
            },
            "memory_layer": {
                "namespace": "autodev-ai",
                "persistence": true,
                "cross_session": true,
                "ttl_support": true
            }
        },
        "status": "active",
        "version": "1.0.0",
        "roadmap_steps": ["327: Swarm Command Wrapper", "328: SPARC Modi Integration", "329: Hive-Mind Command Integration", "330: Memory Layer Persistence"]
    }))
}

/// Execute comprehensive AI workflow combining all orchestration features
#[command]
pub async fn execute_comprehensive_ai_workflow(
    task_description: String,
    enable_swarm: bool,
    sparc_mode: Option<SparcMode>,
    hive_commands: Vec<HiveMindCommand>,
    memory_context: Option<String>,
    state: State<'_, AiOrchestrationState>,
) -> Result<serde_json::Value, String> {
    let service = state.service.lock().map_err(|e| e.to_string())?;
    let session_id = Uuid::new_v4().to_string();
    
    let swarm_config = if enable_swarm {
        Some(SwarmConfig {
            topology: crate::orchestration::SwarmTopology::Adaptive,
            max_agents: 8,
            strategy: crate::orchestration::CoordinationStrategy::CollectiveIntelligence,
            memory_persistence: true,
        })
    } else {
        None
    };
    
    let request = ExecutionRequest {
        id: session_id.clone(),
        command: "Comprehensive AI Workflow".to_string(),
        prompt: task_description,
        language: None,
        context: Some("comprehensive_ai_workflow".to_string()),
        temperature: Some(0.7),
        swarm_config,
        sparc_mode,
        hive_mind_commands: hive_commands,
        memory_context,
    };
    
    match service.claude_flow.execute(request).await {
        Ok(response) => {
            Ok(serde_json::json!({
                "session_id": session_id,
                "success": response.success,
                "result": response.result,
                "execution_time": response.execution_time,
                "swarm_metrics": response.swarm_metrics,
                "memory_operations": response.memory_operations,
                "ai_orchestration": "complete",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        },
        Err(e) => Err(format!("Comprehensive AI workflow failed: {}", e))
    }
}