/**
 * AI Orchestration Service
 * Frontend service layer for AI integration features including swarm coordination,
 * SPARC methodology, hive-mind communication, and memory persistence.
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type {
  AiOrchestrationService,
  SwarmConfig,
  SparcMode,
  HiveMindCommand,
  SwarmMetrics,
  MemoryState,
  ExecutionResponse,
  DualModeResponse,
  AiOrchestrationEvent,
  AiOrchestrationCapabilities
} from '../types/ai-orchestration';
import {
  SwarmTopology,
  CoordinationStrategy,
  CoordinationLevel,
  HiveMindCommandType
} from '../types/ai-orchestration';

class AiOrchestrationServiceImpl implements AiOrchestrationService {
  private sessionId: string;
  private eventListeners: Map<string, ((event: AiOrchestrationEvent) => void)[]> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeEventListeners();
  }

  private generateSessionId(): string {
    return `ai_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeEventListeners(): Promise<void> {
    // Listen for real-time AI orchestration events
    await listen('ai-orchestration-event', (event: { payload: AiOrchestrationEvent }) => {
      const orchestrationEvent = event.payload as AiOrchestrationEvent;
      this.handleOrchestrationEvent(orchestrationEvent);
    });

    await listen('swarm-metrics-update', (event: { payload: unknown }) => {
      this.emitEvent('swarm_status', event.payload);
    });

    await listen('memory-state-change', (event: { payload: unknown }) => {
      this.emitEvent('memory_update', event.payload);
    });
  }

  private handleOrchestrationEvent(event: AiOrchestrationEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  private emitEvent(type: string, data: unknown): void {
    const event: AiOrchestrationEvent = {
      type: type as AiOrchestrationEvent['type'],
      sessionId: this.sessionId,
      data: data as Record<string, any>,
      timestamp: new Date().toISOString()
    };
    this.handleOrchestrationEvent(event);
  }

  // Event Management
  addEventListener(
    type: AiOrchestrationEvent['type'],
    listener: (event: AiOrchestrationEvent) => void
  ): void {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(
    type: AiOrchestrationEvent['type'],
    listener: (event: AiOrchestrationEvent) => void
  ): void {
    const listeners = this.eventListeners.get(type) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Schritt 327: Swarm Coordination
  async initializeSwarm(config: SwarmConfig): Promise<string> {
    try {
      const result = await invoke('initialize_swarm', { swarmConfig: config }) as string;
      this.emitEvent('swarm_status', { status: 'initialized', config });
      return result;
    } catch (error) {
      throw new Error(`Failed to initialize swarm: ${error}`);
    }
  }

  async getSwarmMetrics(sessionId: string): Promise<SwarmMetrics> {
    try {
      return await invoke('get_swarm_metrics', { sessionId }) as SwarmMetrics;
    } catch (error) {
      throw new Error(`Failed to get swarm metrics: ${error}`);
    }
  }

  // Schritt 328: SPARC Methodology Integration
  async executeSparxMode(
    prompt: string,
    mode: SparcMode,
    swarmEnabled: boolean = true
  ): Promise<ExecutionResponse> {
    try {
      const result = await invoke('execute_sparc_mode', {
        prompt,
        mode,
        swarmEnabled
      }) as ExecutionResponse;
      
      this.emitEvent('sparc_progress', {
        mode,
        status: result.success ? 'completed' : 'failed',
        executionTime: result.execution_time
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to execute SPARC mode: ${error}`);
    }
  }

  // Schritt 329: Hive-Mind Command Integration
  async processHiveMindCommand(command: HiveMindCommand): Promise<string> {
    try {
      const result = await invoke('process_hive_mind_command', { command }) as string;
      
      this.emitEvent('hive_coordination', {
        commandType: command.command_type,
        coordinationLevel: command.coordination_level,
        targetAgents: command.target_agents,
        status: 'processed'
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to process hive-mind command: ${error}`);
    }
  }

  // Schritt 330: Memory Layer Persistence
  async storeMemory(
    key: string,
    value: string,
    tags?: string[],
    ttlSeconds?: number
  ): Promise<string> {
    try {
      const result = await invoke('store_memory', {
        key,
        value,
        tags: tags || [],
        ttlSeconds
      }) as string;

      this.emitEvent('memory_update', {
        operation: 'store',
        key,
        success: true
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to store memory: ${error}`);
    }
  }

  async retrieveMemory(key: string): Promise<string> {
    try {
      const result = await invoke('retrieve_memory', { key }) as string;
      
      this.emitEvent('memory_update', {
        operation: 'retrieve',
        key,
        success: true
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to retrieve memory: ${error}`);
    }
  }

  async getMemoryState(): Promise<MemoryState> {
    try {
      return await invoke('get_memory_state') as MemoryState;
    } catch (error) {
      throw new Error(`Failed to get memory state: ${error}`);
    }
  }

  // Integrated AI Workflows
  async executeAiOrchestratedDualMode(
    prompt: string,
    swarmConfig?: SwarmConfig,
    sparcMode?: SparcMode
  ): Promise<DualModeResponse> {
    try {
      const result = await invoke('execute_ai_orchestrated_dual_mode', {
        prompt,
        swarmConfig,
        sparcMode
      }) as DualModeResponse;

      this.emitEvent('workflow_complete', {
        type: 'dual_mode',
        success: result.success,
        swarmMetrics: result.swarm_metrics,
        memoryState: result.memory_state
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to execute AI orchestrated dual mode: ${error}`);
    }
  }

  async executeComprehensiveAiWorkflow(
    taskDescription: string,
    enableSwarm: boolean = true,
    sparcMode?: SparcMode,
    hiveCommands?: HiveMindCommand[],
    memoryContext?: string
  ): Promise<Record<string, unknown>> {
    try {
      const result = await invoke('execute_comprehensive_ai_workflow', {
        taskDescription,
        enableSwarm,
        sparcMode,
        hiveCommands: hiveCommands || [],
        memoryContext
      }) as Record<string, unknown>;

      this.emitEvent('workflow_complete', {
        type: 'comprehensive',
        sessionId: result['session_id'],
        success: result['success'],
        executionTime: result['execution_time'],
        swarmMetrics: result['swarm_metrics']
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to execute comprehensive AI workflow: ${error}`);
    }
  }

  // Health and Capabilities
  async healthCheck(): Promise<Record<string, unknown>> {
    try {
      return await invoke('ai_orchestration_health_check') as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Health check failed: ${error}`);
    }
  }

  async getOrchestrationInfo(): Promise<AiOrchestrationCapabilities> {
    try {
      return await invoke('get_ai_orchestration_info') as AiOrchestrationCapabilities;
    } catch (error) {
      throw new Error(`Failed to get orchestration info: ${error}`);
    }
  }

  // Utility Methods
  createHiveMindCommand(
    commandType: HiveMindCommand['command_type'],
    targetAgents: string[],
    coordinationLevel: HiveMindCommand['coordination_level'],
    payload: Record<string, unknown> = {}
  ): HiveMindCommand {
    return {
      id: `hive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command_type: commandType,
      target_agents: targetAgents,
      coordination_level: coordinationLevel,
      payload
    };
  }

  createSwarmConfig(
    topology: SwarmConfig['topology'] = SwarmTopology.Hierarchical,
    maxAgents: number = 6,
    strategy: SwarmConfig['strategy'] = CoordinationStrategy.Adaptive,
    memoryPersistence: boolean = true
  ): SwarmConfig {
    return {
      topology,
      max_agents: maxAgents,
      strategy,
      memory_persistence: memoryPersistence
    };
  }

  // Advanced Orchestration Patterns
  async executeSparcPipeline(
    prompt: string,
    modes: SparcMode[],
    swarmEnabled: boolean = true
  ): Promise<ExecutionResponse[]> {
    const results: ExecutionResponse[] = [];
    
    for (const mode of modes) {
      try {
        const result = await this.executeSparxMode(prompt, mode, swarmEnabled);
        results.push(result);
        
        // Use previous result as context for next mode
        if (result.result) {
          prompt = `Previous step result:\n${result.result}\n\nNext step: ${prompt}`;
        }
      } catch (error) {
        console.error(`SPARC pipeline failed at mode ${mode}:`, error);
        break;
      }
    }
    
    return results;
  }

  async executeCollectiveIntelligenceWorkflow(
    taskDescription: string,
    agents: string[],
    coordinationLevel: HiveMindCommand['coordination_level'] = CoordinationLevel.CollectiveIntelligence
  ): Promise<Record<string, unknown>> {
    // Create hive-mind commands for collective decision making
    const hiveCommands: HiveMindCommand[] = [
      this.createHiveMindCommand(
        HiveMindCommandType.TaskDistribution,
        agents,
        CoordinationLevel.GroupWise,
        { task: taskDescription }
      ),
      this.createHiveMindCommand(
        HiveMindCommandType.CollectiveDecision,
        agents,
        coordinationLevel,
        { decision_criteria: 'optimal_solution' }
      ),
      this.createHiveMindCommand(
        HiveMindCommandType.KnowledgeSync,
        agents,
        CoordinationLevel.SwarmWide,
        { sync_type: 'bidirectional' }
      )
    ];

    return await this.executeComprehensiveAiWorkflow(
      taskDescription,
      true, // Enable swarm
      'Architecture' as SparcMode, // Use architecture mode for complex tasks
      hiveCommands,
      `collective_intelligence_${Date.now()}`
    );
  }

  // Session Management
  getSessionId(): string {
    return this.sessionId;
  }

  renewSession(): void {
    this.sessionId = this.generateSessionId();
  }

  async exportSessionData(): Promise<Record<string, unknown>> {
    try {
      const memoryState = await this.getMemoryState();
      const healthStatus = await this.healthCheck();
      
      return {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        memoryState,
        healthStatus,
        capabilities: await this.getOrchestrationInfo()
      };
    } catch (error) {
      throw new Error(`Failed to export session data: ${error}`);
    }
  }
}

// Singleton instance
let aiOrchestrationService: AiOrchestrationServiceImpl | null = null;

export function getAiOrchestrationService(): AiOrchestrationService {
  if (!aiOrchestrationService) {
    aiOrchestrationService = new AiOrchestrationServiceImpl();
  }
  return aiOrchestrationService;
}

// EMERGENCY REPAIR: Add getInstance method for backward compatibility
export const aiOrchestrationServiceInstance = {
  getInstance: getAiOrchestrationService,
  ...getAiOrchestrationService()
};

export default getAiOrchestrationService;