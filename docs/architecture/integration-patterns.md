# AutoDev-AI Integration Patterns

## Overview

The AutoDev-AI Neural Bridge Platform implements sophisticated integration patterns to seamlessly connect Claude-Flow, OpenAI Codex, and other AI services. These patterns ensure reliable, scalable, and maintainable integrations while providing a unified interface for diverse AI capabilities.

## Core Integration Patterns

### 1. Bridge Pattern for AI Services

The Bridge pattern separates the abstraction (AI operations) from implementation (specific AI services), allowing dynamic switching between different AI providers.

```rust
// src-tauri/src/core/ai_bridge/bridge_pattern.rs

#[async_trait]
pub trait AIServiceBridge: Send + Sync {
    async fn initialize(&mut self, config: ServiceConfig) -> Result<(), BridgeError>;
    async fn execute_operation(&self, operation: Operation) -> Result<OperationResult, BridgeError>;
    async fn health_check(&self) -> Result<HealthStatus, BridgeError>;
    async fn get_capabilities(&self) -> Result<Vec<Capability>, BridgeError>;
    async fn shutdown(&mut self) -> Result<(), BridgeError>;
}

pub struct AIBridgeManager {
    bridges: HashMap<ServiceType, Box<dyn AIServiceBridge>>,
    router: OperationRouter,
    load_balancer: ServiceLoadBalancer,
    circuit_breakers: HashMap<ServiceType, CircuitBreaker>,
}

impl AIBridgeManager {
    pub async fn execute_operation(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        // 1. Route operation to appropriate service
        let service_type = self.router.route_operation(&operation)?;
        
        // 2. Check circuit breaker
        let circuit_breaker = self.circuit_breakers.get(&service_type)
            .ok_or(BridgeError::ServiceNotFound)?;
        
        // 3. Execute with fault tolerance
        circuit_breaker.call(async {
            let bridge = self.bridges.get(&service_type)
                .ok_or(BridgeError::ServiceNotFound)?;
            
            bridge.execute_operation(operation).await
        }).await
    }
    
    pub async fn register_bridge(&mut self, service_type: ServiceType, bridge: Box<dyn AIServiceBridge>) {
        self.bridges.insert(service_type, bridge);
        self.circuit_breakers.insert(service_type, CircuitBreaker::new());
    }
}
```

### 2. Claude-Flow Integration Pattern

Claude-Flow integration follows a multi-agent orchestration pattern with swarm management.

