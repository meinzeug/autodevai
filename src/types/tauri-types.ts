/**
 * TypeScript type definitions for AutoDev-AI Neural Bridge Platform Tauri Commands
 * 
 * This file contains all type definitions that match the Rust backend command interfaces.
 * These types ensure type safety when invoking Tauri commands from the frontend.
 * 
 * Generated for API version 1.0.0
 */

// import { InvokeArgs } from '@tauri-apps/api/core'; // Currently unused

// ============================================================================
// CORE SYSTEM TYPES
// ============================================================================

/**
 * System information response
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  tauri_version: string;
  rust_version: string;
  build_date: string;
}

/**
 * Standard command response wrapper
 */
export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}

// ============================================================================
// AI ORCHESTRATION TYPES
// ============================================================================

/**
 * Swarm topology types
 */
export type SwarmTopology = 
  | 'hierarchical'
  | 'mesh' 
  | 'ring'
  | 'star'
  | 'adaptive';

/**
 * Coordination strategy types
 */
export type CoordinationStrategy = 
  | 'balanced'
  | 'specialized'
  | 'adaptive'
  | 'collective_intelligence';

/**
 * Swarm configuration for AI orchestration
 */
export interface SwarmConfig {
  topology: SwarmTopology;
  max_agents: number; // 1-12
  strategy: CoordinationStrategy;
  memory_persistence: boolean;
}

/**
 * SPARC methodology modes
 */
export type SparcMode = 
  | 'Specification'
  | 'Pseudocode'
  | 'Architecture'
  | 'Refinement'
  | 'Completion'
  | 'TddWorkflow'
  | 'Integration';

/**
 * Hive-mind command types for collective intelligence
 */
export type HiveMindCommandType =
  | 'TaskDistribution'
  | 'CollectiveDecision'
  | 'KnowledgeSync'
  | 'EmergentBehavior'
  | 'ConsensusBuild'
  | 'AdaptiveResponse';

/**
 * Hive-mind command structure
 */
export interface HiveMindCommand {
  id: string;
  command_type: HiveMindCommandType;
  payload?: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
}

/**
 * Execution response from AI operations
 */
