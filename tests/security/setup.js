/**
 * Jest Setup for Security Testing
 * Global configuration and test environment setup
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Extend Jest timeout for security tests
jest.setTimeout(60000);

// Global test configuration
global.SECURITY_TEST_CONFIG = {
  timeout: 60000,
  maxRetries: 3,
  testMode: 'security',
  verbose: process.env.VERBOSE === 'true',
  skipIntegration: process.env.SKIP_INTEGRATION === 'true',
  mockExternal: process.env.MOCK_EXTERNAL !== 'false'
};

// Mock external services by default for unit tests
if (global.SECURITY_TEST_CONFIG.mockExternal) {
  // Mock axios for HTTP requests
  jest.mock('axios', () => ({
    __esModule: true,
    default: {
      get: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
      post: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
      put: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
      delete: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
      create: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
        post: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} }))
      }))
    },
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} })),
      post: jest.fn(() => Promise.resolve({ data: {}, status: 200, headers: {} }))
    }))
  }));

  // Mock child_process for command execution
  jest.mock('child_process', () => ({
    execSync: jest.fn(() => 'mocked command output'),
    spawn: jest.fn(() => ({
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(0);
      })
    })),
    exec: jest.fn((cmd, callback) => callback(null, 'mocked output', ''))
  }));
}

// Global setup before all tests
beforeAll(async () => {
  console.log('🔐 Setting up security test environment...');
  
  // Create test directories
  const testDirs = [
    'tests/security/reports',
    'tests/security/logs', 
    'tests/security/temp',
    'tests/security/forensics'
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  // Initialize test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-security-testing';
  process.env.API_BASE_URL = 'http://localhost:50052';
  process.env.TEST_DB_HOST = 'localhost';
  process.env.TEST_DB_PORT = '50050';
  process.env.TEST_REDIS_HOST = 'localhost';  
  process.env.TEST_REDIS_PORT = '50051';
  
  // Disable external notifications in test mode
  process.env.SLACK_ENABLED = 'false';
  process.env.EMAIL_ALERTS = 'false';
  
  console.log('✅ Security test environment ready');
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up security test environment...');
  
  // Clean up temporary test files
  try {
    const tempFiles = await fs.readdir('tests/security/temp');
    for (const file of tempFiles) {
      await fs.unlink(path.join('tests/security/temp', file));
    }
  } catch (error) {
    // Temp directory might be empty or not exist
  }
  
  console.log('✅ Security test cleanup completed');
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Security test utilities
global.SecurityTestUtils = {
  // Generate test JWT token
  generateTestToken: (payload = {}) => {
    if (global.SECURITY_TEST_CONFIG.mockExternal) {
      return 'mock-jwt-token';
    }
    
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId: 1, role: 'user', ...payload },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  }),
  
  // Simulate network delay
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock HTTP response
  mockResponse: (data = {}, status = 200, headers = {}) => ({
    data,
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  }),
  
  // Mock security incident
  mockSecurityIncident: (type = 'test-incident', overrides = {}) => ({
    source: 'test',
    description: `Test ${type} incident`,
    indicators: [type],
    affectedSystems: ['test-system'],
    evidence: [],
    ...overrides
  }),
  
  // Check if running in CI environment
  isCI: () => Boolean(process.env.CI || process.env.GITHUB_ACTIONS),
  
  // Skip test if condition is met
  skipIf: (condition, reason) => {
    if (condition) {
      console.warn(`⚠️ Skipping test: ${reason}`);
      return test.skip;
    }
    return test;
  },
  
  // Retry test on failure
  retryOnFailure: async (testFn, maxRetries = 3) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await testFn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          console.warn(`Test failed, retrying... (${i + 1}/${maxRetries})`);
          await SecurityTestUtils.delay(1000);
        }
      }
    }
    
    throw lastError;
  }
};

// Console styling for test output
global.SecurityTestColors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Custom matchers for security testing
expect.extend({
  toBeSecure() {
    return {
      message: () => 'Expected to be secure',
      pass: true
    };
  },
  
  toHaveSecurityHeaders(received, expectedHeaders) {
    const missing = [];
    for (const header of expectedHeaders) {
      if (!received.headers || !received.headers[header.toLowerCase()]) {
        missing.push(header);
      }
    }
    
    return {
      message: () => `Expected response to have security headers: ${missing.join(', ')}`,
      pass: missing.length === 0
    };
  },
  
  toBeValidJWT(received) {
    if (!received || typeof received !== 'string') {
      return {
        message: () => 'Expected a valid JWT token string',
        pass: false
      };
    }
    
    const parts = received.split('.');
    if (parts.length !== 3) {
      return {
        message: () => 'Expected JWT to have 3 parts separated by dots',
        pass: false
      };
    }
    
    return {
      message: () => 'Expected a valid JWT token',
      pass: true
    };
  },
  
  toBeWithinSecurityThreshold(received, threshold) {
    const pass = received <= threshold;
    return {
      message: () => `Expected ${received} to be within security threshold of ${threshold}`,
      pass
    };
  }
});

console.log(`🔐 Security Testing Framework v1.0.0`);
console.log(`📋 Test Environment: ${process.env.NODE_ENV}`);
console.log(`🚀 Mock External Services: ${global.SECURITY_TEST_CONFIG.mockExternal}`);
console.log(`⏱️  Test Timeout: ${global.SECURITY_TEST_CONFIG.timeout}ms`);
console.log(`═══════════════════════════════════════════════════════`);