```rust
// src-tauri/src/core/ai_bridge/claude_flow_bridge.rs

pub struct ClaudeFlowBridge {
    container_manager: Arc<ContainerManager>,
    swarm_registry: SwarmRegistry,
    agent_pool: AgentPool,
    task_orchestrator: TaskOrchestrator,
    websocket_client: WebSocketClient,
    mcp_client: MCPClient,
}

impl AIServiceBridge for ClaudeFlowBridge {
    async fn execute_operation(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        match operation.operation_type {
            OperationType::SwarmCreation => self.create_swarm(operation).await,
            OperationType::TaskOrchestration => self.orchestrate_task(operation).await,
            OperationType::AgentSpawning => self.spawn_agents(operation).await,
            OperationType::CodeGeneration => self.generate_code_with_swarm(operation).await,
            _ => Err(BridgeError::UnsupportedOperation),
        }
    }
}

impl ClaudeFlowBridge {
    async fn create_swarm(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        // 1. Parse swarm configuration
        let config: SwarmConfig = serde_json::from_value(operation.parameters["config"].clone())?;
        
        // 2. Allocate container resources
        let container_id = self.container_manager
            .create_container(ContainerConfig::claude_flow(&config))
            .await?;
        
        // 3. Wait for service readiness
        self.wait_for_service_ready(&container_id, Duration::from_secs(30)).await?;
        
        // 4. Initialize swarm via MCP
        let swarm_id = self.mcp_client
            .swarm_init(config.topology, config.max_agents, config.strategy)
            .await?;
        
        // 5. Register swarm in registry
        let swarm = Swarm::new(swarm_id.clone(), container_id, config);
        self.swarm_registry.register(swarm).await?;
        
        // 6. Setup WebSocket monitoring
        self.websocket_client
            .subscribe_to_swarm_events(&swarm_id)
            .await?;
        
        Ok(OperationResult::swarm_created(swarm_id))
    }
    
    async fn orchestrate_task(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        let task_def: TaskDefinition = serde_json::from_value(operation.parameters["task"].clone())?;
        
        // 1. Select appropriate swarm
        let swarm = self.swarm_registry.find_suitable_swarm(&task_def).await?;
        
        // 2. Decompose task into subtasks
        let subtasks = self.task_orchestrator.decompose_task(&task_def).await?;
        
        // 3. Assign agents to subtasks
        let assignments = self.agent_pool.assign_agents(&swarm.id, &subtasks).await?;
        
        // 4. Execute via MCP
        let task_id = self.mcp_client
            .task_orchestrate(&task_def, assignments)
            .await?;
        
        // 5. Monitor execution
        let execution_monitor = ExecutionMonitor::new(task_id.clone(), swarm.id.clone());
        tokio::spawn(async move {
            execution_monitor.monitor_until_completion().await;
        });
        
        Ok(OperationResult::task_started(task_id))
    }
    
    async fn spawn_agents(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        let agent_specs: Vec<AgentSpec> = serde_json::from_value(operation.parameters["agents"].clone())?;
        
        // 1. Validate agent specifications
        self.validate_agent_specs(&agent_specs)?;
        
        // 2. Select target swarm
        let swarm_id: String = operation.parameters["swarm_id"].as_str()
            .ok_or(BridgeError::MissingParameter("swarm_id"))?
            .to_string();
        
        // 3. Spawn agents via MCP
        let mut agent_ids = Vec::new();
        for spec in agent_specs {
            let agent_id = self.mcp_client
                .agent_spawn(spec.agent_type, spec.capabilities, spec.name)
                .await?;
            agent_ids.push(agent_id);
        }
        
        // 4. Register agents in pool
        self.agent_pool.register_agents(&swarm_id, &agent_ids).await?;
        
        Ok(OperationResult::agents_spawned(agent_ids))
    }
}

#[derive(Debug, Clone)]
pub struct SwarmConfig {
    pub topology: SwarmTopology,
    pub max_agents: u32,
    pub strategy: DistributionStrategy,
    pub resource_limits: ResourceLimits,
    pub persistence_config: Option<PersistenceConfig>,
}

#[derive(Debug, Clone)]
pub enum SwarmTopology {
    Mesh,
    Hierarchical,
    Ring,
    Star,
}

#[derive(Debug, Clone)]
pub enum DistributionStrategy {
    Balanced,
    Specialized,
    Adaptive,
}
```

### 3. OpenAI Codex Integration Pattern

OpenAI Codex integration follows a request-response pattern with intelligent caching and code analysis.