export interface ExecutionResponse {
  success: boolean;
  result: string;
  execution_time: number;
  swarm_metrics?: SwarmMetrics;
  memory_operations?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Memory state information
 */
export interface MemoryState {
  total_entries: number;
  memory_usage: number;
  active_sessions: number;
  namespace: string;
  last_cleanup: string;
  ttl_entries: number;
}

/**
 * Swarm performance metrics
 */
export interface SwarmMetrics {
  active_agents: number;
  completed_tasks: number;
  failed_tasks: number;
  average_response_time: number;
  success_rate: number;
  memory_usage: number;
  cpu_usage: number;
  network_requests: number;
}

/**
 * Dual mode request for AI orchestration
 */
export interface DualModeRequest {
  id: string;
  command: string;
  swarm_config?: SwarmConfig;
  sparc_mode?: SparcMode;
  temperature?: number;
  context?: string;
}

/**
 * Dual mode response
 */
export interface DualModeResponse {
  id: string;
  success: boolean;
  claude_flow_result?: string;
  codex_result?: string;
  orchestrated_result: string;
  execution_time: number;
  swarm_metrics?: SwarmMetrics;
}

// ============================================================================
// ENHANCED AI TYPES
// ============================================================================

/**
 * Enhanced AI request configuration
 */
export interface EnhancedAiRequest {
  prompt: string;
  model_preference?: string;
  routing_strategy?: 'performance' | 'quality' | 'cost' | 'balanced';
  max_retries?: number;
  timeout?: number;
  context?: Record<string, any>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Enhanced AI response
 */
export interface EnhancedAiResponse {
  result: string;
  model_used: string;
  execution_time: number;
  tokens_used: number;
  cost_estimate: number;
  confidence_score: number;
  routing_decision: string;
  metadata: Record<string, any>;
}

/**
 * Enhanced orchestration configuration
 */
export interface EnhancedOrchestrationConfig {
  smart_routing: boolean;
  auto_optimization: boolean;
  performance_monitoring: boolean;
  cost_optimization: boolean;
  quality_threshold: number;
  retry_strategy: 'exponential' | 'linear' | 'immediate';
  cache_enabled: boolean;
}

/**
 * Adaptive workflow configuration
 */
export interface AdaptiveWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  adaptation_rules: AdaptationRule[];
  success_criteria: SuccessCriteria;
  fallback_strategy: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'ai_request' | 'data_processing' | 'validation' | 'decision';
  configuration: Record<string, any>;
  dependencies: string[];
  timeout?: number;
}

/**
 * Adaptation rule for workflows
 */
export interface AdaptationRule {
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

/**
 * Success criteria for workflows
 */
export interface SuccessCriteria {
  quality_threshold: number;
  performance_threshold: number;
  cost_threshold: number;
  required_outputs: string[];
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  output: any;
  execution_time: number;
  steps_executed: number;
  adaptations_made: number;
  performance_metrics: PerformanceMetrics;
  cost_breakdown: CostBreakdown;
}

/**
 * Enhanced system status
 */
export interface EnhancedSystemStatus {
  overall_health: 'healthy' | 'degraded' | 'critical';
  ai_services: ServiceStatus[];
  performance: PerformanceMetrics;
  security: SecurityStatus;
  memory_usage: MemoryUsage;
  active_sessions: number;
}

/**
 * Service status information
 */
export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  response_time: number;
  error_rate: number;
  last_check: string;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  category: 'performance' | 'cost' | 'quality' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact_estimate: string;
  implementation_effort: 'low' | 'medium' | 'high';
  expected_benefit: string;
}

/**
 * Smart routing request
 */
export interface SmartRoutingRequest {
  prompt: string;
  requirements: RoutingRequirements;
  constraints: RoutingConstraints;
  preferences: RoutingPreferences;
}

/**
 * Routing requirements
 */
export interface RoutingRequirements {
  min_quality: number;
  max_latency: number;
  max_cost: number;
  required_capabilities: string[];
}

/**
 * Routing constraints
 */
export interface RoutingConstraints {
  excluded_models: string[];
  preferred_providers: string[];
  geographic_restrictions: string[];
  compliance_requirements: string[];
}

/**
 * Routing preferences
 */
export interface RoutingPreferences {
  optimization_goal: 'speed' | 'quality' | 'cost' | 'balanced';
  fallback_strategy: 'fail' | 'degrade' | 'retry';
  caching_preference: 'aggressive' | 'moderate' | 'minimal';
}

/**
 * Smart routing response
 */
export interface SmartRoutingResponse {
  result: string;
  routing_decision: RoutingDecision;
  execution_metrics: ExecutionMetrics;
  alternative_routes: AlternativeRoute[];
}

/**
 * Routing decision details
 */
export interface RoutingDecision {
  selected_model: string;
  selected_provider: string;
  decision_factors: Record<string, number>;
  confidence: number;
  reasoning: string;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  total_time: number;
  processing_time: number;
  queue_time: number;
  tokens_processed: number;
  cost_incurred: number;
}

/**
 * Alternative route information
 */
export interface AlternativeRoute {
  model: string;
  provider: string;
  estimated_quality: number;
  estimated_cost: number;
  estimated_time: number;
  availability: boolean;
}

/**
 * Enhanced capabilities
 */
export interface EnhancedCapabilities {
  ai_models: ModelCapability[];
  orchestration_features: string[];
  security_features: string[];
  performance_features: string[];
  integration_capabilities: string[];
}

/**
 * Model capability information
 */
export interface ModelCapability {
  name: string;
  provider: string;
  capabilities: string[];
  max_tokens: number;
  cost_per_1k_tokens: number;
  average_response_time: number;
  availability: boolean;
}

/**
 * OpenRouter model information
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: ModelPricing;
  context_length: number;
  architecture: ModelArchitecture;
  top_provider: ModelProvider;
  per_request_limits: RequestLimits;
}

/**
 * Model pricing information
 */
export interface ModelPricing {
  prompt: number;
  completion: number;
  request?: number;
  image?: number;
}

/**
 * Model architecture details
 */
export interface ModelArchitecture {
  tokenizer: string;
  instruct_type?: string;
  modality: 'text' | 'text+vision' | 'text+image' | 'multimodal';
}

/**
 * Model provider information
 */
export interface ModelProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

/**
 * Request limits for models
 */
export interface RequestLimits {
  prompt_tokens?: number;
  completion_tokens?: number;
}

/**
 * Test result for enhanced orchestration
 */
export interface TestResult {
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  execution_time: number;
  test_details: TestDetail[];
}

/**
 * Individual test detail
 */
export interface TestDetail {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  execution_time: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// SECURITY TYPES
// ============================================================================

/**
 * Security configuration
 */
export interface SecurityConfig {
  session_timeout: number;
  rate_limit: number;
  audit_enabled: boolean;
  encryption_enabled: boolean;
  ip_whitelist?: string[];
  allowed_commands?: string[];
}

/**
 * Enhanced security configuration
 */
export interface EnhancedSecurityConfig extends SecurityConfig {
  advanced_threat_detection: boolean;
  behavioral_analysis: boolean;
  anomaly_detection_threshold: number;
  auto_block_suspicious: boolean;
  security_headers: Record<string, string>;
}

/**
 * Security context for command validation
 */
export interface SecurityContext {
  session_id: string;
  user_agent: string;
  ip_address: string;
  timestamp: string;
  command_history: string[];
  risk_score: number;
}

/**
 * Validation result for security checks
 */
export interface ValidationResult {
  valid: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  violations: SecurityViolation[];
  recommendations: string[];
  requires_additional_auth: boolean;
}

/**
 * Security violation details
 */
export interface SecurityViolation {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Security statistics
 */
export interface SecurityStats {
  active_sessions: number;
  failed_validations: number;
  rate_limit_hits: number;
  audit_log_entries: number;
  blocked_requests: number;
  security_violations: number;
}

/**
 * Enhanced security statistics
 */
export interface EnhancedSecurityStats extends SecurityStats {
  threat_detections: number;
  anomaly_detections: number;
  behavior_analysis_alerts: number;
  auto_blocked_sessions: number;
  security_score: number;
}

/**
 * Security status
 */
export interface SecurityStatus {
  overall_status: 'secure' | 'warning' | 'critical';
  active_threats: number;
  recent_violations: SecurityViolation[];
  security_level: number;
  last_audit: string;
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

/**
 * Comprehensive performance metrics
 */
export interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  cache_hit_rate: number;
  average_response_time: number;
  requests_per_second: number;
  error_rate: number;
  uptime: number;
}

/**
 * Memory usage breakdown
 */
export interface MemoryUsage {
  total: number;
  used: number;
  free: number;
  cached: number;
  buffers: number;
  swap_used: number;
  swap_total: number;
}

/**
 * Cost breakdown for operations
 */
export interface CostBreakdown {
  total_cost: number;
  ai_model_costs: number;
  compute_costs: number;
  storage_costs: number;
  network_costs: number;
  breakdown_by_operation: Record<string, number>;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  monitoring_enabled: boolean;
  metrics_collection_interval: number;
  performance_alerts_enabled: boolean;
  auto_optimization_enabled: boolean;
  cache_size_limit: number;
  max_concurrent_requests: number;
}

// ============================================================================
// WINDOW MANAGEMENT TYPES
// ============================================================================

/**
 * Window state information
 */
export interface WindowState {
  label: string;
  position: WindowPosition;
  size: WindowSize;
  minimized: boolean;
  maximized: boolean;
  fullscreen: boolean;
  visible: boolean;
  always_on_top: boolean;
  resizable: boolean;
}

/**
 * Window position
 */
export interface WindowPosition {
  x: number;
  y: number;
}

/**
 * Window size
 */
export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Window state statistics
 */
export interface WindowStateStats {
  total_windows: number;
  active_windows: number;
  total_state_saves: number;
  total_state_restores: number;
  last_save_time: string;
  average_save_time: number;
}

// ============================================================================
// APPLICATION MANAGEMENT TYPES
// ============================================================================

/**
 * Setup configuration
 */
export interface SetupConfig {
  auto_save_enabled: boolean;
  save_interval: number;
  backup_enabled: boolean;
  debug_mode: boolean;
  telemetry_enabled: boolean;
  update_check_enabled: boolean;
}

/**
 * Update information
 */
export interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
  download_url: string;
  release_date: string;
  mandatory: boolean;
}

/**
 * Update status
 */
export interface UpdateStatus {
  checking: boolean;
  downloading: boolean;
  download_progress: number;
  installing: boolean;
  pending_restart: boolean;
  error?: string;
}

/**
 * Update configuration
 */
export interface UpdateConfig {
  auto_check: boolean;
  auto_download: boolean;
  auto_install: boolean;
  check_interval: number;
  beta_updates: boolean;
  notification_enabled: boolean;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

/**
 * Event structure
 */
export interface Event {
  id: string;
  name: string;
  payload: any;
  timestamp: string;
  source: string;
  processed: boolean;
}

/**
 * Event filter for querying events
 */
export interface EventFilter {
  event_names?: string[];
  sources?: string[];
  start_time?: string;
  end_time?: string;
  processed?: boolean;
  limit?: number;
}

/**
 * Event statistics
 */
export interface EventStats {
  total_events: number;
  events_per_hour: number;
  unique_event_types: number;
  active_subscriptions: number;
  processing_rate: number;
  average_processing_time: number;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

/**
 * Application settings structure
 */
export interface Settings {
  ui: UiSettings;
  performance: PerformanceSettings;
  security: SecuritySettings;
  ai: AiSettings;
  system: SystemSettings;
}

/**
 * UI settings
 */
export interface UiSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  font_size: number;
  animations_enabled: boolean;
  notifications_enabled: boolean;
}

/**
 * Performance settings
 */
export interface PerformanceSettings {
  cache_enabled: boolean;
  cache_size: number;
  max_concurrent_operations: number;
  request_timeout: number;
  retry_attempts: number;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  session_timeout: number;
  require_authentication: boolean;
  audit_logging: boolean;
  encryption_enabled: boolean;
  rate_limiting: boolean;
}

/**
 * AI settings
 */
export interface AiSettings {
  default_model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  retry_on_failure: boolean;
  cache_responses: boolean;
}

/**
 * System settings
 */
export interface SystemSettings {
  auto_start: boolean;
  minimize_to_tray: boolean;
  check_for_updates: boolean;
  telemetry_enabled: boolean;
  debug_logging: boolean;
}

// ============================================================================
// MENU AND TRAY TYPES
// ============================================================================

/**
 * Menu information
 */
export interface MenuInfo {
  visible: boolean;
  items: MenuItem[];
  last_updated: string;
}

/**
 * Menu item structure
 */
export interface MenuItem {
  id: string;
  label: string;
  enabled: boolean;
  visible: boolean;
  accelerator?: string;
  submenu?: MenuItem[];
}

/**
 * Tray configuration
 */
export interface TrayConfig {
  enabled: boolean;
  icon_path: string;
  tooltip: string;
  show_on_startup: boolean;
  close_to_tray: boolean;
  menu_items: TrayMenuItem[];
}

/**
 * Tray menu item
 */
export interface TrayMenuItem {
  id: string;
  label: string;
  enabled: boolean;
  action: string;
}

/**
 * Tray state
 */
export interface TrayState {
  visible: boolean;
  tooltip: string;
  icon_path: string;
  menu_visible: boolean;
  last_interaction: string;
}

// ============================================================================
// DEVELOPMENT TYPES
// ============================================================================

/**
 * Development window information
 */
export interface DevWindowInfo {
  devtools_open: boolean;
  window_id: string;
  url: string;
  debug_mode: boolean;
  console_logs: ConsoleLog[];
}

/**
 * Console log entry
 */
export interface ConsoleLog {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  source?: string;
}

/**
 * Development window configuration
 */
export interface DevWindowConfig {
  auto_open_devtools: boolean;
  console_log_level: 'all' | 'info' | 'warn' | 'error';
  enable_reload_on_change: boolean;
  show_performance_overlay: boolean;
}

// ============================================================================
// TAURI COMMAND INTERFACES
// ============================================================================

/**
 * All available Tauri commands with their parameter and return types
 */
export interface TauriCommands {
  // Core system commands
  greet: {
    args: { name: string };
    returns: string;
  };
  get_system_info: {
    args: Record<string, never>;
    returns: SystemInfo;
  };
  emergency_shutdown: {
    args: Record<string, never>;
    returns: void;
  };

