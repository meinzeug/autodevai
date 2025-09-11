/**
 * TypeScript bindings for AI Orchestration features
 * Frontend access to Claude-Flow swarm integration, SPARC methodology,
 * hive-mind coordination, and memory layer persistence.
 */

// Schritt 327: Swarm Command Wrapper Types
export interface SwarmConfig {
  topology: SwarmTopology;
  max_agents: number;
  strategy: CoordinationStrategy;
  memory_persistence: boolean;
}

export enum SwarmTopology {
  Hierarchical = "Hierarchical",
  Mesh = "Mesh",
  Ring = "Ring",
  Star = "Star",
  Adaptive = "Adaptive",
}

export enum CoordinationStrategy {
  Balanced = "Balanced",
  Specialized = "Specialized",
  Adaptive = "Adaptive",
  CollectiveIntelligence = "CollectiveIntelligence",
}

export interface SwarmMetrics {
  active_agents: number;
  tasks_completed: number;
  avg_response_time: number; // Duration in milliseconds
  coordination_efficiency: number;
  collective_intelligence_score: number;
}

// Schritt 328: SPARC Modi Integration Types
export enum SparcMode {
  Specification = "Specification",
  Pseudocode = "Pseudocode",
  Architecture = "Architecture",
  Refinement = "Refinement",
  Completion = "Completion",
  TddWorkflow = "TddWorkflow",
  Integration = "Integration",
}

// Schritt 329: Hive-Mind Command Integration Types
export interface HiveMindCommand {
  id: string;
  command_type: HiveMindCommandType;
  target_agents: string[];
  coordination_level: CoordinationLevel;
  payload: Record<string, any>;
}

export enum HiveMindCommandType {
  TaskDistribution = "TaskDistribution",
  CollectiveDecision = "CollectiveDecision",
  KnowledgeSync = "KnowledgeSync",
  EmergentBehavior = "EmergentBehavior",
  ConsensusBuild = "ConsensusBuild",
  AdaptiveResponse = "AdaptiveResponse",
}

export enum CoordinationLevel {
  Individual = "Individual",
  PairWise = "PairWise",
  GroupWise = "GroupWise",
  SwarmWide = "SwarmWide",
  CollectiveIntelligence = "CollectiveIntelligence",
}

// Schritt 330: Memory Layer Persistence Types
export interface MemoryState {
  total_entries: number;
  memory_usage: number;
  hit_rate: number;
  active_sessions: number;
}

export interface MemoryOperation {
  operation_type: MemoryOperationType;
  key: string;
  success: boolean;
  timestamp: string; // ISO timestamp
}

export enum MemoryOperationType {
  Store = "Store",
  Retrieve = "Retrieve",
  Update = "Update",
  Delete = "Delete",
  Sync = "Sync",
  Restore = "Restore",
}

// Execution and Response Types
export interface ExecutionRequest {
  id: string;
  command: string;
  prompt: string;
  language?: string;
  context?: string;
  temperature?: number;
  swarm_config?: SwarmConfig;
  sparc_mode?: SparcMode;
  hive_mind_commands: HiveMindCommand[];
  memory_context?: string;
}

export interface ExecutionResponse {
  id: string;
  result?: string;
  success: boolean;
  execution_time: number;
  error?: string;
  metadata?: Record<string, any>;
  swarm_metrics?: SwarmMetrics;
  memory_operations: MemoryOperation[];
}

export interface DualModeRequest {
  id: string;
  command: string;
  swarm_config?: SwarmConfig;
  sparc_mode?: SparcMode;
}

export interface DualModeResponse {
  id: string;
  result: string;
  success: boolean;
  swarm_metrics?: SwarmMetrics;
  memory_state?: MemoryState;
}

// AI Orchestration Service Interface
export interface AiOrchestrationService {
  // Swarm Coordination (Schritt 327)
  initializeSwarm(config: SwarmConfig): Promise<string>;
  getSwarmMetrics(sessionId: string): Promise<SwarmMetrics>;
  
  // SPARC Methodology (Schritt 328)
  executeSparxMode(
    prompt: string,
    mode: SparcMode,
    swarmEnabled: boolean
  ): Promise<ExecutionResponse>;
  
  // Hive-Mind Commands (Schritt 329)
  processHiveMindCommand(command: HiveMindCommand): Promise<string>;
  
  // Memory Layer (Schritt 330)
  storeMemory(
    key: string,
    value: string,
    tags?: string[],
    ttlSeconds?: number
  ): Promise<string>;
  retrieveMemory(key: string): Promise<string>;
  getMemoryState(): Promise<MemoryState>;
  
  // Integrated Workflows
  executeAiOrchestratedDualMode(
    prompt: string,
    swarmConfig?: SwarmConfig,
    sparcMode?: SparcMode
  ): Promise<DualModeResponse>;
  
  executeComprehensiveAiWorkflow(
    taskDescription: string,
    enableSwarm: boolean,
    sparcMode?: SparcMode,
    hiveCommands?: HiveMindCommand[],
    memoryContext?: string
  ): Promise<Record<string, any>>;
  
  // Health and Info
  healthCheck(): Promise<Record<string, any>>;
  getOrchestrationInfo(): Promise<Record<string, any>>;
  
  // Session Management
  getSessionId(): string;
  
  // Utility Methods
  createHiveMindCommand(
    commandType: HiveMindCommandType,
    targetAgents: string[],
    coordinationLevel: CoordinationLevel,
    payload?: Record<string, any>
  ): HiveMindCommand;
  
  createSwarmConfig(
    topology?: SwarmTopology,
    maxAgents?: number,
    strategy?: CoordinationStrategy,
    memoryPersistence?: boolean
  ): SwarmConfig;
}

// Frontend Utility Types
export interface AiOrchestrationConfig {
  enableSwarm: boolean;
  defaultTopology: SwarmTopology;
  maxAgents: number;
  memoryPersistence: boolean;
  defaultSparcMode?: SparcMode;
  coordinationLevel: CoordinationLevel;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  sparcMode: SparcMode;
  swarmConfig: SwarmConfig;
  hiveCommands: HiveMindCommand[];
  memoryContexts: string[];
  estimatedDuration: number;
}

export interface AiOrchestrationMetrics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  swarmEfficiency: number;
  memoryHitRate: number;
  collectiveIntelligenceScore: number;
}

// Error Types
export interface AiOrchestrationError {
  code: string;
  message: string;
  component: 'swarm' | 'sparc' | 'hive-mind' | 'memory' | 'orchestration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  context?: Record<string, any>;
}

// Event Types for Real-time Updates
export interface AiOrchestrationEvent {
  type: 'swarm_status' | 'sparc_progress' | 'hive_coordination' | 'memory_update' | 'workflow_complete';
  sessionId: string;
  data: Record<string, any>;
  timestamp: string;
}

// Feature Detection
export interface AiOrchestrationCapabilities {
  swarmCoordination: {
    topologies: SwarmTopology[];
    maxAgents: number;
    strategies: CoordinationStrategy[];
  };
  sparcMethodology: {
    modes: SparcMode[];
    parallelExecution: boolean;
    testDriven: boolean;
  };
  hiveMind: {
    commandTypes: HiveMindCommandType[];
    coordinationLevels: CoordinationLevel[];
  };
  memoryLayer: {
    namespace: string;
    persistence: boolean;
    crossSession: boolean;
    ttlSupport: boolean;
  };
}