```rust
// src-tauri/src/core/ai_bridge/openai_codex_bridge.rs

pub struct OpenAICodexBridge {
    api_client: OpenAIClient,
    model_cache: ModelCache,
    code_analyzer: CodeAnalyzer,
    token_manager: TokenManager,
    response_enhancer: ResponseEnhancer,
}

impl AIServiceBridge for OpenAICodexBridge {
    async fn execute_operation(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        match operation.operation_type {
            OperationType::CodeGeneration => self.generate_code(operation).await,
            OperationType::CodeReview => self.review_code(operation).await,
            OperationType::CodeOptimization => self.optimize_code(operation).await,
            OperationType::CodeExplanation => self.explain_code(operation).await,
            _ => Err(BridgeError::UnsupportedOperation),
        }
    }
}

impl OpenAICodexBridge {
    async fn generate_code(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        let prompt: CodePrompt = serde_json::from_value(operation.parameters["prompt"].clone())?;
        
        // 1. Analyze prompt and context
        let analysis = self.code_analyzer.analyze_prompt(&prompt).await?;
        
        // 2. Check cache for similar requests
        if let Some(cached_result) = self.model_cache.get_similar(&prompt).await? {
            return Ok(OperationResult::code_generated(cached_result));
        }
        
        // 3. Prepare enhanced prompt with context
        let enhanced_prompt = self.enhance_prompt(&prompt, &analysis).await?;
        
        // 4. Check token limits and optimize if needed
        let optimized_prompt = self.token_manager
            .optimize_for_limits(&enhanced_prompt)
            .await?;
        
        // 5. Make API call
        let completion_request = CompletionRequest {
            model: "code-davinci-002".to_string(),
            prompt: optimized_prompt.text,
            max_tokens: optimized_prompt.max_tokens,
            temperature: prompt.creativity_level.unwrap_or(0.2),
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            stop: prompt.stop_sequences.clone(),
        };
        
        let response = self.api_client.create_completion(completion_request).await?;
        
        // 6. Post-process and validate generated code
        let generated_code = self.post_process_code(&response.choices[0].text).await?;
        let validation_result = self.validate_generated_code(&generated_code, &prompt).await?;
        
        // 7. Cache the result
        self.model_cache.store(&prompt, &generated_code).await?;
        
        // 8. Enhance response with additional metadata
        let enhanced_result = self.response_enhancer
            .enhance_code_result(&generated_code, &analysis, &validation_result)
            .await?;
        
        Ok(OperationResult::code_generated(enhanced_result))
    }
    
    async fn review_code(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        let code: String = operation.parameters["code"].as_str()
            .ok_or(BridgeError::MissingParameter("code"))?
            .to_string();
        
        let review_criteria: ReviewCriteria = serde_json::from_value(
            operation.parameters.get("criteria").cloned()
                .unwrap_or(serde_json::json!({}))
        )?;
        
        // 1. Analyze code structure and patterns
        let code_analysis = self.code_analyzer.analyze_code(&code).await?;
        
        // 2. Generate review prompt
        let review_prompt = self.create_review_prompt(&code, &review_criteria, &code_analysis).await?;
        
        // 3. Get AI review
        let review_response = self.api_client.create_completion(
            CompletionRequest::for_code_review(review_prompt)
        ).await?;
        
        // 4. Parse and structure review results
        let structured_review = self.parse_review_response(&review_response.choices[0].text).await?;
        
        // 5. Add automated checks
        let automated_checks = self.run_automated_checks(&code).await?;
        
        // 6. Combine AI and automated results
        let comprehensive_review = CodeReview {
            ai_review: structured_review,
            automated_checks,
            overall_score: self.calculate_overall_score(&structured_review, &automated_checks),
            recommendations: self.generate_recommendations(&code_analysis).await?,
        };
        
        Ok(OperationResult::code_reviewed(comprehensive_review))
    }
    
    async fn enhance_prompt(&self, prompt: &CodePrompt, analysis: &PromptAnalysis) -> Result<EnhancedPrompt, BridgeError> {
        let mut enhanced = prompt.clone();
        
        // Add context based on programming language
        if let Some(language) = &analysis.detected_language {
            enhanced.context.insert("language".to_string(), language.clone());
            enhanced.context.insert("best_practices".to_string(), 
                self.get_language_best_practices(language).await?);
        }
        
        // Add relevant code examples
        if let Some(examples) = self.get_relevant_examples(&analysis.intent).await? {
            enhanced.context.insert("examples".to_string(), examples);
        }
        
        // Add project context if available
        if let Some(project_context) = &prompt.project_context {
            enhanced.context.insert("project_structure".to_string(), 
                self.analyze_project_structure(project_context).await?);
        }
        
        Ok(enhanced)
    }
}

#[derive(Debug, Clone)]
pub struct CodePrompt {
    pub text: String,
    pub language: Option<String>,
    pub context: HashMap<String, String>,
    pub requirements: Vec<String>,
    pub constraints: Vec<String>,
    pub creativity_level: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
    pub project_context: Option<ProjectContext>,
}

#[derive(Debug, Clone)]
pub struct CodeReview {
    pub ai_review: StructuredReview,
    pub automated_checks: AutomatedChecks,
    pub overall_score: f32,
    pub recommendations: Vec<Recommendation>,
}
```

### 4. Plugin Integration Pattern

The plugin system uses a dynamic loading pattern with standardized interfaces.

