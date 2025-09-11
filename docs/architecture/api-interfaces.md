# AutoDev-AI API Interface Specifications

## API Architecture Overview

The AutoDev-AI Neural Bridge Platform exposes multiple API layers for different types of
interactions:

1. **Tauri Commands API** - Frontend ↔ Backend communication
2. **WebSocket API** - Real-time updates and streaming
3. **REST API** - External integrations and webhooks
4. **Plugin API** - Plugin development interface
5. **Container API** - Docker container management

## 1. Tauri Commands API

### Workflow Management Commands

```rust
// src-tauri/src/api/commands/workflow.rs

#[tauri::command]
pub async fn create_workflow(
    state: tauri::State<'_, AppState>,
    definition: WorkflowDefinition
) -> Result<WorkflowResponse, String> {
    // Creates a new workflow definition
}

#[tauri::command]
pub async fn list_workflows(
    state: tauri::State<'_, AppState>,
    filter: Option<WorkflowFilter>
) -> Result<Vec<WorkflowSummary>, String> {
    // Lists all workflows with optional filtering
}

#[tauri::command]
pub async fn get_workflow(
    state: tauri::State<'_, AppState>,
    workflow_id: String
) -> Result<WorkflowDetail, String> {
    // Retrieves detailed workflow information
}

#[tauri::command]
pub async fn update_workflow(
    state: tauri::State<'_, AppState>,
    workflow_id: String,
    updates: WorkflowUpdate
) -> Result<WorkflowResponse, String> {
    // Updates an existing workflow
}

#[tauri::command]
pub async fn delete_workflow(
    state: tauri::State<'_, AppState>,
    workflow_id: String
) -> Result<bool, String> {
    // Deletes a workflow
}
```

