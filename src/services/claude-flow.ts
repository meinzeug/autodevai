/**
 * Claude-Flow Integration Service
 * Orchestrates AI agents and manages swarm coordination
 */

import { OpenRouterClient, TaskComplexity } from './openrouter';

interface AgentCapability {
  name: string;
  specialization: string[];
  complexity_handling: number;
  coordination_level: number;
}

interface SwarmTopology {
  type: 'mesh' | 'hierarchical' | 'ring' | 'star';
  maxAgents: number;
  strategy: 'balanced' | 'specialized' | 'adaptive';
}

interface TaskPriority {
  level: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  dependencies: string[];
}

interface CoordinationHooks {
  preTask: (description: string) => Promise<void>;
  postEdit: (file: string, memoryKey: string) => Promise<void>;
  postTask: (taskId: string) => Promise<void>;
  sessionRestore: (sessionId: string) => Promise<void>;
  sessionEnd: (exportMetrics: boolean) => Promise<void>;
  notify: (message: string) => Promise<void>;
}

class ClaudeFlowOrchestrator {
  private openRouterClient: OpenRouterClient;
  private activeSwarms: Map<string, any>;
  private agentCapabilities: Map<string, AgentCapability>;
  private taskQueue: Array<any>;
  private memoryStore: Map<string, any>;
  private hooks: CoordinationHooks;

  constructor(openRouterClient: OpenRouterClient) {
    this.openRouterClient = openRouterClient;
    this.activeSwarms = new Map();
    this.agentCapabilities = new Map();
    this.taskQueue = [];
    this.memoryStore = new Map();
    this.initializeAgentCapabilities();
    this.initializeHooks();
  }

  private initializeAgentCapabilities() {
    const capabilities: AgentCapability[] = [
      {
        name: 'researcher',
        specialization: ['analysis', 'investigation', 'data_gathering'],
        complexity_handling: 8.5,
        coordination_level: 7.0
      },
      {
        name: 'coder',
        specialization: ['implementation', 'debugging', 'optimization'],
        complexity_handling: 9.2,
        coordination_level: 8.5
      },
      {
        name: 'architect',
        specialization: ['system_design', 'architecture', 'planning'],
        complexity_handling: 9.8,
        coordination_level: 9.5
      },
      {
        name: 'tester',
        specialization: ['testing', 'quality_assurance', 'validation'],
        complexity_handling: 8.0,
        coordination_level: 7.5
      },
      {
        name: 'reviewer',
        specialization: ['code_review', 'security', 'best_practices'],
        complexity_handling: 8.8,
        coordination_level: 8.0
      },
      {
        name: 'optimizer',
        specialization: ['performance', 'efficiency', 'bottleneck_analysis'],
        complexity_handling: 9.0,
        coordination_level: 7.8
      },
      {
        name: 'coordinator',
        specialization: ['orchestration', 'communication', 'workflow'],
        complexity_handling: 7.5,
        coordination_level: 9.8
      }
    ];

    capabilities.forEach(cap => this.agentCapabilities.set(cap.name, cap));
  }

  private initializeHooks(): void {
    this.hooks = {
      preTask: async (description: string) => {
        console.log(`🔄 Pre-task hook: ${description}`);
        this.memoryStore.set(`task_${Date.now()}_start`, {
          description,
          timestamp: new Date(),
          status: 'initiated'
        });
      },

      postEdit: async (file: string, memoryKey: string) => {
        console.log(`📝 Post-edit hook: ${file} -> ${memoryKey}`);
        this.memoryStore.set(memoryKey, {
          file,
          timestamp: new Date(),
          action: 'file_edited'
        });
      },

      postTask: async (taskId: string) => {
        console.log(`✅ Post-task hook: ${taskId}`);
        const task = this.memoryStore.get(taskId);
        if (task) {
          task.completed = new Date();
          task.status = 'completed';
          this.memoryStore.set(taskId, task);
        }
      },

      sessionRestore: async (sessionId: string) => {
        console.log(`🔄 Session restore: ${sessionId}`);
        // Implement session restoration logic
      },

      sessionEnd: async (exportMetrics: boolean) => {
        console.log(`🔚 Session end, export metrics: ${exportMetrics}`);
        if (exportMetrics) {
          await this.exportSessionMetrics();
        }
      },

      notify: async (message: string) => {
        console.log(`📢 Notification: ${message}`);
        this.memoryStore.set(`notification_${Date.now()}`, {
          message,
          timestamp: new Date()
        });
      }
    };
  }