```rust
// src-tauri/src/core/plugins/plugin_integration.rs

pub struct PluginIntegrationManager {
    plugin_loader: DynamicPluginLoader,
    plugin_registry: PluginRegistry,
    sandbox_manager: PluginSandboxManager,
    config_manager: PluginConfigManager,
    metrics_collector: PluginMetricsCollector,
}

impl PluginIntegrationManager {
    pub async fn load_plugin(&mut self, plugin_path: &Path) -> Result<PluginHandle, PluginError> {
        // 1. Validate plugin manifest
        let manifest = self.validate_plugin_manifest(plugin_path).await?;
        
        // 2. Check compatibility
        self.check_compatibility(&manifest)?;
        
        // 3. Create sandbox environment
        let sandbox = self.sandbox_manager.create_sandbox(&manifest).await?;
        
        // 4. Load plugin in sandbox
        let plugin = self.plugin_loader.load_plugin_in_sandbox(plugin_path, &sandbox).await?;
        
        // 5. Initialize plugin
        let config = self.config_manager.get_plugin_config(&manifest.name).await?;
        plugin.initialize(config).await?;
        
        // 6. Register plugin
        let handle = PluginHandle::new(manifest.name.clone(), plugin, sandbox);
        self.plugin_registry.register(handle.clone()).await?;
        
        // 7. Start monitoring
        self.metrics_collector.start_monitoring(&handle).await?;
        
        Ok(handle)
    }
    
    pub async fn execute_plugin_operation(
        &self,
        plugin_name: &str,
        operation: Operation
    ) -> Result<OperationResult, PluginError> {
        let handle = self.plugin_registry.get(plugin_name)
            .ok_or(PluginError::PluginNotFound)?;
        
        // Execute in sandbox with timeout and resource limits
        let result = self.sandbox_manager.execute_with_limits(
            &handle.sandbox,
            async { handle.plugin.execute_operation(operation).await },
            Duration::from_secs(300) // 5-minute timeout
        ).await?;
        
        // Record metrics
        self.metrics_collector.record_execution(&handle, &result).await?;
        
        Ok(result)
    }
}

pub struct PluginSandboxManager {
    container_manager: Arc<ContainerManager>,
    security_policies: SecurityPolicies,
    resource_limits: ResourceLimits,
}

impl PluginSandboxManager {
    pub async fn create_sandbox(&self, manifest: &PluginManifest) -> Result<PluginSandbox, SandboxError> {
        // 1. Create isolated container
        let container_config = ContainerConfig {
            image: "autodev/plugin-runtime:latest".to_string(),
            name: format!("plugin-{}", manifest.name),
            resource_limits: self.calculate_resource_limits(manifest),
            network_mode: NetworkMode::Bridge,
            security_options: self.get_security_options(manifest),
            environment: self.prepare_environment(manifest),
        };
        
        let container_id = self.container_manager.create_container(container_config).await?;
        
        // 2. Setup filesystem isolation
        self.setup_filesystem_isolation(&container_id, manifest).await?;
        
        // 3. Configure network restrictions
        self.configure_network_restrictions(&container_id, manifest).await?;
        
        Ok(PluginSandbox::new(container_id, manifest.clone()))
    }
    
    pub async fn execute_with_limits<F, R>(
        &self,
        sandbox: &PluginSandbox,
        operation: F,
        timeout: Duration
    ) -> Result<R, SandboxError>
    where
        F: Future<Output = Result<R, Box<dyn std::error::Error + Send + Sync>>>,
    {
        // Monitor resource usage during execution
        let resource_monitor = ResourceMonitor::new(&sandbox.container_id);
        let monitor_handle = tokio::spawn(async move {
            resource_monitor.monitor_continuously().await
        });
        
        // Execute with timeout
        let result = tokio::time::timeout(timeout, operation).await
            .map_err(|_| SandboxError::ExecutionTimeout)?;
        
        // Stop monitoring
        monitor_handle.abort();
        
        result.map_err(|e| SandboxError::ExecutionFailed(e.to_string()))
    }
}
```

### 5. Event-Driven Integration Pattern

All services communicate through an event-driven architecture for loose coupling.

