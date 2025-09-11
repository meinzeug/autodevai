# AutoDev-AI Neural Bridge Platform - API Documentation

## Overview

This document provides comprehensive API documentation for the AutoDev-AI Neural Bridge Platform
Tauri backend. The backend is built in Rust and provides command handlers that can be invoked from
the frontend via Tauri's IPC system.

## Table of Contents

1. [Core System Commands](#core-system-commands)
2. [AI Orchestration Commands](#ai-orchestration-commands)
3. [Enhanced AI Commands](#enhanced-ai-commands)
4. [Security Commands](#security-commands)
5. [Performance Commands](#performance-commands)
6. [Window Management Commands](#window-management-commands)
7. [Application Management Commands](#application-management-commands)
8. [Event System Commands](#event-system-commands)
9. [Data Types](#data-types)
10. [Error Handling](#error-handling)

## Core System Commands

### `greet(name: string): string`

Simple greeting command for testing IPC communication.

**Parameters:**

- `name` (string): Name to greet

**Returns:**

- String with greeting message

**Example:**

```typescript
const greeting = await invoke('greet', { name: 'World' });
// Returns: "Hello, World! AutoDev-AI Neural Bridge Platform is ready."
```

### `get_system_info(): SystemInfo`

Retrieves comprehensive system information including platform details and version information.

**Returns:**

- `SystemInfo` object containing:
  - `platform`: Operating system name
  - `arch`: System architecture
  - `version`: Application version
  - `tauri_version`: Tauri framework version
  - `rust_version`: Rust compiler version
  - `build_date`: Build timestamp

**Example:**

```typescript
const info = await invoke('get_system_info');
console.log(info.platform); // "linux", "windows", or "darwin"
```

### `emergency_shutdown()`

Performs emergency application shutdown with a 500ms delay.

**Returns:**

- `Result<(), string>` - Success or error message

**Example:**

```typescript
await invoke('emergency_shutdown');
```

## AI Orchestration Commands

### `initialize_swarm(swarm_config: SwarmConfig): Result<string, string>`

Initializes an AI orchestration swarm with the specified configuration.

**Parameters:**

- `swarm_config` (SwarmConfig): Configuration for the swarm
  - `topology`: Swarm topology type (`"hierarchical"`, `"mesh"`, `"ring"`, `"star"`, `"adaptive"`)
  - `max_agents`: Maximum number of agents (1-12)
  - `strategy`: Coordination strategy (`"balanced"`, `"specialized"`, `"adaptive"`,
    `"collective_intelligence"`)
  - `memory_persistence`: Enable persistent memory across sessions

**Returns:**

- Success: Session ID string
- Error: Error message string

**Example:**

```typescript
const config = {
  topology: 'hierarchical',
  max_agents: 6,
  strategy: 'adaptive',
  memory_persistence: true,
};
const sessionId = await invoke('initialize_swarm', { swarmConfig: config });
```

### `execute_sparc_mode(prompt: string, mode: SparcMode, swarm_enabled: boolean): Result<ExecutionResponse, string>`

Executes SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology.

**Parameters:**

- `prompt` (string): Task description or prompt
- `mode` (SparcMode): SPARC mode to execute
  - `"Specification"`: Requirements analysis
  - `"Pseudocode"`: Algorithm design
  - `"Architecture"`: System design
  - `"Refinement"`: Implementation refinement
  - `"Completion"`: Final implementation
  - `"TddWorkflow"`: Test-driven development
  - `"Integration"`: Integration phase
- `swarm_enabled` (boolean): Enable swarm coordination

**Returns:**

- `ExecutionResponse` object containing execution results

**Example:**

```typescript
const response = await invoke('execute_sparc_mode', {
  prompt: 'Create a REST API for user management',
  mode: 'Specification',
  swarmEnabled: true,
});
```

### `process_hive_mind_command(command: HiveMindCommand): Result<string, string>`

Processes hive-mind coordination commands for collective intelligence.

**Parameters:**

- `command` (HiveMindCommand): Hive-mind command
  - `id`: Unique command identifier
  - `command_type`: Type of coordination
    - `"TaskDistribution"`: Distribute tasks across agents
    - `"CollectiveDecision"`: Make collective decisions
    - `"KnowledgeSync"`: Synchronize knowledge bases
    - `"EmergentBehavior"`: Enable emergent behaviors
    - `"ConsensusBuild"`: Build consensus
    - `"AdaptiveResponse"`: Adaptive response mechanisms

**Returns:**

- Success message or error string

**Example:**

```typescript
const command = {
  id: 'cmd_001',
  command_type: 'TaskDistribution',
  payload: { task: 'Analyze requirements' },
};
const result = await invoke('process_hive_mind_command', { command });
```

### `store_memory(key: string, value: string, tags: string[], ttl_seconds?: number): Result<string, string>`

Stores data in the persistent memory layer.

**Parameters:**

- `key` (string): Memory key identifier
- `value` (string): Data to store
- `tags` (string[]): Tags for categorization
- `ttl_seconds` (number, optional): Time-to-live in seconds

**Returns:**

- Success confirmation or error message

**Example:**

```typescript
await invoke('store_memory', {
  key: 'user_preferences',
  value: JSON.stringify({ theme: 'dark' }),
  tags: ['ui', 'settings'],
  ttlSeconds: 3600,
});
```

### `retrieve_memory(key: string): Result<string, string>`

Retrieves data from the persistent memory layer.

**Parameters:**

- `key` (string): Memory key identifier

**Returns:**

- Stored value or error message

**Example:**

```typescript
const value = await invoke('retrieve_memory', { key: 'user_preferences' });
const preferences = JSON.parse(value);
```

### `get_memory_state(): Result<MemoryState, string>`

Gets the current state of the memory layer.

**Returns:**

- `MemoryState` object with memory statistics

### `get_swarm_metrics(session_id: string): Result<SwarmMetrics, string>`

Retrieves performance metrics for an active swarm session.

**Parameters:**

- `session_id` (string): Swarm session identifier

**Returns:**

- `SwarmMetrics` object with performance data

### `ai_orchestration_health_check(): Result<HealthStatus, string>`

Performs health check on AI orchestration services.

**Returns:**

- `HealthStatus` object with service status information

## Enhanced AI Commands

### `execute_enhanced_ai_request(request: EnhancedAiRequest): Result<EnhancedAiResponse, string>`

Executes enhanced AI requests with smart routing and optimization.

**Parameters:**

- `request` (EnhancedAiRequest): Enhanced AI request configuration

### `initialize_enhanced_orchestration(config: EnhancedOrchestrationConfig): Result<string, string>`

Initializes enhanced orchestration with advanced configurations.

### `execute_adaptive_workflow(workflow: AdaptiveWorkflow): Result<WorkflowResult, string>`

Executes adaptive workflows that can modify themselves based on results.

### `get_enhanced_system_status(): Result<EnhancedSystemStatus, string>`

Gets comprehensive system status including AI services and performance metrics.

### `get_optimization_recommendations(): Result<OptimizationRecommendation[], string>`

Analyzes system performance and provides optimization recommendations.

### `execute_with_smart_routing(request: SmartRoutingRequest): Result<SmartRoutingResponse, string>`

Executes requests with intelligent routing based on current system load and capabilities.

### `get_performance_metrics(): Result<PerformanceMetrics, string>`

Retrieves detailed performance metrics for the entire system.

### `configure_enhanced_orchestration(config: EnhancedOrchestrationConfig): Result<(), string>`

Updates the configuration for enhanced orchestration features.

### `get_enhanced_capabilities(): Result<EnhancedCapabilities, string>`

Lists all available enhanced AI capabilities and their current status.

### `get_openrouter_models(): Result<OpenRouterModel[], string>`

Retrieves available models from OpenRouter API integration.

### `test_enhanced_orchestration(): Result<TestResult, string>`

Runs comprehensive tests on enhanced orchestration functionality.

## Security Commands

### `create_security_session(config: SecurityConfig): Result<string, string>`

Creates a new security session with specified configuration.

### `validate_ipc_command(command: string, params: Value): Result<boolean, string>`

Validates IPC commands for security compliance.

### `get_security_stats(): Result<SecurityStats, string>`

Retrieves security statistics and metrics.

### Enhanced Security Commands

### `validate_ipc_command_enhanced(command: string, params: Value, context: SecurityContext): Result<ValidationResult, string>`

Enhanced IPC command validation with context awareness.

### `create_enhanced_security_session(config: EnhancedSecurityConfig): Result<string, string>`

Creates enhanced security session with advanced features.

### `get_enhanced_security_stats(): Result<EnhancedSecurityStats, string>`

Retrieves comprehensive security statistics.

### `flush_security_logs(): Result<(), string>`

Flushes security audit logs to persistent storage.

### `cleanup_security_data(): Result<(), string>`

Cleans up expired security data and sessions.

## Performance Commands

### Performance Monitoring

### `get_performance_metrics(): Result<PerformanceMetrics, string>`

Retrieves comprehensive performance metrics.

### `get_optimization_recommendations(): Result<OptimizationRecommendation[], string>`

Analyzes performance and provides optimization suggestions.

### `configure_performance(config: PerformanceConfig): Result<(), string>`

Updates performance monitoring configuration.

## Window Management Commands

### `save_current_window_state(window_label: string): Result<(), string>`

Saves the current window state for the specified window.

### `get_window_states(): Result<WindowState[], string>`

Retrieves all saved window states.

### `get_window_state_stats(): Result<WindowStateStats, string>`

Gets statistics about window state management.

### `restore_window_state_command(window_label: string): Result<(), string>`

Restores window state for the specified window.

### `get_last_focused_window(): Result<string, string>`

Returns the label of the last focused window.

### `cleanup_window_focus_tracker(): Result<(), string>`

Cleans up the window focus tracking data.

## Application Management Commands

### Setup and Configuration

### `get_setup_config(): Result<SetupConfig, string>`

Retrieves current application setup configuration.

### `update_setup_config(config: SetupConfig): Result<(), string>`

Updates application setup configuration.

### `save_window_state(window_label: string, state: WindowState): Result<(), string>`

Saves window state for a specific window.

### `get_window_state(window_label: string): Result<WindowState, string>`

Retrieves window state for a specific window.

### `restore_window_state(window_label: string): Result<(), string>`

Restores window state for a specific window.

### `set_auto_save_enabled(enabled: boolean): Result<(), string>`

Enables or disables automatic state saving.

### Updater Commands

### `check_for_updates(): Result<UpdateInfo, string>`

Checks for available application updates.

### `install_update(): Result<(), string>`

Installs pending application updates.

### `get_update_status(): Result<UpdateStatus, string>`

Gets current update status and progress.

### `get_update_config(): Result<UpdateConfig, string>`

Retrieves updater configuration.

### `update_update_config(config: UpdateConfig): Result<(), string>`

Updates updater configuration.

### `clear_pending_update(): Result<(), string>`

Clears any pending update operations.

### `restart_app(): Result<(), string>`

Restarts the application (typically after update).

## Event System Commands

### `emit_event(event_name: string, payload: Value): Result<(), string>`

Emits an event to the event system.

### `get_events(filter?: EventFilter): Result<Event[], string>`

Retrieves events from the event system.

### `subscribe_to_events(event_names: string[]): Result<string, string>`

Subscribes to specific events, returns subscription ID.

### `unsubscribe_from_events(subscription_id: string): Result<(), string>`

Unsubscribes from events using subscription ID.

### `get_event_stats(): Result<EventStats, string>`

Gets statistics about the event system.

### `clear_events(): Result<(), string>`

Clears the event history.

## Settings Management Commands

### `get_setting(key: string): Result<Value, string>`

Retrieves a specific setting value.

### `set_setting(key: string, value: Value): Result<(), string>`

Sets a specific setting value.

### `get_all_settings(): Result<Settings, string>`

Retrieves all application settings.

### `save_settings(): Result<(), string>`

Saves current settings to persistent storage.

### `reset_settings(): Result<(), string>`

Resets all settings to default values.

## Menu and Tray Commands

### Menu Commands

### `toggle_menu_visibility(): Result<(), string>`

Toggles application menu visibility.

### `get_menu_info(): Result<MenuInfo, string>`

Gets information about the current menu state.

### Tray Commands

### `show_from_tray(): Result<(), string>`

Shows the application window from system tray.

### `hide_to_tray(): Result<(), string>`

Hides the application window to system tray.

### `toggle_tray_visibility(): Result<(), string>`

Toggles system tray icon visibility.

### `get_tray_config(): Result<TrayConfig, string>`

Gets current system tray configuration.

### `update_tray_tooltip(tooltip: string): Result<(), string>`

Updates the system tray tooltip text.

### `get_tray_state(): Result<TrayState, string>`

Gets current system tray state.

### `update_tray_config(config: TrayConfig): Result<(), string>`

Updates system tray configuration.

## Development Commands

### `dev_toggle_devtools(): Result<(), string>`

Toggles developer tools for the current window.

### `dev_window_info(): Result<DevWindowInfo, string>`

Gets development information about the current window.

### `get_dev_window_config(): Result<DevWindowConfig, string>`

Gets development window configuration.

### `update_dev_window_config(config: DevWindowConfig): Result<(), string>`

Updates development window configuration.

## Data Types

### SwarmConfig

```typescript
interface SwarmConfig {
  topology: 'hierarchical' | 'mesh' | 'ring' | 'star' | 'adaptive';
  max_agents: number; // 1-12
  strategy: 'balanced' | 'specialized' | 'adaptive' | 'collective_intelligence';
  memory_persistence: boolean;
}
```

### SparcMode

```typescript
type SparcMode =
  | 'Specification'
  | 'Pseudocode'
  | 'Architecture'
  | 'Refinement'
  | 'Completion'
  | 'TddWorkflow'
  | 'Integration';
```

### HiveMindCommand

```typescript
interface HiveMindCommand {
  id: string;
  command_type:
    | 'TaskDistribution'
    | 'CollectiveDecision'
    | 'KnowledgeSync'
    | 'EmergentBehavior'
    | 'ConsensusBuild'
    | 'AdaptiveResponse';
  payload?: any;
}
```

### ExecutionResponse

```typescript
interface ExecutionResponse {
  success: boolean;
  result: string;
  execution_time: number;
  swarm_metrics?: SwarmMetrics;
  memory_operations?: number;
}
```

### MemoryState

```typescript
interface MemoryState {
  total_entries: number;
  memory_usage: number;
  active_sessions: number;
  namespace: string;
}
```

### SwarmMetrics

```typescript
interface SwarmMetrics {
  active_agents: number;
  completed_tasks: number;
  average_response_time: number;
  success_rate: number;
  memory_usage: number;
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  cache_hit_rate: number;
  average_response_time: number;
}
```

### SecurityStats

```typescript
interface SecurityStats {
  active_sessions: number;
  failed_validations: number;
  rate_limit_hits: number;
  audit_log_entries: number;
}
```

### CommandResponse

```typescript
interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}
```

## Error Handling

All commands return `Result<T, string>` types where:

- `T` is the success type
- `string` is the error message

Common error patterns:

- **Validation Errors**: Invalid parameters or configuration
- **Service Errors**: AI service unavailable or timeout
- **Security Errors**: Permission denied or validation failed
- **System Errors**: Resource exhaustion or system failure

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}
```

## Usage Examples

### Basic AI Orchestration Workflow

```typescript
// Initialize swarm
const config = {
  topology: 'hierarchical',
  max_agents: 6,
  strategy: 'adaptive',
  memory_persistence: true,
};
const sessionId = await invoke('initialize_swarm', { swarmConfig: config });

// Execute SPARC mode
const response = await invoke('execute_sparc_mode', {
  prompt: 'Create a REST API for user management',
  mode: 'Specification',
  swarmEnabled: true,
});

// Store results in memory
await invoke('store_memory', {
  key: `sparc_spec_${sessionId}`,
  value: JSON.stringify(response),
  tags: ['sparc', 'specification'],
  ttlSeconds: 3600,
});

// Get swarm metrics
const metrics = await invoke('get_swarm_metrics', { sessionId });
console.log(`Active agents: ${metrics.active_agents}`);
```

### Enhanced AI Workflow

```typescript
// Initialize enhanced orchestration
const enhancedConfig = {
  smart_routing: true,
  auto_optimization: true,
  performance_monitoring: true,
};
await invoke('initialize_enhanced_orchestration', { config: enhancedConfig });

// Execute enhanced AI request
const request = {
  prompt: 'Optimize database performance',
  model_preference: 'claude-3-sonnet',
  routing_strategy: 'performance',
  max_retries: 3,
};
const response = await invoke('execute_enhanced_ai_request', { request });

// Get optimization recommendations
const recommendations = await invoke('get_optimization_recommendations');
```

### Security and Performance Monitoring

```typescript
// Create security session
const securityConfig = {
  session_timeout: 3600,
  rate_limit: 100,
  audit_enabled: true,
};
const securitySession = await invoke('create_security_session', { config: securityConfig });

// Monitor performance
const metrics = await invoke('get_performance_metrics');
if (metrics.cpu_usage > 80) {
  const recommendations = await invoke('get_optimization_recommendations');
  console.log('High CPU usage detected, recommendations:', recommendations);
}

// Check security stats
const securityStats = await invoke('get_security_stats');
console.log(`Failed validations: ${securityStats.failed_validations}`);
```

## API Versioning

Current API version: **1.0.0**

The API follows semantic versioning:

- **Major version**: Breaking changes
- **Minor version**: New features, backward compatible
- **Patch version**: Bug fixes, backward compatible

## Rate Limiting

Commands are subject to rate limiting:

- **Default limit**: 100 requests per minute per session
- **Enhanced commands**: 50 requests per minute per session
- **Security commands**: 20 requests per minute per session

Rate limit headers are included in error responses when limits are exceeded.

## Authentication

All commands require a valid Tauri IPC session. Authentication is handled automatically by the Tauri
runtime, but additional security validation may be applied based on command sensitivity.

## Best Practices

1. **Error Handling**: Always handle both success and error cases
2. **Resource Management**: Clean up sessions and subscriptions when done
3. **Performance**: Use appropriate batch sizes for bulk operations
4. **Security**: Validate inputs before sending to commands
5. **Memory**: Monitor memory usage with persistent storage
6. **Monitoring**: Use performance metrics to optimize application behavior

---

For implementation details and source code documentation, see the generated Rust docs at
`target/doc/neural_bridge_platform/index.html` after running `cargo doc --open`.
