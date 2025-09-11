import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Configure timeout for unit tests
vi.setConfig({ testTimeout: 10000 });

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Global test utilities
(global as any).unitTestUtils = {
  createMockFunction: (returnValue?: any) => vi.fn().mockReturnValue(returnValue),
  createAsyncMockFunction: (returnValue?: any) => vi.fn().mockResolvedValue(returnValue),
  createMockError: (message: string = 'Test error') => new Error(message),
  createMockPromise: (resolveValue?: any, rejectValue?: any) => {
    if (rejectValue) return Promise.reject(rejectValue);
    return Promise.resolve(resolveValue);
  },
  resetAllMocks: () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  },
  createSpyOn: (object: any, method: string) => vi.spyOn(object, method),
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  runAllTimers: () => vi.runAllTimers(),
  useFakeTimers: () => vi.useFakeTimers(),
  useRealTimers: () => vi.useRealTimers(),
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock environment variables for unit tests
process.env.NODE_ENV = 'test';
process.env.VITE_APP_ENV = 'test';

// Additional unit test specific mocks
Object.defineProperty(global, 'structuredClone', {
  value: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj))),
  writable: true,
});

// Mock Canvas context for testing charts/graphics
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') {
      return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
      };
    }
    return null;
  });
}