#### Data Structures

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub name: String,
    pub description: String,
    pub steps: Vec<WorkflowStep>,
    pub dependencies: HashMap<String, Vec<String>>,
    pub timeout: Option<u64>,
    pub retry_policy: RetryPolicy,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub step_type: StepType,
    pub ai_service: AIServiceType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub timeout: Option<u64>,
    pub retry_count: u32,
    pub condition: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum StepType {
    CodeGeneration,
    CodeReview,
    TaskOrchestration,
    DataProcessing,
    Custom(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum AIServiceType {
    ClaudeFlow,
    OpenAICodex,
    Plugin(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowResponse {
    pub id: String,
    pub status: WorkflowStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum WorkflowStatus {
    Draft,
    Active,
    Paused,
    Completed,
    Failed,
    Cancelled,
}
```

### Execution Management Commands

```rust
// src-tauri/src/api/commands/execution.rs

#[tauri::command]
pub async fn execute_workflow(
    state: tauri::State<'_, AppState>,
    workflow_id: String,
    inputs: HashMap<String, serde_json::Value>,
    options: ExecutionOptions
) -> Result<ExecutionResponse, String> {
    // Starts workflow execution
}

#[tauri::command]
pub async fn get_execution_status(
    state: tauri::State<'_, AppState>,
    execution_id: String
) -> Result<ExecutionStatus, String> {
    // Gets current execution status
}

#[tauri::command]
pub async fn get_execution_logs(
    state: tauri::State<'_, AppState>,
    execution_id: String,
    level: Option<LogLevel>,
    limit: Option<u32>
) -> Result<Vec<LogEntry>, String> {
    // Retrieves execution logs
}

#[tauri::command]
pub async fn cancel_execution(
    state: tauri::State<'_, AppState>,
    execution_id: String,
    reason: Option<String>
) -> Result<bool, String> {
    // Cancels a running execution
}

#[tauri::command]
pub async fn pause_execution(
    state: tauri::State<'_, AppState>,
    execution_id: String
) -> Result<bool, String> {
    // Pauses execution
}

#[tauri::command]
pub async fn resume_execution(
    state: tauri::State<'_, AppState>,
    execution_id: String
) -> Result<bool, String> {
    // Resumes paused execution
}
```

#### Data Structures

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionOptions {
    pub priority: Priority,
    pub max_parallel_steps: Option<u32>,
    pub notification_settings: NotificationSettings,
    pub resource_limits: Option<ResourceLimits>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResponse {
    pub execution_id: String,
    pub workflow_id: String,
    pub status: ExecutionStatus,
    pub started_at: String,
    pub estimated_completion: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionStatus {
    pub id: String,
    pub status: ExecutionState,
    pub progress: ExecutionProgress,
    pub current_step: Option<String>,
    pub steps_completed: u32,
    pub total_steps: u32,
    pub error: Option<ExecutionError>,
    pub started_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ExecutionState {
    Queued,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionProgress {
    pub percentage: f64,
    pub step_progress: HashMap<String, StepProgress>,
    pub estimated_time_remaining: Option<u64>,
}
```

### Container Management Commands

```rust
// src-tauri/src/api/commands/container.rs

#[tauri::command]
pub async fn list_containers(
    state: tauri::State<'_, AppState>,
    filter: Option<ContainerFilter>
) -> Result<Vec<ContainerInfo>, String> {
    // Lists all managed containers
}

#[tauri::command]
pub async fn create_container(
    state: tauri::State<'_, AppState>,
    config: ContainerConfig
) -> Result<ContainerResponse, String> {
    // Creates a new container
}

#[tauri::command]
pub async fn start_container(
    state: tauri::State<'_, AppState>,
    container_id: String
) -> Result<bool, String> {
    // Starts a container
}

#[tauri::command]
pub async fn stop_container(
    state: tauri::State<'_, AppState>,
    container_id: String,
    timeout: Option<u32>
) -> Result<bool, String> {
    // Stops a container
}

#[tauri::command]
pub async fn get_container_logs(
    state: tauri::State<'_, AppState>,
    container_id: String,
    lines: Option<u32>
) -> Result<Vec<String>, String> {
    // Gets container logs
}

#[tauri::command]
pub async fn get_container_stats(
    state: tauri::State<'_, AppState>,
    container_id: String
) -> Result<ContainerStats, String> {
    // Gets container resource usage statistics
}
```

#### Data Structures

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ContainerConfig {
    pub name: String,
    pub image: String,
    pub service_type: ServiceType,
    pub port_mappings: Vec<PortMapping>,
    pub environment: HashMap<String, String>,
    pub resource_limits: ResourceLimits,
    pub network_mode: NetworkMode,
    pub restart_policy: RestartPolicy,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ServiceType {
    ClaudeFlow,
    OpenAICodex,
    Database,
    Cache,
    Plugin(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortMapping {
    pub host_port: u16,
    pub container_port: u16,
    pub protocol: Protocol,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: ContainerStatus,
    pub service_type: ServiceType,
    pub ports: Vec<PortMapping>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub health_status: HealthStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ContainerStatus {
    Created,
    Running,
    Paused,
    Restarting,
    Removing,
    Exited,
    Dead,
}
```

### AI Service Commands

```rust
// src-tauri/src/api/commands/ai_service.rs

#[tauri::command]
pub async fn list_ai_services(
    state: tauri::State<'_, AppState>
) -> Result<Vec<AIServiceInfo>, String> {
    // Lists available AI services
}

#[tauri::command]
pub async fn get_ai_service_status(
    state: tauri::State<'_, AppState>,
    service_id: String
) -> Result<AIServiceStatus, String> {
    // Gets AI service status
}

#[tauri::command]
pub async fn execute_ai_operation(
    state: tauri::State<'_, AppState>,
    service_id: String,
    operation: AIOperation
) -> Result<AIOperationResult, String> {
    // Executes an AI operation
}

#[tauri::command]
pub async fn get_ai_service_capabilities(
    state: tauri::State<'_, AppState>,
    service_id: String
) -> Result<Vec<Capability>, String> {
    // Gets service capabilities
}
```

#### Data Structures

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct AIServiceInfo {
    pub id: String,
    pub name: String,
    pub service_type: AIServiceType,
    pub version: String,
    pub status: ServiceStatus,
    pub capabilities: Vec<Capability>,
    pub container_id: Option<String>,
    pub endpoint: String,
    pub health_check_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIOperation {
    pub operation_type: OperationType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub timeout: Option<u64>,
    pub priority: Priority,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum OperationType {
    CodeGeneration,
    CodeReview,
    TaskOrchestration,
    SwarmCreation,
    AgentSpawning,
    CustomOperation(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIOperationResult {
    pub operation_id: String,
    pub status: OperationStatus,
    pub result: serde_json::Value,
    pub metadata: HashMap<String, serde_json::Value>,
    pub execution_time: u64,
    pub tokens_used: Option<u64>,
}
```

## 2. WebSocket API

### Connection Management

```typescript
// src/services/websocket.ts

interface WebSocketConnectionConfig {
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

interface WebSocketMessage<T = any> {
  type: MessageType;
  id: string;
  timestamp: string;
  payload: T;
  source?: string;
}

enum MessageType {
  // Execution Updates
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_PROGRESS = 'execution_progress',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  EXECUTION_CANCELLED = 'execution_cancelled',

  // Container Updates
  CONTAINER_CREATED = 'container_created',
  CONTAINER_STARTED = 'container_started',
  CONTAINER_STOPPED = 'container_stopped',
  CONTAINER_ERROR = 'container_error',

  // AI Service Updates
  AI_SERVICE_READY = 'ai_service_ready',
  AI_SERVICE_BUSY = 'ai_service_busy',
  AI_SERVICE_ERROR = 'ai_service_error',

  // Log Streaming
  LOG_ENTRY = 'log_entry',
  ERROR_LOG = 'error_log',

  // System Updates
  SYSTEM_STATUS = 'system_status',
  RESOURCE_USAGE = 'resource_usage',

  // Heartbeat
  PING = 'ping',
  PONG = 'pong',
}
```

### Message Payloads

```typescript
// Execution Updates
interface ExecutionStartedPayload {
  execution_id: string;
  workflow_id: string;
  started_at: string;
  estimated_duration?: number;
}

interface ExecutionProgressPayload {
  execution_id: string;
  progress: {
    percentage: number;
    current_step: string;
    steps_completed: number;
    total_steps: number;
    estimated_time_remaining?: number;
  };
  step_updates: Array<{
    step_id: string;
    status: string;
    progress: number;
    result?: any;
  }>;
}

interface ExecutionCompletedPayload {
  execution_id: string;
  status: 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  completed_at: string;
  duration: number;
  metrics: {
    steps_executed: number;
    containers_used: number;
    total_tokens: number;
    cost?: number;
  };
}

// Container Updates
interface ContainerStatusPayload {
  container_id: string;
  status: ContainerStatus;
  service_type: string;
  health_status: HealthStatus;
  resource_usage?: {
    cpu_percent: number;
    memory_usage: number;
    memory_limit: number;
    network_rx: number;
    network_tx: number;
  };
}

// Log Streaming
interface LogEntryPayload {
  source: 'execution' | 'container' | 'system' | 'ai_service';
  source_id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// System Status
interface SystemStatusPayload {
  overall_status: 'healthy' | 'degraded' | 'down';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    last_check: string;
    response_time?: number;
  }>;
  resource_usage: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    active_containers: number;
    max_containers: number;
  };
}
```

### Subscription Management

```typescript
interface SubscriptionRequest {
  type: 'subscribe' | 'unsubscribe';
  topics: string[];
  filters?: Record<string, any>;
}

// Topic patterns
const TOPIC_PATTERNS = {
  // Execution topics
  EXECUTION_ALL: 'execution.*',
  EXECUTION_SPECIFIC: 'execution.{execution_id}.*',
  EXECUTION_PROGRESS: 'execution.{execution_id}.progress',

  // Container topics
  CONTAINER_ALL: 'container.*',
  CONTAINER_SPECIFIC: 'container.{container_id}.*',
  CONTAINER_LOGS: 'container.{container_id}.logs',

  // AI Service topics
  AI_SERVICE_ALL: 'ai_service.*',
  AI_SERVICE_SPECIFIC: 'ai_service.{service_id}.*',

  // System topics
  SYSTEM_STATUS: 'system.status',
  RESOURCE_USAGE: 'system.resources',
};
```

## 3. REST API

### Webhook Endpoints

```rust
// src-tauri/src/api/handlers/webhook.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubWebhookPayload {
    pub action: String,
    pub repository: Repository,
    pub pull_request: Option<PullRequest>,
    pub push: Option<PushEvent>,
    pub sender: User,
}

// POST /api/webhooks/github
pub async fn handle_github_webhook(
    headers: HeaderMap,
    Json(payload): Json<GitHubWebhookPayload>
) -> Result<Json<WebhookResponse>, StatusCode> {
    // Handle GitHub webhook events
    match payload.action.as_str() {
        "opened" => handle_pr_opened(payload).await,
        "synchronize" => handle_pr_updated(payload).await,
        "closed" => handle_pr_closed(payload).await,
        _ => Ok(Json(WebhookResponse::ignored())),
    }
}

// POST /api/webhooks/ai_service/{service_id}
pub async fn handle_ai_service_callback(
    Path(service_id): Path<String>,
    Json(result): Json<AIServiceResult>
) -> Result<Json<CallbackResponse>, StatusCode> {
    // Handle AI service completion callbacks
}
```

### External API Endpoints

```rust
// GET /api/v1/status
pub async fn get_system_status() -> Json<SystemStatus> {
    // Returns overall system health and status
}

// GET /api/v1/workflows
pub async fn list_workflows(
    Query(params): Query<WorkflowListParams>
) -> Result<Json<PaginatedResponse<WorkflowSummary>>, StatusCode> {
    // Lists workflows with pagination and filtering
}

// POST /api/v1/workflows/{id}/execute
pub async fn execute_workflow_api(
    Path(id): Path<String>,
    Json(request): Json<ExecutionRequest>
) -> Result<Json<ExecutionResponse>, StatusCode> {
    // Execute workflow via REST API
}

// GET /api/v1/executions/{id}/status
pub async fn get_execution_status_api(
    Path(id): Path<String>
) -> Result<Json<ExecutionStatus>, StatusCode> {
    // Get execution status via REST API
}
```

## 4. Plugin API

### Plugin Interface

```rust
// src-tauri/src/services/plugin_system/plugin_api.rs

#[async_trait]
pub trait AIServicePlugin: Send + Sync {
    // Plugin metadata
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn description(&self) -> &str;
    fn supported_operations(&self) -> Vec<OperationType>;

    // Lifecycle methods
    async fn initialize(&mut self, config: PluginConfig) -> Result<(), PluginError>;
    async fn shutdown(&mut self) -> Result<(), PluginError>;
    async fn health_check(&self) -> Result<HealthStatus, PluginError>;

    // Core functionality
    async fn execute_operation(
        &self,
        operation: Operation
    ) -> Result<OperationResult, PluginError>;

    // Configuration
    async fn get_configuration_schema(&self) -> Result<ConfigurationSchema, PluginError>;
    async fn validate_configuration(&self, config: &PluginConfig) -> Result<(), PluginError>;

    // Metrics and monitoring
    async fn get_metrics(&self) -> Result<PluginMetrics, PluginError>;
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginConfig {
    pub plugin_id: String,
    pub settings: HashMap<String, serde_json::Value>,
    pub resource_limits: ResourceLimits,
    pub container_config: Option<ContainerConfig>,
    pub environment_variables: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Operation {
    pub id: String,
    pub operation_type: OperationType,
    pub parameters: HashMap<String, serde_json::Value>,
    pub context: OperationContext,
    pub timeout: Option<Duration>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OperationResult {
    pub operation_id: String,
    pub status: OperationStatus,
    pub result: serde_json::Value,
    pub metadata: HashMap<String, serde_json::Value>,
    pub execution_time: Duration,
    pub resource_usage: ResourceUsage,
}
```

### Plugin Registration

```rust
// Plugin registration macro
#[plugin_main]
pub fn plugin_main() -> Box<dyn AIServicePlugin> {
    Box::new(MyCustomPlugin::new())
}

// Plugin manifest
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub license: String,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub keywords: Vec<String>,
    pub dependencies: HashMap<String, String>,
    pub supported_platforms: Vec<String>,
    pub minimum_autodev_version: String,
    pub configuration_schema: ConfigurationSchema,
    pub permissions: Vec<Permission>,
}
```

## 5. Container API

### Docker Integration

```rust
// src-tauri/src/infrastructure/docker/docker_api.rs

pub struct DockerAPI {
    client: Docker,
    network_name: String,
    image_registry: ImageRegistry,
}

impl DockerAPI {
    pub async fn create_container(
        &self,
        config: ContainerCreateConfig
    ) -> Result<ContainerCreateResponse, DockerError> {
        // Creates a new container with specified configuration
    }

    pub async fn start_container(
        &self,
        container_id: &str
    ) -> Result<(), DockerError> {
        // Starts a container
    }

    pub async fn stop_container(
        &self,
        container_id: &str,
        timeout: Option<Duration>
    ) -> Result<(), DockerError> {
        // Stops a container gracefully
    }

    pub async fn get_container_info(
        &self,
        container_id: &str
    ) -> Result<ContainerInspectResponse, DockerError> {
        // Gets detailed container information
    }

    pub async fn get_container_logs(
        &self,
        container_id: &str,
        options: LogsOptions
    ) -> Result<LogStream, DockerError> {
        // Gets container logs as a stream
    }

    pub async fn get_container_stats(
        &self,
        container_id: &str
    ) -> Result<Stats, DockerError> {
        // Gets real-time container resource statistics
    }

    pub async fn execute_command(
        &self,
        container_id: &str,
        command: Vec<String>,
        options: ExecOptions
    ) -> Result<ExecResult, DockerError> {
        // Executes a command inside a container
    }
}
```

### Container Health Checks

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    pub test: Vec<String>,
    pub interval: Duration,
    pub timeout: Duration,
    pub retries: u32,
    pub start_period: Option<Duration>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum HealthStatus {
    Starting,
    Healthy,
    Unhealthy,
    Unknown,
}

impl DockerAPI {
    pub async fn configure_health_check(
        &self,
        container_id: &str,
        config: HealthCheckConfig
    ) -> Result<(), DockerError> {
        // Configures container health check
    }

    pub async fn get_health_status(
        &self,
        container_id: &str
    ) -> Result<HealthStatus, DockerError> {
        // Gets current health status
    }
}
```

## Error Handling

### API Error Types

```rust
#[derive(Debug, thiserror::Error, Serialize)]
pub enum APIError {
    #[error("Validation error: {message}")]
    ValidationError { message: String },

    #[error("Resource not found: {resource_type} with id {id}")]
    NotFound { resource_type: String, id: String },

    #[error("Permission denied: {action} on {resource}")]
    PermissionDenied { action: String, resource: String },

    #[error("Service unavailable: {service}")]
    ServiceUnavailable { service: String },

    #[error("Rate limit exceeded: {limit} requests per {window}")]
    RateLimitExceeded { limit: u32, window: String },

    #[error("Internal server error: {message}")]
    InternalError { message: String },

    #[error("Container error: {error}")]
    ContainerError { error: String },

    #[error("AI service error: {service} - {error}")]
    AIServiceError { service: String, error: String },
}

impl From<APIError> for String {
    fn from(error: APIError) -> Self {
        serde_json::to_string(&error).unwrap_or_else(|_| error.to_string())
    }
}
```

### Response Wrappers

```rust
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<APIError>,
    pub timestamp: String,
    pub request_id: String,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_previous: bool,
}
```

## Rate Limiting and Authentication

### Rate Limiting

```rust
#[derive(Debug, Clone)]
pub struct RateLimiter {
    redis_client: redis::Client,
    default_limits: RateLimits,
}

#[derive(Debug, Clone)]
pub struct RateLimits {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub requests_per_day: u32,
    pub concurrent_requests: u32,
}

impl RateLimiter {
    pub async fn check_rate_limit(
        &self,
        key: &str,
        limits: &RateLimits
    ) -> Result<RateLimitResult, RateLimitError> {
        // Check if request is within rate limits
    }
}
```

### Authentication Middleware

```rust
pub async fn auth_middleware(
    req: Request<Body>,
    next: Next<Body>
) -> Result<Response<Body>, StatusCode> {
    // Extract and validate authentication token
    let auth_header = req.headers().get("Authorization");
    let token = extract_bearer_token(auth_header)?;
    let claims = validate_token(&token)?;

    // Add user context to request
    req.extensions_mut().insert(UserContext::from(claims));

    Ok(next.run(req).await)
}
```

This comprehensive API specification provides clear interfaces for all components of the AutoDev-AI
Neural Bridge Platform, ensuring type safety, proper error handling, and extensibility for future
enhancements.