  async initializeSwarm(topology: SwarmTopology): Promise<string> {
    const swarmId = `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.hooks.preTask(`Initialize swarm with ${topology.type} topology`);
    
    const swarmConfig = {
      id: swarmId,
      topology: topology.type,
      maxAgents: topology.maxAgents,
      strategy: topology.strategy,
      agents: new Map(),
      status: 'active',
      created: new Date(),
      metrics: {
        tasksCompleted: 0,
        totalAgents: 0,
        averageResponseTime: 0
      }
    };

    this.activeSwarms.set(swarmId, swarmConfig);
    
    await this.hooks.postTask(`swarm_init_${swarmId}`);
    
    return swarmId;
  }

  async spawnAgent(swarmId: string, agentType: string, customCapabilities?: string[]): Promise<string> {
    const swarm = this.activeSwarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseCapability = this.agentCapabilities.get(agentType);
    
    if (!baseCapability) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const agent = {
      id: agentId,
      type: agentType,
      swarmId,
      capabilities: customCapabilities || baseCapability.specialization,
      status: 'idle',
      taskHistory: [],
      performance: {
        tasksCompleted: 0,
        averageTime: 0,
        successRate: 1.0
      },
      created: new Date()
    };

    swarm.agents.set(agentId, agent);
    swarm.metrics.totalAgents += 1;
    
    await this.hooks.notify(`Agent ${agentType} spawned with ID ${agentId}`);
    
    return agentId;
  }

  async orchestrateTask(params: {
    swarmId: string;
    task: string;
    priority: TaskPriority;
    complexity: TaskComplexity;
    maxAgents?: number;
    strategy?: 'parallel' | 'sequential' | 'adaptive';
  }): Promise<string> {
    const swarm = this.activeSwarms.get(params.swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${params.swarmId} not found`);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.hooks.preTask(params.task);

    // Analyze task and select optimal agents
    const selectedAgents = await this.selectOptimalAgents(
      params.swarmId,
      params.task,
      params.complexity,
      params.maxAgents || 3
    );

    const task = {
      id: taskId,
      description: params.task,
      swarmId: params.swarmId,
      priority: params.priority,
      complexity: params.complexity,
      assignedAgents: selectedAgents,
      strategy: params.strategy || 'adaptive',
      status: 'pending',
      created: new Date(),
      subtasks: [],
      results: []
    };

    this.taskQueue.push(task);
    
    // Execute task based on strategy
    switch (params.strategy || 'adaptive') {
      case 'parallel':
        await this.executeParallelTask(task);
        break;
      case 'sequential':
        await this.executeSequentialTask(task);
        break;
      case 'adaptive':
        await this.executeAdaptiveTask(task);
        break;
    }

    await this.hooks.postTask(taskId);
    
