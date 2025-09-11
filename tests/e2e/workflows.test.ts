import { test, expect, Page } from '@playwright/test';

test.describe('AutoDev-AI End-to-End Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]');
  });

  test.describe('Swarm Initialization Workflow', () => {
    test('should initialize swarm with mesh topology', async ({ page }) => {
      // Navigate to swarm configuration
      await page.click('[data-testid="swarm-config-tab"]');
      
      // Configure swarm settings
      await page.selectOption('[data-testid="topology-select"]', 'mesh');
      await page.fill('[data-testid="max-agents-input"]', '5');
      await page.selectOption('[data-testid="strategy-select"]', 'balanced');
      
      // Initialize swarm
      await page.click('[data-testid="initialize-swarm"]');
      
      // Wait for initialization
      await page.waitForSelector('[data-testid="swarm-status-active"]', { timeout: 10000 });
      
      // Verify swarm is active
      const statusText = await page.textContent('[data-testid="swarm-status"]');
      expect(statusText).toContain('Active');
      
      // Verify swarm ID is displayed
      const swarmId = await page.textContent('[data-testid="swarm-id"]');
      expect(swarmId).toMatch(/^swarm_/);
    });

    test('should handle swarm initialization errors', async ({ page }) => {
      // Navigate to swarm configuration
      await page.click('[data-testid="swarm-config-tab"]');
      
      // Leave required fields empty
      await page.click('[data-testid="initialize-swarm"]');
      
      // Check for error message
      await page.waitForSelector('[data-testid="error-message"]');
      const errorText = await page.textContent('[data-testid="error-message"]');
      expect(errorText).toContain('Configuration required');
    });
  });

  test.describe('Agent Management Workflow', () => {
    test('should spawn and manage agents', async ({ page }) => {
      // Initialize swarm first
      await initializeTestSwarm(page);
      
      // Navigate to agents tab
      await page.click('[data-testid="agents-tab"]');
      
      // Spawn researcher agent
      await page.click('[data-testid="spawn-agent-btn"]');
      await page.selectOption('[data-testid="agent-type-select"]', 'researcher');
      await page.fill('[data-testid="agent-name-input"]', 'test-researcher');
      await page.click('[data-testid="confirm-spawn"]');
      
      // Wait for agent to appear
      await page.waitForSelector('[data-testid="agent-test-researcher"]');
      
      // Verify agent is listed
      const agentCard = page.locator('[data-testid="agent-test-researcher"]');
      await expect(agentCard).toBeVisible();
      await expect(agentCard.locator('.agent-type')).toHaveText('researcher');
      await expect(agentCard.locator('.agent-status')).toHaveText('active');
      
      // Spawn coder agent
      await page.click('[data-testid="spawn-agent-btn"]');
      await page.selectOption('[data-testid="agent-type-select"]', 'coder');
      await page.fill('[data-testid="agent-name-input"]', 'test-coder');
      await page.click('[data-testid="confirm-spawn"]');
      
      // Verify both agents are present
      await page.waitForSelector('[data-testid="agent-test-coder"]');
      const agentCount = await page.locator('[data-testid^="agent-"]').count();
      expect(agentCount).toBe(2);
    });

    test('should remove agents', async ({ page }) => {
      await initializeTestSwarm(page);
      await spawnTestAgent(page, 'researcher', 'test-agent');
      
      // Remove agent
      await page.click('[data-testid="agent-test-agent"] [data-testid="remove-agent"]');
      await page.click('[data-testid="confirm-remove"]');
      
      // Verify agent is removed
      await page.waitForSelector('[data-testid="agent-test-agent"]', { state: 'detached' });
      const agentCount = await page.locator('[data-testid^="agent-"]').count();
      expect(agentCount).toBe(0);
    });
  });

  test.describe('Code Execution Workflow', () => {
    test('should execute JavaScript code through Codex', async ({ page }) => {
      await initializeTestSwarm(page);
      
      // Navigate to code execution
      await page.click('[data-testid="codex-tab"]');
      
      // Enter JavaScript code
      const code = 'const result = 2 + 2;\nconsole.log(`Result: ${result}`);\nresult;';
      await page.fill('[data-testid="code-editor"]', code);
      
      // Select language
      await page.selectOption('[data-testid="language-select"]', 'javascript');
      
      // Execute code
      await page.click('[data-testid="execute-code"]');
      
      // Wait for execution result
      await page.waitForSelector('[data-testid="execution-output"]', { timeout: 15000 });
      
      // Verify output
      const output = await page.textContent('[data-testid="execution-output"]');
      expect(output).toContain('Result: 4');
      expect(output).toContain('4'); // Return value
      
      // Verify execution status
      const status = await page.textContent('[data-testid="execution-status"]');
      expect(status).toBe('completed');
    });

    test('should handle code execution errors', async ({ page }) => {
      await initializeTestSwarm(page);
      
      await page.click('[data-testid="codex-tab"]');
      
      // Enter invalid JavaScript
      await page.fill('[data-testid="code-editor"]', 'this.is.invalid.syntax(();');
      await page.selectOption('[data-testid="language-select"]', 'javascript');
      await page.click('[data-testid="execute-code"]');
      
      // Wait for error
      await page.waitForSelector('[data-testid="execution-error"]');
      
      const error = await page.textContent('[data-testid="execution-error"]');
      expect(error).toContain('SyntaxError');
    });

    test('should support multiple programming languages', async ({ page }) => {
      await initializeTestSwarm(page);
      await page.click('[data-testid="codex-tab"]');
      
      const languages = [
        { lang: 'python', code: 'print("Hello from Python")', expected: 'Hello from Python' },
        { lang: 'ruby', code: 'puts "Hello from Ruby"', expected: 'Hello from Ruby' },
        { lang: 'bash', code: 'echo "Hello from Bash"', expected: 'Hello from Bash' }
      ];
      
      for (const { lang, code, expected } of languages) {
        await page.fill('[data-testid="code-editor"]', code);
        await page.selectOption('[data-testid="language-select"]', lang);
        await page.click('[data-testid="execute-code"]');
        
        await page.waitForSelector('[data-testid="execution-output"]');
        const output = await page.textContent('[data-testid="execution-output"]');
        expect(output).toContain(expected);
        
        // Clear for next test
        await page.fill('[data-testid="code-editor"]', '');
      }
    });
  });

  test.describe('Docker Management Workflow', () => {
    test('should create and manage Docker containers', async ({ page }) => {
      await initializeTestSwarm(page);
      
      // Navigate to Docker management
      await page.click('[data-testid="docker-tab"]');
      
      // Create new container
      await page.click('[data-testid="create-container"]');
      await page.fill('[data-testid="container-name"]', 'test-container');
      await page.selectOption('[data-testid="image-select"]', 'node:18-alpine');
      await page.fill('[data-testid="port-mapping"]', '3000:3000');
      await page.click('[data-testid="confirm-create"]');
      
      // Wait for container creation
      await page.waitForSelector('[data-testid="container-test-container"]', { timeout: 20000 });
      
      // Verify container is listed
      const container = page.locator('[data-testid="container-test-container"]');
      await expect(container).toBeVisible();
      await expect(container.locator('.container-status')).toHaveText('running');
      
      // Stop container
      await container.locator('[data-testid="stop-container"]').click();
      await page.click('[data-testid="confirm-stop"]');
      
      // Verify container is stopped
      await expect(container.locator('.container-status')).toHaveText('stopped');
      
      // Remove container
      await container.locator('[data-testid="remove-container"]').click();
      await page.click('[data-testid="confirm-remove"]');
      
      // Verify container is removed
      await page.waitForSelector('[data-testid="container-test-container"]', { state: 'detached' });
    });

    test('should display container logs', async ({ page }) => {
      await initializeTestSwarm(page);
      await createTestContainer(page, 'log-test');
      
      // View container logs
      await page.click('[data-testid="container-log-test"] [data-testid="view-logs"]');
      
      // Wait for logs modal
      await page.waitForSelector('[data-testid="logs-modal"]');
      
      // Verify logs are displayed
      const logs = await page.textContent('[data-testid="container-logs"]');
      expect(logs).toBeTruthy();
      
      // Close logs modal
      await page.click('[data-testid="close-logs"]');
    });
  });

  test.describe('Task Orchestration Workflow', () => {
    test('should orchestrate tasks across multiple agents', async ({ page }) => {
      await initializeTestSwarm(page);
      await spawnTestAgent(page, 'researcher', 'researcher-1');
      await spawnTestAgent(page, 'coder', 'coder-1');
      
      // Navigate to task orchestration
      await page.click('[data-testid="orchestration-tab"]');
      
      // Create new task
      await page.click('[data-testid="create-task"]');
      await page.fill('[data-testid="task-description"]', 'Analyze code quality and implement improvements');
      await page.selectOption('[data-testid="task-strategy"]', 'parallel');
      await page.selectOption('[data-testid="task-priority"]', 'high');
      await page.fill('[data-testid="max-agents"]', '2');
      
      // Submit task
      await page.click('[data-testid="submit-task"]');
      
      // Wait for task to be created
      await page.waitForSelector('[data-testid^="task-"]');
      
      // Verify task is listed
      const taskCard = page.locator('[data-testid^="task-"]').first();
      await expect(taskCard.locator('.task-status')).toHaveText('pending');
      
      // Start task execution
      await taskCard.locator('[data-testid="start-task"]').click();
      
      // Monitor task progress
      await expect(taskCard.locator('.task-status')).toHaveText('running');
      
      // Wait for completion (with timeout)
      await page.waitForFunction(
        () => {
          const status = document.querySelector('[data-testid^="task-"] .task-status')?.textContent;
          return status === 'completed' || status === 'failed';
        },
        { timeout: 30000 }
      );
    });

    test('should display task results', async ({ page }) => {
      await initializeTestSwarm(page);
      await createTestTask(page);
      
      // Click on completed task
      await page.click('[data-testid^="task-"] [data-testid="view-results"]');
      
      // Wait for results modal
      await page.waitForSelector('[data-testid="task-results-modal"]');
      
      // Verify results are displayed
      const results = await page.textContent('[data-testid="task-results"]');
      expect(results).toBeTruthy();
      
      // Check metrics
      const metrics = await page.textContent('[data-testid="task-metrics"]');
      expect(metrics).toContain('execution_time');
      expect(metrics).toContain('agents_used');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show real-time swarm status updates', async ({ page }) => {
      await initializeTestSwarm(page);
      
      // Start monitoring real-time updates
      const statusUpdates: string[] = [];
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          const data = JSON.parse(event.payload.toString());
          if (data.type === 'swarm_status') {
            statusUpdates.push(data.status);
          }
        });
      });
      
      // Trigger status change
      await spawnTestAgent(page, 'researcher', 'real-time-test');
      
      // Wait for real-time update
      await page.waitForFunction(() => statusUpdates.length > 0, { timeout: 5000 });
      
      expect(statusUpdates).toContain('agent_spawned');
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network failures', async ({ page }) => {
      await initializeTestSwarm(page);
      
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      // Try to execute code (should fail)
      await page.click('[data-testid="codex-tab"]');
      await page.fill('[data-testid="code-editor"]', 'console.log("test");');
      await page.click('[data-testid="execute-code"]');
      
      // Should show network error
      await page.waitForSelector('[data-testid="network-error"]');
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Retry should work
      await page.click('[data-testid="retry-execution"]');
      await page.waitForSelector('[data-testid="execution-output"]');
      
      const output = await page.textContent('[data-testid="execution-output"]');
      expect(output).toContain('test');
    });
  });
});

