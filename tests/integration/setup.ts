import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Global test timeout
vi.setConfig({ testTimeout: 30000 });

// Mock external services
export const mockServices = {
  claudeFlow: {
    baseUrl: 'http://localhost:3001',
    apiKey: 'test-claude-flow-key',
  },
  codex: {
    baseUrl: 'http://localhost:3002', 
    apiKey: 'test-codex-key',
  },
  openRouter: {
    baseUrl: 'http://localhost:3003',
    apiKey: 'test-openrouter-key',
  },
  docker: {
    host: 'localhost',
    port: 2376,
  },
};

// Test database setup
export const testDb = {
  host: 'localhost',
  port: 5433,
  database: 'autodevai_test',
  user: 'test_user',
  password: 'test_pass',
};

// Helper functions for integration tests
export const helpers = {
  async startTestServices() {
    console.log('Starting test services...');
    // Start mock services for integration testing
    return true;
  },

  async stopTestServices() {
    console.log('Stopping test services...');
    // Stop mock services
    return true;
  },

  async cleanDatabase() {
    console.log('Cleaning test database...');
    // Clean test database
    return true;
  },

  async setupTestData() {
    console.log('Setting up test data...');
    // Insert test data
    return true;
  },

  async waitForService(url: string, timeout: number = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) return true;
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Service at ${url} not ready after ${timeout}ms`);
  },

  async executeCommand(command: string) {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { success: true, stdout, stderr };
    } catch (error) {
      return { success: false, error };
    }
  },
};

// Setup before all tests
beforeAll(async () => {
  await helpers.startTestServices();
  await helpers.setupTestData();
});

// Cleanup after all tests
afterAll(async () => {
  await helpers.cleanDatabase();
  await helpers.stopTestServices();
});

// Reset state before each test
beforeEach(async () => {
  await helpers.cleanDatabase();
  await helpers.setupTestData();
});

// Export for use in test files
export { mockServices as default };