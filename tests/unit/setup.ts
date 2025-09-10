import { jest } from '@jest/globals';

// Configure Jest for unit tests
jest.setTimeout(10000);

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Global test utilities
global.unitTestUtils = {
  createMockFunction: (returnValue?: any) => {
    return jest.fn().mockReturnValue(returnValue);
  },

  createAsyncMockFunction: (returnValue?: any) => {
    return jest.fn().mockResolvedValue(returnValue);
  },

  createMockError: (message: string = 'Test error') => {
    return new Error(message);
  },

  createMockPromise: (resolveValue?: any, rejectValue?: any) => {
    if (rejectValue) {
      return Promise.reject(rejectValue);
    }
    return Promise.resolve(resolveValue);
  },

  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  },
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});