  // AI Orchestration commands
  initialize_swarm: {
    args: { swarmConfig: SwarmConfig };
    returns: string;
  };
  execute_sparc_mode: {
    args: { 
      prompt: string; 
      mode: SparcMode; 
      swarmEnabled: boolean 
    };
    returns: ExecutionResponse;
  };
  process_hive_mind_command: {
    args: { command: HiveMindCommand };
    returns: string;
  };
  store_memory: {
    args: { 
      key: string; 
      value: string; 
      tags: string[]; 
      ttlSeconds?: number 
    };
    returns: string;
  };
  retrieve_memory: {
    args: { key: string };
    returns: string;
  };
  get_memory_state: {
    args: Record<string, never>;
    returns: MemoryState;
  };
  execute_ai_orchestrated_dual_mode: {
    args: { 
      prompt: string; 
      swarmConfig?: SwarmConfig; 
      sparcMode?: SparcMode 
    };
    returns: DualModeResponse;
  };
  get_swarm_metrics: {
    args: { sessionId: string };
    returns: SwarmMetrics;
  };
  ai_orchestration_health_check: {
    args: Record<string, never>;
    returns: any; // JSON value
  };
  get_ai_orchestration_info: {
    args: Record<string, never>;
    returns: any; // JSON value
  };
  execute_comprehensive_ai_workflow: {
    args: {
      taskDescription: string;
      enableSwarm: boolean;
      sparcMode?: SparcMode;
      hiveCommands: HiveMindCommand[];
      memoryContext?: string;
    };
    returns: any; // JSON value
  };