// Helper functions
async function initializeTestSwarm(page: Page) {
  await page.click('[data-testid="swarm-config-tab"]');
  await page.selectOption('[data-testid="topology-select"]', 'mesh');
  await page.fill('[data-testid="max-agents-input"]', '5');
  await page.click('[data-testid="initialize-swarm"]');
  await page.waitForSelector('[data-testid="swarm-status-active"]', { timeout: 10000 });
}

async function spawnTestAgent(page: Page, type: string, name: string) {
  await page.click('[data-testid="agents-tab"]');
  await page.click('[data-testid="spawn-agent-btn"]');
  await page.selectOption('[data-testid="agent-type-select"]', type);
  await page.fill('[data-testid="agent-name-input"]', name);
  await page.click('[data-testid="confirm-spawn"]');
  await page.waitForSelector(`[data-testid="agent-${name}"]`);
}

async function createTestContainer(page: Page, name: string) {
  await page.click('[data-testid="docker-tab"]');
  await page.click('[data-testid="create-container"]');
  await page.fill('[data-testid="container-name"]', name);
  await page.selectOption('[data-testid="image-select"]', 'node:18-alpine');
  await page.click('[data-testid="confirm-create"]');
  await page.waitForSelector(`[data-testid="container-${name}"]`);
}

async function createTestTask(page: Page) {
  await page.click('[data-testid="orchestration-tab"]');
  await page.click('[data-testid="create-task"]');
  await page.fill('[data-testid="task-description"]', 'Test task');
  await page.click('[data-testid="submit-task"]');
  await page.waitForSelector('[data-testid^="task-"]');
}