```rust
// src-tauri/src/core/events/event_integration.rs

pub struct EventDrivenIntegrationManager {
    event_bus: EventBus,
    event_handlers: HashMap<EventType, Vec<Box<dyn EventHandler>>>,
    event_store: EventStore,
    subscription_manager: SubscriptionManager,
}

#[derive(Debug, Clone)]
pub struct Event {
    pub id: String,
    pub event_type: EventType,
    pub source: String,
    pub payload: serde_json::Value,
    pub timestamp: SystemTime,
    pub correlation_id: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum EventType {
    // AI Service Events
    AIServiceStarted,
    AIServiceStopped,
    AIOperationCompleted,
    AIOperationFailed,
    
    // Container Events
    ContainerCreated,
    ContainerStarted,
    ContainerStopped,
    ContainerHealthChanged,
    
    // Workflow Events
    WorkflowStarted,
    WorkflowCompleted,
    WorkflowFailed,
    WorkflowStepCompleted,
    
    // System Events
    SystemResourceAlert,
    SystemHealthChanged,
    ConfigurationChanged,
}

#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle_event(&self, event: Event) -> Result<(), EventHandlerError>;
    fn supported_events(&self) -> Vec<EventType>;
    fn handler_name(&self) -> &str;
}

impl EventDrivenIntegrationManager {
    pub async fn publish_event(&self, event: Event) -> Result<(), EventError> {
        // 1. Store event for audit trail
        self.event_store.store(&event).await?;
        
        // 2. Find all handlers for this event type
        let handlers = self.event_handlers.get(&event.event_type)
            .unwrap_or(&Vec::new());
        
        // 3. Execute handlers concurrently
        let handler_futures: Vec<_> = handlers.iter()
            .map(|handler| handler.handle_event(event.clone()))
            .collect();
        
        let results = futures::future::join_all(handler_futures).await;
        
        // 4. Handle any failures
        for (index, result) in results.iter().enumerate() {
            if let Err(error) = result {
                tracing::error!(
                    "Event handler {} failed for event {}: {}",
                    handlers[index].handler_name(),
                    event.id,
                    error
                );
            }
        }
        
        // 5. Publish to event bus for external subscribers
        self.event_bus.publish(event).await?;
        
        Ok(())
    }
    
    pub async fn subscribe_to_events(
        &mut self,
        event_types: Vec<EventType>,
        handler: Box<dyn EventHandler>
    ) -> Result<SubscriptionId, EventError> {
        let subscription_id = Uuid::new_v4().to_string();
        
        for event_type in event_types {
            self.event_handlers.entry(event_type)
                .or_insert_with(Vec::new)
                .push(handler.clone());
        }
        
        self.subscription_manager.register_subscription(
            subscription_id.clone(),
            handler.handler_name().to_string()
        ).await?;
        
        Ok(subscription_id)
    }
}

// Example: Claude-Flow Event Handler
pub struct ClaudeFlowEventHandler {
    bridge: Arc<ClaudeFlowBridge>,
    notification_service: NotificationService,
}

#[async_trait]
impl EventHandler for ClaudeFlowEventHandler {
    async fn handle_event(&self, event: Event) -> Result<(), EventHandlerError> {
        match event.event_type {
            EventType::AIOperationCompleted => {
                self.handle_operation_completed(event).await
            }
            EventType::ContainerHealthChanged => {
                self.handle_container_health_change(event).await
            }
            _ => Ok(()), // Ignore unsupported events
        }
    }
    
    fn supported_events(&self) -> Vec<EventType> {
        vec![
            EventType::AIOperationCompleted,
            EventType::ContainerHealthChanged,
            EventType::WorkflowStepCompleted,
        ]
    }
    
    fn handler_name(&self) -> &str {
        "claude-flow-event-handler"
    }
}

impl ClaudeFlowEventHandler {
    async fn handle_operation_completed(&self, event: Event) -> Result<(), EventHandlerError> {
        let operation_result: OperationResult = serde_json::from_value(event.payload)?;
        
        // Update swarm state
        if let Some(swarm_id) = operation_result.metadata.get("swarm_id") {
            self.bridge.update_swarm_state(swarm_id, &operation_result).await?;
        }
        
        // Send notification
        self.notification_service.send_operation_completed_notification(
            &operation_result
        ).await?;
        
        Ok(())
    }
}
```

### 6. Adapter Pattern for Legacy Integrations

For integrating with existing systems that don't follow the standard interface.

```rust
// src-tauri/src/core/adapters/legacy_adapter.rs

pub struct LegacyServiceAdapter {
    legacy_client: LegacyAPIClient,
    protocol_translator: ProtocolTranslator,
    response_mapper: ResponseMapper,
}

#[async_trait]
impl AIServiceBridge for LegacyServiceAdapter {
    async fn execute_operation(&self, operation: Operation) -> Result<OperationResult, BridgeError> {
        // 1. Translate modern operation to legacy format
        let legacy_request = self.protocol_translator
            .translate_to_legacy(&operation)?;
        
        // 2. Execute legacy API call
        let legacy_response = self.legacy_client
            .execute_request(legacy_request)
            .await?;
        
        // 3. Map response back to modern format
        let modern_result = self.response_mapper
            .map_to_modern_result(legacy_response)?;
        
        Ok(modern_result)
    }
}

pub struct ProtocolTranslator {
    translation_rules: HashMap<OperationType, TranslationRule>,
}

impl ProtocolTranslator {
    pub fn translate_to_legacy(&self, operation: &Operation) -> Result<LegacyRequest, TranslationError> {
        let rule = self.translation_rules.get(&operation.operation_type)
            .ok_or(TranslationError::UnsupportedOperation)?;
        
        rule.apply(operation)
    }
}
```