  // Enhanced AI commands
  execute_enhanced_ai_request: {
    args: { request: EnhancedAiRequest };
    returns: EnhancedAiResponse;
  };
  initialize_enhanced_orchestration: {
    args: { config: EnhancedOrchestrationConfig };
    returns: string;
  };
  execute_adaptive_workflow: {
    args: { workflow: AdaptiveWorkflow };
    returns: WorkflowResult;
  };
  get_enhanced_system_status: {
    args: Record<string, never>;
    returns: EnhancedSystemStatus;
  };
  get_optimization_recommendations: {
    args: Record<string, never>;
    returns: OptimizationRecommendation[];
  };
  execute_with_smart_routing: {
    args: { request: SmartRoutingRequest };
    returns: SmartRoutingResponse;
  };
  get_performance_metrics: {
    args: Record<string, never>;
    returns: PerformanceMetrics;
  };
  configure_enhanced_orchestration: {
    args: { config: EnhancedOrchestrationConfig };
    returns: void;
  };
  get_enhanced_capabilities: {
    args: Record<string, never>;
    returns: EnhancedCapabilities;
  };
  get_openrouter_models: {
    args: Record<string, never>;
    returns: OpenRouterModel[];
  };
  test_enhanced_orchestration: {
    args: Record<string, never>;
    returns: TestResult;
  };

