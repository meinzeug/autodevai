import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITE_APP_ENV = 'test';
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock Tauri API for testing
(global as any).__TAURI__ = {
  invoke: vi.fn(),
  convertFileSrc: vi.fn((filePath: string) => filePath),
  path: {
    resolve: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
  },
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    exists: vi.fn(),
  },
  event: {
    listen: vi.fn(),
    emit: vi.fn(),
  },
  window: {
    getCurrent: vi.fn(() => ({
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
    })),
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockReturnValue(new Uint8Array(16)),
    randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
  },
});

// Mock fetch API
global.fetch = vi.fn();

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock URL constructor and createObjectURL
(global as any).URL = class URL {
  constructor(public href: string) {}
  static createObjectURL = vi.fn(() => 'mock-object-url');
  static revokeObjectURL = vi.fn();
};

// Mock Worker
(global as any).Worker = class Worker extends EventTarget {
  constructor(public scriptURL: string, public options?: WorkerOptions) {
    super();
  }
  postMessage = vi.fn();
  terminate = vi.fn();
};

// Console mock for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Performance mock
global.performance = {
  ...performance,
  now: vi.fn(() => Date.now()),
};

// Request Animation Frame mock
(global as any).requestAnimationFrame = vi.fn((cb: any) => setTimeout(cb, 16));
(global as any).cancelAnimationFrame = vi.fn();