### 7. Saga Pattern for Distributed Transactions

For managing complex workflows that span multiple AI services.

```rust
// src-tauri/src/core/orchestration/saga_pattern.rs

pub struct SagaOrchestrator {
    saga_store: SagaStore,
    step_executor: StepExecutor,
    compensation_handler: CompensationHandler,
    event_publisher: Arc<EventDrivenIntegrationManager>,
}

#[derive(Debug, Clone)]
pub struct Saga {
    pub id: String,
    pub steps: Vec<SagaStep>,
    pub compensation_steps: Vec<CompensationStep>,
    pub current_step: usize,
    pub status: SagaStatus,
    pub context: SagaContext,
}

#[derive(Debug, Clone)]
pub struct SagaStep {
    pub id: String,
    pub service: ServiceType,
    pub operation: Operation,
    pub timeout: Duration,
    pub retry_policy: RetryPolicy,
}

impl SagaOrchestrator {
    pub async fn execute_saga(&self, saga: Saga) -> Result<SagaResult, SagaError> {
        let mut current_saga = saga;
        
        // Execute steps sequentially
        for (index, step) in current_saga.steps.iter().enumerate() {
            current_saga.current_step = index;
            self.saga_store.update(&current_saga).await?;
            
            match self.execute_step(step, &current_saga.context).await {
                Ok(result) => {
                    current_saga.context.add_step_result(step.id.clone(), result);
                    
                    // Publish step completed event
                    self.event_publisher.publish_event(Event {
                        id: Uuid::new_v4().to_string(),
                        event_type: EventType::WorkflowStepCompleted,
                        source: "saga-orchestrator".to_string(),
                        payload: serde_json::to_value(&step)?,
                        timestamp: SystemTime::now(),
                        correlation_id: Some(current_saga.id.clone()),
                        metadata: HashMap::new(),
                    }).await?;
                }
                Err(error) => {
                    // Execute compensation for completed steps
                    current_saga.status = SagaStatus::Compensating;
                    self.saga_store.update(&current_saga).await?;
                    
                    self.execute_compensation(&current_saga, index).await?;
                    
                    current_saga.status = SagaStatus::Failed;
                    self.saga_store.update(&current_saga).await?;
                    
                    return Err(SagaError::StepFailed {
                        step_id: step.id.clone(),
                        error: error.to_string(),
                    });
                }
            }
        }
        
        current_saga.status = SagaStatus::Completed;
        self.saga_store.update(&current_saga).await?;
        
        Ok(SagaResult::success(current_saga.context))
    }
    
    async fn execute_compensation(&self, saga: &Saga, failed_step_index: usize) -> Result<(), SagaError> {
        // Execute compensation steps in reverse order
        for index in (0..failed_step_index).rev() {
            if let Some(compensation) = saga.compensation_steps.get(index) {
                self.compensation_handler.execute(compensation, &saga.context).await?;
            }
        }
        
        Ok(())
    }
}
```

## Integration Testing Patterns

### Contract Testing

```rust
// src-tauri/src/tests/integration/contract_tests.rs

#[cfg(test)]
mod contract_tests {
    use super::*;
    
    #[tokio::test]
    async fn test_claude_flow_contract() {
        let bridge = ClaudeFlowBridge::new_test_instance().await;
        
        // Test swarm creation contract
        let operation = Operation::swarm_creation(SwarmConfig::default());
        let result = bridge.execute_operation(operation).await.unwrap();
        
        assert!(matches!(result.status, OperationStatus::Success));
        assert!(result.result.get("swarm_id").is_some());
    }
    
    #[tokio::test]
    async fn test_openai_codex_contract() {
        let bridge = OpenAICodexBridge::new_test_instance().await;
        
        // Test code generation contract
        let operation = Operation::code_generation(CodePrompt::simple("Generate a hello world function"));
        let result = bridge.execute_operation(operation).await.unwrap();
        
        assert!(matches!(result.status, OperationStatus::Success));
        assert!(result.result.get("generated_code").is_some());
    }
}
```

These integration patterns ensure that the AutoDev-AI Neural Bridge Platform can seamlessly connect diverse AI services while maintaining reliability, scalability, and maintainability. The patterns provide clear abstractions, fault tolerance, and extensibility for future integrations.