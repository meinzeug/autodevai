import { jest } from '@jest/globals';

export interface MockResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export class APIMocks {
  private static instance: APIMocks;
  private mocks: Map<string, jest.MockedFunction<any>>;

  private constructor() {
    this.mocks = new Map();
  }

  static getInstance(): APIMocks {
    if (!APIMocks.instance) {
      APIMocks.instance = new APIMocks();
    }
    return APIMocks.instance;
  }

  // Claude Flow API Mocks
  mockClaudeFlowInit(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      swarm_id: `swarm_${Date.now()}`,
      status: 'initialized',
      topology: 'mesh',
      max_agents: 5,
      ...response
    });
    
    this.mocks.set('claude_flow_init', mockFn);
    return mockFn;
  }

  mockClaudeFlowSpawnAgent(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      agent_id: `agent_${Date.now()}`,
      status: 'spawned',
      type: 'researcher',
      ...response
    });
    
    this.mocks.set('claude_flow_spawn_agent', mockFn);
    return mockFn;
  }

  mockClaudeFlowOrchestrate(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      task_id: `task_${Date.now()}`,
      status: 'pending',
      strategy: 'parallel',
      ...response
    });
    
    this.mocks.set('claude_flow_orchestrate', mockFn);
    return mockFn;
  }

  mockClaudeFlowStatus(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      status: 'active',
      agents: [
        { id: 'agent_1', type: 'researcher', status: 'active' },
        { id: 'agent_2', type: 'coder', status: 'idle' }
      ],
      tasks: [
        { id: 'task_1', status: 'running', progress: 50 }
      ],
      ...response
    });
    
    this.mocks.set('claude_flow_status', mockFn);
    return mockFn;
  }

  // Codex API Mocks
  mockCodexExecute(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockImplementation((request) => {
      const { code, language } = request;
      
      // Simulate different outputs based on code
      let output = 'Execution completed';
      let returnValue = null;
      
      if (language === 'javascript') {
        if (code.includes('2 + 2')) {
          output = '4';
          returnValue = 4;
        } else if (code.includes('console.log')) {
          output = code.match(/console\.log\(['"`](.+?)['"`]\)/)?.[1] || 'Hello';
        }
      } else if (language === 'python') {
        if (code.includes('print')) {
          output = code.match(/print\(['"`](.+?)['"`]\)/)?.[1] || 'Hello from Python';
        }
      }
      
      return Promise.resolve({
        success: true,
        output,
        return_value: returnValue,
        execution_time: Math.random() * 1000 + 100,
        status: 'completed',
        ...response
      });
    });
    
    this.mocks.set('codex_execute', mockFn);
    return mockFn;
  }

  mockCodexExecuteError(errorMessage: string = 'Execution failed'): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: false,
      error: errorMessage,
      status: 'failed'
    });
    
    this.mocks.set('codex_execute_error', mockFn);
    return mockFn;
  }

  // Docker API Mocks
  mockDockerCreate(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      container_id: `container_${Date.now()}`,
      status: 'created',
      image: 'node:18-alpine',
      ...response
    });
    
    this.mocks.set('docker_create', mockFn);
    return mockFn;
  }

  mockDockerList(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      containers: [
        {
          id: 'container_1',
          name: 'test-container-1',
          image: 'node:18-alpine',
          status: 'running',
          ports: { '3000': '3000' }
        },
        {
          id: 'container_2',
          name: 'test-container-2',
          image: 'python:3.11-alpine',
          status: 'stopped',
          ports: {}
        }
      ],
      ...response
    });
    
    this.mocks.set('docker_list', mockFn);
    return mockFn;
  }

  mockDockerStop(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      status: 'stopped',
      ...response
    });
    
    this.mocks.set('docker_stop', mockFn);
    return mockFn;
  }

  mockDockerRemove(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      status: 'removed',
      ...response
    });
    
    this.mocks.set('docker_remove', mockFn);
    return mockFn;
  }

  // State Management Mocks
  mockStateSave(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      saved_at: new Date().toISOString(),
      ...response
    });
    
    this.mocks.set('state_save', mockFn);
    return mockFn;
  }

  mockStateLoad(response?: Partial<MockResponse>): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      success: true,
      data: {
        swarm_config: { topology: 'mesh', agents: 5 },
        user_preferences: { theme: 'dark', auto_save: true },
        active_sessions: ['session_1', 'session_2']
      },
      loaded_at: new Date().toISOString(),
      ...response
    });
    
    this.mocks.set('state_load', mockFn);
    return mockFn;
  }

  // External API Mocks
  mockOpenRouterAPI(response?: any): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is a mock response from OpenRouter API',
            role: 'assistant'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25
      },
      ...response
    });
    
    this.mocks.set('openrouter_api', mockFn);
    return mockFn;
  }

  // Error Scenarios
  mockNetworkError(): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockRejectedValue(new Error('Network request failed'));
    this.mocks.set('network_error', mockFn);
    return mockFn;
  }

  mockTimeoutError(): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
    });
    
    this.mocks.set('timeout_error', mockFn);
    return mockFn;
  }

  mockServerError(statusCode: number = 500): jest.MockedFunction<any> {
    const mockFn = jest.fn().mockRejectedValue({
      status: statusCode,
      message: `Server error: ${statusCode}`,
      response: {
        data: { error: 'Internal server error' }
      }
    });
    
    this.mocks.set('server_error', mockFn);
    return mockFn;
  }

  // Utility Methods
  getMock(name: string): jest.MockedFunction<any> | undefined {
    return this.mocks.get(name);
  }

  clearMock(name: string): void {
    const mock = this.mocks.get(name);
    if (mock) {
      mock.mockClear();
    }
  }

  clearAllMocks(): void {
    this.mocks.forEach(mock => mock.mockClear());
  }

  resetMock(name: string): void {
    const mock = this.mocks.get(name);
    if (mock) {
      mock.mockReset();
    }
  }

  resetAllMocks(): void {
    this.mocks.forEach(mock => mock.mockReset());
    this.mocks.clear();
  }

  // Setup common mock scenarios
  setupSuccessScenario(): void {
    this.mockClaudeFlowInit();
    this.mockClaudeFlowSpawnAgent();
    this.mockClaudeFlowOrchestrate();
    this.mockClaudeFlowStatus();
    this.mockCodexExecute();
    this.mockDockerCreate();
    this.mockDockerList();
    this.mockDockerStop();
    this.mockDockerRemove();
    this.mockStateSave();
    this.mockStateLoad();
  }

  setupErrorScenario(): void {
    this.mockClaudeFlowInit({ success: false, error: 'Initialization failed' });
    this.mockCodexExecuteError();
    this.mockNetworkError();
    this.mockServerError();
  }

  setupPerformanceScenario(): void {
    // Simulate slower responses for performance testing
    this.mockClaudeFlowInit().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        swarm_id: `swarm_${Date.now()}`,
        status: 'initialized'
      }), 1000))
    );
    
    this.mockCodexExecute().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        output: 'Slow execution',
        execution_time: 2000,
        status: 'completed'
      }), 2000))
    );
  }
}

export default APIMocks;