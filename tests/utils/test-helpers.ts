import { Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestConfig {
  timeout: number;
  retries: number;
  headless: boolean;
  slowMo: number;
}

export interface SwarmConfig {
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  maxAgents: number;
  strategy: 'balanced' | 'specialized' | 'adaptive';
}

export interface AgentConfig {
  type: 'researcher' | 'coder' | 'tester' | 'reviewer' | 'optimizer';
  name: string;
  capabilities?: string[];
}

export interface ContainerConfig {
  name: string;
  image: string;
  ports?: Record<string, string>;
  environment?: Record<string, string>;
  volumes?: Record<string, string>;
}

export interface CodeExecutionConfig {
  code: string;
  language: 'javascript' | 'python' | 'bash' | 'ruby';
  environment?: string;
  timeout?: number;
}

export class TestHelpers {
  private static instance: TestHelpers;
  private testConfig: TestConfig;

  constructor(config: Partial<TestConfig> = {}) {
    this.testConfig = {
      timeout: 30000,
      retries: 2,
      headless: true,
      slowMo: 0,
      ...config
    };
  }

  static getInstance(config?: Partial<TestConfig>): TestHelpers {
    if (!TestHelpers.instance) {
      TestHelpers.instance = new TestHelpers(config);
    }
    return TestHelpers.instance;
  }

  // Swarm Management Helpers
  async initializeSwarm(page: Page, config: SwarmConfig): Promise<string> {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]');
    
    await page.click('[data-testid="swarm-config-tab"]');
    await page.selectOption('[data-testid="topology-select"]', config.topology);
    await page.fill('[data-testid="max-agents-input"]', config.maxAgents.toString());
    await page.selectOption('[data-testid="strategy-select"]', config.strategy);
    
    await page.click('[data-testid="initialize-swarm"]');
    await page.waitForSelector('[data-testid="swarm-status-active"]', { 
      timeout: this.testConfig.timeout 
    });
    
    const swarmId = await page.textContent('[data-testid="swarm-id"]');
    return swarmId || '';
  }

  async spawnAgent(page: Page, config: AgentConfig): Promise<string> {
    await page.click('[data-testid="agents-tab"]');
    await page.click('[data-testid="spawn-agent-btn"]');
    
    await page.selectOption('[data-testid="agent-type-select"]', config.type);
    await page.fill('[data-testid="agent-name-input"]', config.name);
    
    if (config.capabilities) {
      for (const capability of config.capabilities) {
        await page.check(`[data-testid="capability-${capability}"]`);
      }
    }
    
    await page.click('[data-testid="confirm-spawn"]');
    await page.waitForSelector(`[data-testid="agent-${config.name}"]`);
    
    const agentId = await page.getAttribute(`[data-testid="agent-${config.name}"]`, 'data-agent-id');
    return agentId || '';
  }

  async removeAgent(page: Page, agentName: string): Promise<void> {
    await page.click(`[data-testid="agent-${agentName}"] [data-testid="remove-agent"]`);
    await page.click('[data-testid="confirm-remove"]');
    await page.waitForSelector(`[data-testid="agent-${agentName}"]`, { state: 'detached' });
  }

  // Code Execution Helpers
  async executeCode(page: Page, config: CodeExecutionConfig): Promise<{
    output: string;
    error?: string;
    executionTime: number;
    status: string;
  }> {
    await page.click('[data-testid="codex-tab"]');
    
    await page.fill('[data-testid="code-editor"]', config.code);
    await page.selectOption('[data-testid="language-select"]', config.language);
    
    if (config.environment) {
      await page.selectOption('[data-testid="environment-select"]', config.environment);
    }
    
    if (config.timeout) {
      await page.fill('[data-testid="timeout-input"]', config.timeout.toString());
    }
    
    const startTime = Date.now();
    await page.click('[data-testid="execute-code"]');
    
    // Wait for execution to complete
    await page.waitForSelector('[data-testid="execution-status"][data-status="completed"], [data-testid="execution-status"][data-status="failed"]', {
      timeout: (config.timeout || 30) * 1000
    });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    const output = await page.textContent('[data-testid="execution-output"]') || '';
    const error = await page.textContent('[data-testid="execution-error"]') || undefined;
    const status = await page.getAttribute('[data-testid="execution-status"]', 'data-status') || 'unknown';
    
    return { output, error, executionTime, status };
  }

  // Docker Management Helpers
  async createContainer(page: Page, config: ContainerConfig): Promise<string> {
    await page.click('[data-testid="docker-tab"]');
    await page.click('[data-testid="create-container"]');
    
    await page.fill('[data-testid="container-name"]', config.name);
    await page.selectOption('[data-testid="image-select"]', config.image);
    
    if (config.ports) {
      for (const [hostPort, containerPort] of Object.entries(config.ports)) {
        await page.click('[data-testid="add-port-mapping"]');
        await page.fill('[data-testid="host-port"]', hostPort);
        await page.fill('[data-testid="container-port"]', containerPort);
      }
    }
    
    if (config.environment) {
      for (const [key, value] of Object.entries(config.environment)) {
        await page.click('[data-testid="add-env-var"]');
        await page.fill('[data-testid="env-key"]', key);
        await page.fill('[data-testid="env-value"]', value);
      }
    }
    
    await page.click('[data-testid="confirm-create"]');
    await page.waitForSelector(`[data-testid="container-${config.name}"]`, {
      timeout: 20000
    });
    
    const containerId = await page.getAttribute(`[data-testid="container-${config.name}"]`, 'data-container-id');
    return containerId || '';
  }

  async stopContainer(page: Page, containerName: string): Promise<void> {
    const container = page.locator(`[data-testid="container-${containerName}"]`);
    await container.locator('[data-testid="stop-container"]').click();
    await page.click('[data-testid="confirm-stop"]');
    await page.waitForFunction(
      (name) => {
        const containerElement = document.querySelector(`[data-testid="container-${name}"] .container-status`);
        return containerElement?.textContent === 'stopped';
      },
      containerName
    );
  }

  async removeContainer(page: Page, containerName: string): Promise<void> {
    const container = page.locator(`[data-testid="container-${containerName}"]`);
    await container.locator('[data-testid="remove-container"]').click();
    await page.click('[data-testid="confirm-remove"]');
    await page.waitForSelector(`[data-testid="container-${containerName}"]`, { state: 'detached' });
  }

  // Task Orchestration Helpers
  async createTask(page: Page, description: string, options: {
    strategy?: 'parallel' | 'sequential' | 'adaptive';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    maxAgents?: number;
  } = {}): Promise<string> {
    await page.click('[data-testid="orchestration-tab"]');
    await page.click('[data-testid="create-task"]');
    
    await page.fill('[data-testid="task-description"]', description);
    
    if (options.strategy) {
      await page.selectOption('[data-testid="task-strategy"]', options.strategy);
    }
    
    if (options.priority) {
      await page.selectOption('[data-testid="task-priority"]', options.priority);
    }
    
    if (options.maxAgents) {
      await page.fill('[data-testid="max-agents"]', options.maxAgents.toString());
    }
    
    await page.click('[data-testid="submit-task"]');
    await page.waitForSelector('[data-testid^="task-"]');
    
    const taskId = await page.getAttribute('[data-testid^="task-"]', 'data-task-id');
    return taskId || '';
  }

  async executeTask(page: Page, taskId: string): Promise<void> {
    const taskCard = page.locator(`[data-testid="task-${taskId}"]`);
    await taskCard.locator('[data-testid="start-task"]').click();
    
    // Wait for task to complete
    await page.waitForFunction(
      (id) => {
        const statusElement = document.querySelector(`[data-testid="task-${id}"] .task-status`);
        const status = statusElement?.textContent;
        return status === 'completed' || status === 'failed';
      },
      taskId,
      { timeout: 60000 }
    );
  }

  // Utility Functions
  async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(timeout);
  }

  async captureScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `tests/coverage/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  async captureNetworkLogs(page: Page): Promise<Array<Record<string, unknown>>> {
    const logs: Array<Record<string, unknown>> = [];
    
    page.on('request', request => {
      logs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });
    
    page.on('response', response => {
      logs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });
    
    return logs;
  }

  async executeCommand(command: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { stdout: '', stderr: errorMessage, success: false };
    }
  }

  async waitForCondition(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const result = await condition();
        if (result) return;
      } catch {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  generateTestData(type: 'swarm' | 'agent' | 'container' | 'task', count: number = 1): Array<Record<string, unknown>> {
    const generators = {
      swarm: () => ({
        topology: ['mesh', 'hierarchical', 'ring', 'star'][Math.floor(Math.random() * 4)],
        maxAgents: Math.floor(Math.random() * 10) + 1,
        strategy: ['balanced', 'specialized', 'adaptive'][Math.floor(Math.random() * 3)]
      }),
      
      agent: () => ({
        type: ['researcher', 'coder', 'tester', 'reviewer', 'optimizer'][Math.floor(Math.random() * 5)],
        name: `test-agent-${Math.random().toString(36).substr(2, 9)}`,
        capabilities: ['analysis', 'implementation', 'testing'][Math.floor(Math.random() * 3)]
      }),
      
      container: () => ({
        name: `test-container-${Math.random().toString(36).substr(2, 9)}`,
        image: ['node:18-alpine', 'python:3.11-alpine', 'nginx:alpine'][Math.floor(Math.random() * 3)],
        ports: { '3000': '3000' },
        environment: { NODE_ENV: 'test' }
      }),
      
      task: () => ({
        description: `Test task ${Math.random().toString(36).substr(2, 9)}`,
        strategy: ['parallel', 'sequential', 'adaptive'][Math.floor(Math.random() * 3)],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        maxAgents: Math.floor(Math.random() * 5) + 1
      })
    };
    
    return Array.from({ length: count }, () => generators[type]());
  }

  async cleanup(page: Page): Promise<void> {
    try {
      // Stop all containers
      await page.goto('/');
      await page.click('[data-testid="docker-tab"]');
      
      const containers = await page.locator('[data-testid^="container-"]').all();
      for (const container of containers) {
        const stopBtn = container.locator('[data-testid="stop-container"]');
        if (await stopBtn.isVisible()) {
          await stopBtn.click();
          await page.click('[data-testid="confirm-stop"]');
        }
        
        const removeBtn = container.locator('[data-testid="remove-container"]');
        if (await removeBtn.isVisible()) {
          await removeBtn.click();
          await page.click('[data-testid="confirm-remove"]');
        }
      }
      
      // Clear local storage and session storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

export default TestHelpers;