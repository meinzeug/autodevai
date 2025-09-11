/**
 * Integration Tests for AutoDev-AI Orchestration System
 * Tests the complete integration between OpenRouter, Claude-Flow, and Codex services
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { OpenRouterClient, OpenRouterConfig } from '../../src/services/openrouter';
import { ClaudeFlowOrchestrator } from '../../src/services/claude-flow';
import { CodexIntegration } from '../../src/services/codex';

describe('AutoDev-AI Integration Orchestration', () => {
  let openRouterClient: OpenRouterClient;
  let orchestrator: ClaudeFlowOrchestrator;
  let codex: CodexIntegration;
  let testSwarmId: string;

  const mockConfig: OpenRouterConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    fallbackModels: ['anthropic/claude-3-haiku', 'openai/gpt-4-turbo'],
    timeout: 30000,
    retryAttempts: 3
  };

  // Mock fetch for testing
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeAll(async () => {
    // Initialize services
    openRouterClient = new OpenRouterClient(mockConfig);
    orchestrator = new ClaudeFlowOrchestrator(openRouterClient);
    codex = new CodexIntegration(openRouterClient);
  });

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear();
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-completion-id',
        model: 'anthropic/claude-3.5-sonnet',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Test response content'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250
        }
      })
    });
  });

  afterAll(async () => {
    // Cleanup any active swarms
    if (testSwarmId) {
      // In a real implementation, you'd clean up the swarm
    }
  });

  describe('OpenRouter Client Integration', () => {
    test('should initialize with correct configuration', () => {
      expect(openRouterClient).toBeDefined();
    });

    test('should select optimal model based on task complexity', async () => {
      const task = 'Implement a complex distributed system with consensus algorithm';
      const complexity = {
        computational: 0.9,
        logical: 0.9,
        creative: 0.6,
        domain_specific: 0.8
      };

      const selectedModel = await openRouterClient.selectOptimalModel(task, complexity);
      
      expect(selectedModel).toBe('anthropic/claude-3.5-sonnet');
    });

    test('should handle API completion requests', async () => {
      const response = await openRouterClient.completion({
        messages: [
          { role: 'user', content: 'Write a simple function' }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      expect(response).toBeDefined();
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBe('Test response content');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle fallback on model failure', async () => {
      // Mock initial failure, then success
      mockFetch
        .mockRejectedValueOnce(new Error('Model unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'fallback-completion',
            model: 'anthropic/claude-3-haiku',
            choices: [{
              message: {
                role: 'assistant',
                content: 'Fallback response'
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 50, completion_tokens: 75, total_tokens: 125 }
          })
        });

      const response = await openRouterClient.completion({
        messages: [{ role: 'user', content: 'Test fallback' }]
      });

      expect(response.choices[0].message.content).toBe('Fallback response');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial call + fallback
    });

    test('should estimate costs correctly', async () => {
      const cost = await openRouterClient.estimateCost(
        'anthropic/claude-3.5-sonnet',
        1000, // prompt tokens
        500   // completion tokens
      );

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    test('should perform health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: ['model1', 'model2'] })
      });

      const isHealthy = await openRouterClient.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Claude-Flow Orchestrator Integration', () => {
    test('should initialize swarm with specified topology', async () => {
      testSwarmId = await orchestrator.initializeSwarm({
        type: 'mesh',
        maxAgents: 8,
        strategy: 'specialized'
      });

      expect(testSwarmId).toBeDefined();
      expect(testSwarmId).toMatch(/^swarm_\d+_[a-z0-9]+$/);

      const status = await orchestrator.getSwarmStatus(testSwarmId);
      expect(status.topology).toBe('mesh');
      expect(status.status).toBe('active');
    });

    test('should spawn agents with different specializations', async () => {
      const agentTypes = ['researcher', 'coder', 'architect', 'tester', 'reviewer'];
      const spawnedAgents = [];

      for (const agentType of agentTypes) {
        const agentId = await orchestrator.spawnAgent(testSwarmId, agentType);
        expect(agentId).toBeDefined();
        expect(agentId).toMatch(/^agent_\d+_[a-z0-9]+$/);
        spawnedAgents.push(agentId);
      }

      const status = await orchestrator.getSwarmStatus(testSwarmId);
      expect(status.agents).toHaveLength(agentTypes.length);
    });

    test('should orchestrate tasks with adaptive strategy', async () => {
      // Mock multiple successful completions for different agents
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'task-completion',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Task completed successfully by agent'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 200, completion_tokens: 300, total_tokens: 500 }
        })
      });

      const taskId = await orchestrator.orchestrateTask({
        swarmId: testSwarmId,
        task: 'Design and implement a REST API with authentication',
        priority: {
          level: 'high',
          dependencies: []
        },
        complexity: {
          computational: 0.7,
          logical: 0.8,
          creative: 0.5,
          domain_specific: 0.9
        },
        strategy: 'adaptive',
        maxAgents: 3
      });

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);

      const taskStatus = await orchestrator.getTaskStatus(taskId);
      expect(taskStatus).toBeDefined();
      expect(taskStatus.id).toBe(taskId);
    });

    test('should simulate team discussions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'discussion-response',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: 'I think we should consider using microservices architecture for better scalability.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 150, completion_tokens: 100, total_tokens: 250 }
        })
      });

      const discussion = await orchestrator.simulateTeamDiscussion(
        'Architecture decisions for the new project',
        ['architect', 'coder', 'reviewer']
      );

      expect(discussion).toContain('Team Discussion:');
      expect(discussion).toContain('Round 1');
      expect(discussion).toContain('**architect**:');
      expect(discussion).toContain('**coder**:');
      expect(discussion).toContain('**reviewer**:');
    });

    test('should manage memory operations', async () => {
      await orchestrator.storeMemory('test-key', { data: 'test-value', timestamp: new Date() });
      
      const retrieved = await orchestrator.retrieveMemory('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved.data).toBe('test-value');

      const keys = await orchestrator.listMemoryKeys();
      expect(keys).toContain('test-key');
    });

    test('should handle coordination hooks', async () => {
      const hooks = orchestrator.getHooks();
      expect(hooks).toBeDefined();
      expect(typeof hooks.preTask).toBe('function');
      expect(typeof hooks.postEdit).toBe('function');
      expect(typeof hooks.postTask).toBe('function');

      // Test hook execution
      await expect(hooks.preTask('Test task description')).resolves.not.toThrow();
      await expect(hooks.postEdit('test-file.ts', 'memory-key')).resolves.not.toThrow();
      await expect(hooks.postTask('test-task-id')).resolves.not.toThrow();
    });
  });

  describe('Codex Integration', () => {
    test('should generate code in various languages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'code-generation',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: `Here's the requested code:

\`\`\`typescript
function binarySearch<T>(arr: T[], target: T): number {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}
\`\`\`

This implements a binary search algorithm with O(log n) time complexity.

Suggestions:
- Add input validation for sorted arrays
- Consider using generics for better type safety
- Add JSDoc documentation`
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
        })
      });

      const result = await codex.generateCode({
        prompt: 'Implement a binary search algorithm',
        language: 'typescript',
        task_type: 'generation',
        temperature: 0.3
      });

      expect(result).toBeDefined();
      expect(result.code).toContain('function binarySearch');
      expect(result.explanation).toContain('binary search algorithm');
      expect(result.suggestions).toContain('Add input validation');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.model_used).toBe('anthropic/claude-3.5-sonnet');
    });

    test('should analyze code quality and issues', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'code-analysis',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: `Code Analysis Results:

Complexity: 6.5/10
Maintainability: 7.0/10
Security: 8.0/10
Performance: 7.5/10

Issues found:
- Warning: Function lacks input validation
- Suggestion: Consider adding error handling for edge cases
- Error: Potential null pointer exception at line 15

Recommendations:
- Add comprehensive input validation
- Implement proper error handling
- Consider using TypeScript for better type safety
- Add unit tests for edge cases`
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 }
        })
      });

      const sampleCode = `
function processData(data) {
  return data.map(item => item.value * 2);
}
`;

      const analysis = await codex.analyzeCode(sampleCode, 'javascript');

      expect(analysis).toBeDefined();
      expect(analysis.complexity_score).toBe(6.5);
      expect(analysis.maintainability).toBe(7.0);
      expect(analysis.security_score).toBe(8.0);
      expect(analysis.performance_score).toBe(7.5);
      expect(analysis.issues).toHaveLength(3);
      expect(analysis.recommendations).toContain('Add comprehensive input validation');
    });

    test('should optimize code for performance', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'code-optimization',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: `Optimized Code:

\`\`\`javascript
// Optimized version with memoization and better algorithmic complexity
const memoCache = new Map();

function optimizedFunction(input) {
  if (memoCache.has(input)) {
    return memoCache.get(input);
  }
  
  const result = efficientAlgorithm(input);
  memoCache.set(input, result);
  return result;
}
\`\`\`

Improvements made:
Performance: Added memoization to cache results
Memory: Efficient data structure usage
Readability: Better variable naming and comments

Expected performance gain: 75%`
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 180, completion_tokens: 120, total_tokens: 300 }
        })
      });

      const originalCode = `
function slowFunction(input) {
  // Inefficient implementation
  return expensiveComputation(input);
}
`;

      const optimization = await codex.optimizeCode(
        originalCode,
        'javascript',
        ['performance', 'memory']
      );

      expect(optimization).toBeDefined();
      expect(optimization.original_code).toBe(originalCode);
      expect(optimization.optimized_code).toContain('memoCache');
      expect(optimization.improvements).toHaveLength(3);
      expect(optimization.performance_gain).toBe(75);
    });

    test('should debug problematic code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'code-debug',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: `Debugged Code:

\`\`\`javascript
function fixedFunction(arr) {
  // Fixed: Added null check and array validation
  if (!arr || !Array.isArray(arr)) {
    return [];
  }
  
  // Fixed: Proper array iteration
  return arr.filter(item => item != null).map(item => item.toString());
}
\`\`\`

Bug fixes:
1. Added null/undefined validation for input parameter
2. Fixed array iteration logic
3. Added proper type checking

Prevention suggestions:
- Always validate input parameters
- Use TypeScript for better type safety
- Add comprehensive unit tests`
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 120, completion_tokens: 180, total_tokens: 300 }
        })
      });

      const buggyCode = `
function buggyFunction(arr) {
  return arr.map(item => item.toString());
}
`;

      const debugResult = await codex.debugCode(
        buggyCode,
        'javascript',
        'TypeError: Cannot read property "map" of null'
      );

      expect(debugResult).toBeDefined();
      expect(debugResult.code).toContain('Array.isArray');
      expect(debugResult.explanation).toContain('Added null check');
      expect(debugResult.suggestions).toContain('Always validate input');
    });

    test('should complete partial code intelligently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'code-completion',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: `Completed Code:

\`\`\`typescript
class APIClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    };
  }
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'GET',
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(\`API request failed: \${response.status}\`);
    }
    
    return response.json();
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(\`API request failed: \${response.status}\`);
    }
    
    return response.json();
  }
}
\`\`\`

This completes the API client class with GET and POST methods, proper error handling, and TypeScript types.`
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 250, total_tokens: 330 }
        })
      });

      const partialCode = `
class APIClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(baseUrl: string, apiKey: string) {
    // TODO: Complete the constructor
`;

      const completion = await codex.completeCode(
        partialCode,
        'typescript',
        'create a REST API client'
      );

      expect(completion).toBeDefined();
      expect(completion.code).toContain('this.baseUrl');
      expect(completion.code).toContain('async get<T>');
      expect(completion.code).toContain('async post<T>');
    });

    test('should track language statistics', async () => {
      // Simulate some code generation history
      await codex.generateCode({
        prompt: 'Test function',
        language: 'typescript',
        task_type: 'generation'
      });

      const stats = await codex.getLanguageStatistics();
      expect(stats).toBeDefined();
      
      const tsStats = stats.get('typescript');
      expect(tsStats).toBeDefined();
      expect(tsStats.requests).toBeGreaterThan(0);
      expect(tsStats.averageConfidence).toBeGreaterThan(0);
      expect(tsStats.taskTypes.has('generation')).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    test('should handle complete development workflow', async () => {
      // Mock responses for different workflow stages
      const workflowResponses = [
        'System architecture designed with microservices pattern',
        'Authentication service implemented with JWT tokens',
        'API endpoints created with proper validation',
        'Unit tests written with 95% coverage',
        'Code reviewed and security issues addressed'
      ];

      let responseIndex = 0;
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({
            id: `workflow-step-${responseIndex}`,
            model: 'anthropic/claude-3.5-sonnet',
            choices: [{
              message: {
                role: 'assistant',
                content: workflowResponses[responseIndex++] || 'Task completed'
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 100, completion_tokens: 150, total_tokens: 250 }
          })
        })
      );

      // Initialize development environment
      const devSwarmId = await orchestrator.initializeSwarm({
        type: 'hierarchical',
        maxAgents: 5,
        strategy: 'specialized'
      });

      // Spawn development team
      const architect = await orchestrator.spawnAgent(devSwarmId, 'architect');
      const coder = await orchestrator.spawnAgent(devSwarmId, 'coder');
      const tester = await orchestrator.spawnAgent(devSwarmId, 'tester');
      const reviewer = await orchestrator.spawnAgent(devSwarmId, 'reviewer');

      // Execute development workflow
      const workflowTask = await orchestrator.orchestrateTask({
        swarmId: devSwarmId,
        task: 'Build a complete authentication microservice',
        priority: { level: 'critical', dependencies: [] },
        complexity: {
          computational: 0.8,
          logical: 0.9,
          creative: 0.6,
          domain_specific: 0.9
        },
        strategy: 'sequential'
      });

      // Generate specific code components
      const authCode = await codex.generateCode({
        prompt: 'JWT authentication middleware for Express.js',
        language: 'typescript',
        task_type: 'generation'
      });

      // Verify workflow execution
      expect(devSwarmId).toBeDefined();
      expect([architect, coder, tester, reviewer]).toHaveLength(4);
      expect(workflowTask).toBeDefined();
      expect(authCode.code).toContain('function');

      // Check final status
      const finalStatus = await orchestrator.getSwarmStatus(devSwarmId);
      expect(finalStatus.agents).toHaveLength(4);
      expect(finalStatus.status).toBe('active');
    });

    test('should handle error recovery and fallbacks', async () => {
      // Mock initial failures then success
      mockFetch
        .mockRejectedValueOnce(new Error('Primary model failed'))
        .mockRejectedValueOnce(new Error('Secondary model failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'recovery-success',
            model: 'anthropic/claude-3-haiku',
            choices: [{
              message: {
                role: 'assistant',
                content: 'Successfully recovered with fallback model'
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
          })
        });

      const result = await openRouterClient.completion({
        messages: [{ role: 'user', content: 'Test error recovery' }]
      });

      expect(result.choices[0].message.content).toBe('Successfully recovered with fallback model');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    test('should handle concurrent task execution', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'concurrent-task',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Concurrent task completed successfully'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
      });

      const tasks = [
        'Design database schema',
        'Implement API endpoints',
        'Write integration tests',
        'Setup CI/CD pipeline'
      ];

      const concurrentTasks = await Promise.all(
        tasks.map(task => 
          orchestrator.orchestrateTask({
            swarmId: testSwarmId,
            task,
            priority: { level: 'medium', dependencies: [] },
            complexity: {
              computational: 0.6,
              logical: 0.7,
              creative: 0.4,
              domain_specific: 0.8
            },
            strategy: 'parallel'
          })
        )
      );

      expect(concurrentTasks).toHaveLength(4);
      concurrentTasks.forEach(taskId => {
        expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
      });
    });

    test('should integrate team discussion with code generation', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        const responses = [
          'I suggest using a event-driven architecture for better scalability',
          'We should implement proper error handling and logging',
          'Let me create the authentication middleware based on our discussion',
          `Here's the implementation:

\`\`\`typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};
\`\`\`

This middleware validates JWT tokens and adds user info to the request.`
        ];

        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: `integrated-response-${callCount}`,
            model: 'anthropic/claude-3.5-sonnet',
            choices: [{
              message: {
                role: 'assistant',
                content: responses[callCount - 1] || 'Default response'
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 100, completion_tokens: 150, total_tokens: 250 }
          })
        });
      });

      // Simulate team discussion
      const discussion = await orchestrator.simulateTeamDiscussion(
        'How should we implement authentication for the API?',
        ['architect', 'coder']
      );

      // Generate code based on discussion
      const authImplementation = await codex.generateCode({
        prompt: 'Create Express.js JWT authentication middleware based on team discussion',
        language: 'typescript',
        task_type: 'generation',
        context: discussion
      });

      expect(discussion).toContain('Team Discussion:');
      expect(discussion).toContain('event-driven architecture');
      expect(authImplementation.code).toContain('authMiddleware');
      expect(authImplementation.code).toContain('jwt.verify');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track performance metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'perf-test',
          model: 'anthropic/claude-3.5-sonnet',
          choices: [{
            message: { role: 'assistant', content: 'Performance test response' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
          cost: 0.002
        })
      });

      // Execute multiple requests to generate metrics
      for (let i = 0; i < 3; i++) {
        await openRouterClient.completion({
          messages: [{ role: 'user', content: `Test request ${i}` }]
        });
      }

      const metrics = await openRouterClient.getModelPerformance();
      expect(metrics).toBeDefined();
      expect(metrics.size).toBeGreaterThan(0);

      const claudeMetrics = metrics.get('anthropic/claude-3.5-sonnet');
      expect(claudeMetrics).toBeDefined();
      expect(claudeMetrics.totalRequests).toBe(3);
      expect(claudeMetrics.totalTokens).toBe(225); // 75 * 3
    });

    test('should estimate costs accurately', async () => {
      const estimatedCost = await openRouterClient.estimateCost(
        'anthropic/claude-3.5-sonnet',
        1000, // prompt tokens
        500   // completion tokens
      );

      expect(estimatedCost).toBeGreaterThan(0);
      expect(estimatedCost).toBeLessThan(1); // Should be reasonable cost
    });

    test('should handle memory operations efficiently', async () => {
      const testData = {
        complex: { nested: { data: Array.from({ length: 1000 }, (_, i) => i) } },
        timestamp: new Date(),
        metadata: { source: 'test', version: '1.0.0' }
      };

      await orchestrator.storeMemory('large-dataset', testData);
      const retrieved = await orchestrator.retrieveMemory('large-dataset');

      expect(retrieved).toEqual(testData);
      expect(retrieved.complex.nested.data).toHaveLength(1000);
    });
  });
});