  // Security commands
  create_security_session: {
    args: { config: SecurityConfig };
    returns: string;
  };
  validate_ipc_command: {
    args: { command: string; params: any };
    returns: boolean;
  };
  get_security_stats: {
    args: Record<string, never>;
    returns: SecurityStats;
  };
  validate_ipc_command_enhanced: {
    args: { 
      command: string; 
      params: any; 
      context: SecurityContext 
    };
    returns: ValidationResult;
  };
  create_enhanced_security_session: {
    args: { config: EnhancedSecurityConfig };
    returns: string;
  };
  get_enhanced_security_stats: {
    args: Record<string, never>;
    returns: EnhancedSecurityStats;
  };
  flush_security_logs: {
    args: Record<string, never>;
    returns: void;
  };
  cleanup_security_data: {
    args: Record<string, never>;
    returns: void;
  };
}

// ============================================================================
// UTILITY TYPES AND HELPERS
// ============================================================================

/**
 * Extract the argument type for a Tauri command
 */
export type TauriCommandArgs<T extends keyof TauriCommands> = 
  TauriCommands[T]['args'];

/**
 * Extract the return type for a Tauri command
 */
export type TauriCommandReturns<T extends keyof TauriCommands> = 
  TauriCommands[T]['returns'];

/**
 * Helper type for async Tauri command results
 */
export type TauriResult<T> = Promise<T>;

/**
 * Error result for failed Tauri commands
 */
export interface TauriError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Type-safe Tauri invoke function
 */
export declare function invoke<T extends keyof TauriCommands>(
  cmd: T,
  args: TauriCommandArgs<T>
): Promise<TauriCommandReturns<T>>;

// ============================================================================
// CONSTANTS AND ENUMS
// ============================================================================

/**
 * Available SPARC modes as constants
 */
export const SPARC_MODES = {
  SPECIFICATION: 'Specification' as const,
  PSEUDOCODE: 'Pseudocode' as const,
  ARCHITECTURE: 'Architecture' as const,
  REFINEMENT: 'Refinement' as const,
  COMPLETION: 'Completion' as const,
  TDD_WORKFLOW: 'TddWorkflow' as const,
  INTEGRATION: 'Integration' as const,
} as const;

/**
 * Available swarm topologies as constants
 */
export const SWARM_TOPOLOGIES = {
  HIERARCHICAL: 'hierarchical' as const,
  MESH: 'mesh' as const,
  RING: 'ring' as const,
  STAR: 'star' as const,
  ADAPTIVE: 'adaptive' as const,
} as const;

/**
 * Available coordination strategies as constants
 */
export const COORDINATION_STRATEGIES = {
  BALANCED: 'balanced' as const,
  SPECIALIZED: 'specialized' as const,
  ADAPTIVE: 'adaptive' as const,
  COLLECTIVE_INTELLIGENCE: 'collective_intelligence' as const,
} as const;

/**
 * Hive-mind command types as constants
 */
export const HIVE_MIND_COMMANDS = {
  TASK_DISTRIBUTION: 'TaskDistribution' as const,
  COLLECTIVE_DECISION: 'CollectiveDecision' as const,
  KNOWLEDGE_SYNC: 'KnowledgeSync' as const,
  EMERGENT_BEHAVIOR: 'EmergentBehavior' as const,
  CONSENSUS_BUILD: 'ConsensusBuild' as const,
  ADAPTIVE_RESPONSE: 'AdaptiveResponse' as const,
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validation functions for type safety
 */
export const validators = {
  isSparcMode: (value: string): value is SparcMode => 
    Object.values(SPARC_MODES).includes(value as SparcMode),
  
  isSwarmTopology: (value: string): value is SwarmTopology =>
    Object.values(SWARM_TOPOLOGIES).includes(value as SwarmTopology),
  
  isCoordinationStrategy: (value: string): value is CoordinationStrategy =>
    Object.values(COORDINATION_STRATEGIES).includes(value as CoordinationStrategy),
  
  isHiveMindCommandType: (value: string): value is HiveMindCommandType =>
    Object.values(HIVE_MIND_COMMANDS).includes(value as HiveMindCommandType),
  
  isValidSwarmConfig: (config: Partial<SwarmConfig>): config is SwarmConfig => {
    return (
      typeof config.topology === 'string' &&
      validators.isSwarmTopology(config.topology) &&
      typeof config.max_agents === 'number' &&
      config.max_agents >= 1 &&
      config.max_agents <= 12 &&
      typeof config.strategy === 'string' &&
      validators.isCoordinationStrategy(config.strategy) &&
      typeof config.memory_persistence === 'boolean'
    );
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export everything for convenience
export * from './tauri-types';

// Default export with all types
export default {
  // Types are not exported as values in TypeScript
  // but this provides a namespace for the module
  validators,
  SPARC_MODES,
  SWARM_TOPOLOGIES,
  COORDINATION_STRATEGIES,
  HIVE_MIND_COMMANDS,
};