/**
 * Hive Mind Coordination Utilities
 * Provides coordination between Window, Security, and Build agents
 */

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'task_update' | 'error' | 'completion' | 'request' | 'coordination';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SharedState {
  window: {
    state: 'active' | 'minimized' | 'maximized' | 'hidden';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    securityLevel: 'low' | 'medium' | 'high';
  };
  security: {
    scanStatus: 'idle' | 'running' | 'complete' | 'error';
    vulnerabilities: Array<{
      id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      component: string;
      description: string;
      fixed: boolean;
    }>;
    dockerStatus: 'healthy' | 'warning' | 'critical';
  };
  build: {
    status: 'idle' | 'building' | 'testing' | 'deploying' | 'complete' | 'error';
    eslintErrors: number;
    testResults: {
      passed: number;
      failed: number;
      coverage: number;
    };
    lastBuildTime?: Date;
  };
}

export class HiveCoordinator {
  private static instance: HiveCoordinator;
  private messageQueue: AgentMessage[] = [];
  private sharedState: SharedState;
  private subscribers: Map<string, (message: AgentMessage) => void> = new Map();

  private constructor() {
    this.sharedState = {
      window: {
        state: 'active',
        securityLevel: 'medium'
      },
      security: {
        scanStatus: 'idle',
        vulnerabilities: [],
        dockerStatus: 'healthy'
      },
      build: {
        status: 'idle',
        eslintErrors: 0,
        testResults: {
          passed: 0,
          failed: 0,
          coverage: 0
        }
      }
    };
  }

  public static getInstance(): HiveCoordinator {
    if (!HiveCoordinator.instance) {
      HiveCoordinator.instance = new HiveCoordinator();
    }
    return HiveCoordinator.instance;
  }

  public sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.messageQueue.push(fullMessage);

    // Notify subscriber if exists
    const subscriber = this.subscribers.get(message.to);
    if (subscriber) {
      subscriber(fullMessage);
    }

    // Auto-handle certain coordination messages
    this.handleCoordination(fullMessage);
  }

  public subscribe(agentId: string, callback: (message: AgentMessage) => void): void {
    this.subscribers.set(agentId, callback);
  }

  public updateState(component: keyof SharedState, updates: Partial<SharedState[keyof SharedState]>): void {
    this.sharedState[component] = {
      ...this.sharedState[component],
      ...updates
    } as any;

    // Notify other components of state changes
    this.broadcastStateUpdate(component, updates);
  }

  public getState(component?: keyof SharedState): SharedState | SharedState[keyof SharedState] {
    return component ? this.sharedState[component] : this.sharedState;
  }

  public getMessages(agentId: string, markAsRead = true): AgentMessage[] {
    const messages = this.messageQueue.filter(msg => msg.to === agentId);
    
    if (markAsRead) {
      this.messageQueue = this.messageQueue.filter(msg => msg.to !== agentId);
    }

    return messages;
  }

  public checkDependencies(_agentType: keyof SharedState, task: string): { ready: boolean; blockers: string[] } {
    const blockers: string[] = [];

    // Define task dependencies
    const dependencies: Record<string, Array<{ agent: keyof SharedState; condition: (state: any) => boolean }>> = {
      'Fix Tauri window state': [
        {
          agent: 'security',
          condition: (state) => state.dockerStatus === 'healthy'
        }
      ],
      'Resolve IPC security': [
        {
          agent: 'build',
          condition: (state) => state.eslintErrors === 0
        }
      ],
      'Docker security fixes': [],
      'ESLint configuration': [],
      'CI/CD pipeline fixes': [
        {
          agent: 'security',
          condition: (state) => state.scanStatus === 'complete'
        }
      ]
    };

    const taskDeps = dependencies[task] || [];
    
    for (const dep of taskDeps) {
      const state = this.sharedState[dep.agent];
      if (!dep.condition(state)) {
        blockers.push(`${dep.agent} agent condition not met`);
      }
    }

    return {
      ready: blockers.length === 0,
      blockers
    };
  }

  private handleCoordination(message: AgentMessage): void {
    switch (message.type) {
      case 'task_update':
        this.handleTaskUpdate(message);
        break;
      case 'completion':
        this.handleTaskCompletion(message);
        break;
      case 'error':
        this.handleError(message);
        break;
    }
  }

  private handleTaskUpdate(message: AgentMessage): void {
    const { from, payload } = message;
    
    if (from.includes('window')) {
      this.updateState('window', payload);
    } else if (from.includes('security')) {
      this.updateState('security', payload);
    } else if (from.includes('build')) {
      this.updateState('build', payload);
    }
  }

  private handleTaskCompletion(message: AgentMessage): void {
    const { from, payload } = message;
    
    // Notify dependent agents that a task has completed
    this.sendMessage({
      from: 'coordinator',
      to: 'all',
      type: 'coordination',
      payload: {
        event: 'task_completed',
        agent: from,
        task: payload.task
      },
      priority: 'medium'
    });
  }

  private handleError(message: AgentMessage): void {
    const { from, payload } = message;
    
    // Log error and potentially reassign task or request help
    console.error(`Error from ${from}:`, payload);
    
    // Update relevant state to reflect error
    if (from.includes('security')) {
      this.updateState('security', { scanStatus: 'error' });
    } else if (from.includes('build')) {
      this.updateState('build', { status: 'error' });
    }
  }

  private broadcastStateUpdate(component: keyof SharedState, updates: any): void {
    const message: AgentMessage = {
      id: `state-${Date.now()}`,
      from: 'coordinator',
      to: 'all',
      type: 'coordination',
      payload: {
        event: 'state_update',
        component,
        updates
      },
      timestamp: new Date(),
      priority: 'low'
    };

    // Notify all subscribers
    this.subscribers.forEach((callback, agentId) => {
      if (agentId !== 'coordinator') {
        callback(message);
      }
    });
  }

  public getCoordinationStatus(): {
    agents: Record<string, any>;
    messageQueueSize: number;
    lastStateUpdate: Date;
    health: 'healthy' | 'degraded' | 'critical';
  } {
    const health = this.determineHealth();
    
    return {
      agents: {
        window: this.sharedState.window,
        security: this.sharedState.security,
        build: this.sharedState.build
      },
      messageQueueSize: this.messageQueue.length,
      lastStateUpdate: new Date(),
      health
    };
  }

  private determineHealth(): 'healthy' | 'degraded' | 'critical' {
    const { security, build } = this.sharedState;
    
    // Critical conditions
    if (security.dockerStatus === 'critical' || build.status === 'error') {
      return 'critical';
    }
    
    // Degraded conditions
    if (security.vulnerabilities.filter(v => v.severity === 'high' && !v.fixed).length > 0 ||
        build.eslintErrors > 50 ||
        security.scanStatus === 'error') {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Export singleton instance
export const hiveCoordinator = HiveCoordinator.getInstance();