    return taskId;
  }

  private async selectOptimalAgents(
    swarmId: string,
    task: string,
    complexity: TaskComplexity,
    maxAgents: number
  ): Promise<string[]> {
    const swarm = this.activeSwarms.get(swarmId);
    if (!swarm) return [];

    const availableAgents = Array.from(swarm.agents.values())
      .filter(agent => agent.status === 'idle')
      .sort((a, b) => {
        const aCapability = this.agentCapabilities.get(a.type);
        const bCapability = this.agentCapabilities.get(b.type);
        
        if (!aCapability || !bCapability) return 0;
        
        // Score agents based on task requirements
        const aScore = this.calculateAgentTaskScore(aCapability, task, complexity);
        const bScore = this.calculateAgentTaskScore(bCapability, task, complexity);
        
        return bScore - aScore;
      });

    return availableAgents.slice(0, maxAgents).map(agent => agent.id);
  }

  private calculateAgentTaskScore(
    capability: AgentCapability,
    task: string,
    complexity: TaskComplexity
  ): number {
    const taskLower = task.toLowerCase();
    let score = 0;

    // Check specialization match
    capability.specialization.forEach(spec => {
      if (taskLower.includes(spec.replace('_', ' '))) {
        score += 2.0;
      }
    });

    // Factor in complexity handling
    const avgComplexity = (
      complexity.computational +
      complexity.logical +
      complexity.creative +
      complexity.domain_specific
    ) / 4;

    score += capability.complexity_handling * avgComplexity;
    score += capability.coordination_level * 0.3;

    return score;
  }

  private async executeParallelTask(task: any): Promise<void> {
    task.status = 'executing';
    const promises = [];

    for (const agentId of task.assignedAgents) {
      const agentTask = {
        agentId,
        taskDescription: task.description,
        complexity: task.complexity
      };

      promises.push(this.executeAgentTask(agentTask));
    }

    try {
      const results = await Promise.all(promises);
      task.results = results;
      task.status = 'completed';
    } catch (error) {
      task.status = 'failed';
      task.error = error;
    }
  }

  private async executeSequentialTask(task: any): Promise<void> {
    task.status = 'executing';
    const results = [];

    for (const agentId of task.assignedAgents) {
      try {
        const agentTask = {
          agentId,
          taskDescription: task.description,
          complexity: task.complexity,
          previousResults: results
        };

        const result = await this.executeAgentTask(agentTask);
        results.push(result);
      } catch (error) {
        task.status = 'failed';
        task.error = error;
        return;
      }
    }

    task.results = results;
    task.status = 'completed';
  }

  private async executeAdaptiveTask(task: any): Promise<void> {
    // Implement adaptive execution based on task complexity and agent performance
    const complexityScore = (
      task.complexity.computational +
      task.complexity.logical +
      task.complexity.creative +
      task.complexity.domain_specific
    ) / 4;

    if (complexityScore > 0.7 && task.assignedAgents.length > 1) {
      // High complexity: use sequential with handoffs
      await this.executeSequentialTask(task);
    } else {
      // Lower complexity: use parallel execution
      await this.executeParallelTask(task);
    }
  }

  private async executeAgentTask(agentTask: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Use OpenRouter to generate agent response
      const response = await this.openRouterClient.completion({
        messages: [
          {
            role: 'system',
            content: `You are an AI agent specialized in ${agentTask.agentId}. Execute the following task with expertise and attention to detail.`
          },
          {
            role: 'user',
            content: agentTask.taskDescription
          }
        ],
        task_description: agentTask.taskDescription,
        complexity: agentTask.complexity,
        constraints: {
          optimizeCost: true,
          prioritizeSpeed: false
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update agent performance metrics
      await this.updateAgentPerformance(agentTask.agentId, responseTime, true);

      return {
        agentId: agentTask.agentId,
        result: response.choices[0].message.content,
        metrics: {
          responseTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: response.model
        },
        timestamp: new Date()
      };
    } catch (error) {
      await this.updateAgentPerformance(agentTask.agentId, Date.now() - startTime, false);
      throw error;
    }
  }

  private async updateAgentPerformance(agentId: string, responseTime: number, success: boolean): Promise<void> {
    // Find agent across all swarms
    for (const swarm of this.activeSwarms.values()) {
      const agent = swarm.agents.get(agentId);
      if (agent) {
        agent.performance.tasksCompleted += 1;
        agent.performance.averageTime = (
          agent.performance.averageTime * (agent.performance.tasksCompleted - 1) + responseTime
        ) / agent.performance.tasksCompleted;
        
        if (success) {
          agent.performance.successRate = (
            agent.performance.successRate * (agent.performance.tasksCompleted - 1) + 1
          ) / agent.performance.tasksCompleted;
        } else {
          agent.performance.successRate = (
            agent.performance.successRate * (agent.performance.tasksCompleted - 1)
          ) / agent.performance.tasksCompleted;
        }
        
        break;
      }
    }
  }

  async getSwarmStatus(swarmId: string): Promise<any> {
    const swarm = this.activeSwarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    return {
      id: swarm.id,
      topology: swarm.topology,
      status: swarm.status,
      agents: Array.from(swarm.agents.values()),
      metrics: swarm.metrics,
      taskQueue: this.taskQueue.filter(task => task.swarmId === swarmId)
    };
  }

  async getTaskStatus(taskId: string): Promise<any> {
    const task = this.taskQueue.find(t => t.id === taskId);
    return task || null;
  }

  private async exportSessionMetrics(): Promise<void> {
    const metrics = {
      swarms: Array.from(this.activeSwarms.values()),
      tasks: this.taskQueue,
      memory: Object.fromEntries(this.memoryStore),
      timestamp: new Date()
    };

    // Store metrics in memory for later retrieval
    this.memoryStore.set('session_metrics', metrics);
    console.log('📊 Session metrics exported to memory');
  }

  async simulateTeamDiscussion(topic: string, participants: string[]): Promise<string> {
    const discussionId = `discussion_${Date.now()}`;
    await this.hooks.preTask(`Team discussion on: ${topic}`);

    let discussion = `# Team Discussion: ${topic}\n\n`;
    const context = [];

    for (let round = 0; round < 3; round++) {
      discussion += `## Round ${round + 1}\n\n`;
      
      for (const participant of participants) {
        const response = await this.openRouterClient.completion({
          messages: [
            {
              role: 'system',
              content: `You are a ${participant} participating in a team discussion. Previous context: ${context.join('. ')}`
            },
            {
              role: 'user',
              content: `Discuss: ${topic}. Keep your response concise and relevant to your role.`
            }
          ],
          task_description: `Team discussion participation as ${participant}`,
          complexity: { computational: 0.3, logical: 0.7, creative: 0.6, domain_specific: 0.5 }
        });

        const contribution = response.choices[0].message.content;
        discussion += `**${participant}**: ${contribution}\n\n`;
        context.push(`${participant} said: ${contribution}`);
      }
    }

    await this.hooks.postTask(discussionId);
    return discussion;
  }

  // Public access to hooks for external coordination
  getHooks(): CoordinationHooks {
    return this.hooks;
  }

  // Memory management
  async storeMemory(key: string, value: any): Promise<void> {
    this.memoryStore.set(key, value);
    await this.hooks.notify(`Memory stored: ${key}`);
  }

  async retrieveMemory(key: string): Promise<any> {
    return this.memoryStore.get(key);
  }

  async listMemoryKeys(): Promise<string[]> {
    return Array.from(this.memoryStore.keys());
  }
}

export {
  ClaudeFlowOrchestrator,
  SwarmTopology,
  TaskPriority,
  AgentCapability,
  CoordinationHooks
};