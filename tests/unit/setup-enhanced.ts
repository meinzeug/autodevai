/**
 * @fileoverview Enhanced test setup for comprehensive testing
 * Additional setup and utilities for testing environment
 */

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'whatwg-fetch'; // Polyfill for fetch in test environment

// Enhanced cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock function with enhanced tracking
  createMock: (implementation?: (...args: any[]) => any) => {
    const mock = vi.fn(implementation);
    mock.mockName = implementation?.name || 'MockFunction';
    return mock;
  },
  
  // Console utilities for testing
  suppressConsoleError: () => {
    const originalError = console.error;
    console.error = vi.fn();
    return () => { console.error = originalError; };
  },
  
  suppressConsoleWarn: () => {
    const originalWarn = console.warn;
    console.warn = vi.fn();
    return () => { console.warn = originalWarn; };
  }
};

// Enhanced window object mocking
Object.defineProperty(global.window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(global.window, 'scroll', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(global.window, 'scrollBy', {
  value: vi.fn(),
  writable: true,
});

// Enhanced URL and location mocking
Object.defineProperty(global.window, 'location', {
  value: {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// Enhanced history mocking
Object.defineProperty(global.window, 'history', {
  value: {
    length: 1,
    state: null,
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  writable: true,
});

// Mock fetch with enhanced capabilities
const createMockResponse = (body: any, init: ResponseInit = {}) => {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      ...init,
    })
  );
};

global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
  // Default successful response
  return createMockResponse({ success: true, url, options });
});

// Enhanced fetch utilities
global.fetchMock = {
  mockResponse: (body: any, init?: ResponseInit) => {
    (global.fetch as any).mockResolvedValueOnce(createMockResponse(body, init));
  },
  
  mockReject: (error: Error) => {
    (global.fetch as any).mockRejectedValueOnce(error);
  },
  
  mockNetworkError: () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));
  },
  
  mockTimeout: () => {
    (global.fetch as any).mockImplementationOnce(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );
  }
};

// Enhanced IndexedDB mocking
const indexedDBMock = {
  databases: new Map(),
  
  open: vi.fn().mockImplementation((name: string, version?: number) => {
    const request = {
      result: {
        name,
        version: version || 1,
        objectStoreNames: [],
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            add: vi.fn(),
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
            index: vi.fn(),
            createIndex: vi.fn(),
          })
        }),
        createObjectStore: vi.fn(),
        deleteObjectStore: vi.fn(),
        close: vi.fn(),
      },
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
    };
    
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);
    
    return request;
  }),
  
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
});

// Enhanced WebSocket mocking
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  send = vi.fn((data: string | ArrayBuffer | Blob) => {
    // Simulate echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 0);
  });
  
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  });
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

// Enhanced Notification API mocking
class MockNotification {
  title: string;
  options: NotificationOptions;
  onclick: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onshow: ((event: Event) => void) | null = null;
  
  constructor(title: string, options: NotificationOptions = {}) {
    this.title = title;
    this.options = options;
  }
  
  close = vi.fn();
  
  static permission: NotificationPermission = 'granted';
  
  static requestPermission = vi.fn().mockResolvedValue('granted');
}

Object.defineProperty(global, 'Notification', {
  value: MockNotification,
  writable: true,
});

// Enhanced File and FileReader mocking
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onloadstart: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
  
  readAsText = vi.fn((file: Blob) => {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = 'mock file content';
      if (this.onload) {
        this.onload({ target: this } as ProgressEvent<FileReader>);
      }
    }, 0);
  });
  
  readAsDataURL = vi.fn((file: Blob) => {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
      if (this.onload) {
        this.onload({ target: this } as ProgressEvent<FileReader>);
      }
    }, 0);
  });
  
  readAsArrayBuffer = vi.fn();
  readAsBinaryString = vi.fn();
  abort = vi.fn();
  
  static EMPTY = 0;
  static LOADING = 1;
  static DONE = 2;
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader,
  writable: true,
});

// Enhanced URL mocking for object URLs
const objectURLs = new Set<string>();

Object.defineProperty(global.URL, 'createObjectURL', {
  value: vi.fn().mockImplementation(() => {
    const url = `blob:http://localhost:3000/${Math.random().toString(36)}`;
    objectURLs.add(url);
    return url;
  }),
  writable: true,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: vi.fn().mockImplementation((url: string) => {
    objectURLs.delete(url);
  }),
  writable: true,
});

// Enhanced intersection observer with more realistic behavior
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private options: IntersectionObserverInit;
  private elements = new Set<Element>();
  
  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
  }
  
  observe = vi.fn((element: Element) => {
    this.elements.add(element);
    
    // Simulate immediate intersection for testing
    setTimeout(() => {
      const entry: IntersectionObserverEntry = {
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
        intersectionRect: element.getBoundingClientRect(),
        boundingClientRect: element.getBoundingClientRect(),
        rootBounds: null,
        time: performance.now(),
      };
      
      this.callback([entry], this);
    }, 0);
  });
  
  unobserve = vi.fn((element: Element) => {
    this.elements.delete(element);
  });
  
  disconnect = vi.fn(() => {
    this.elements.clear();
  });
}

Object.defineProperty(global, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// Enhanced performance mocking
Object.defineProperty(global, 'performance', {
  value: {
    ...global.performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    navigation: {
      type: 0,
      redirectCount: 0,
    },
    timing: {
      navigationStart: Date.now(),
      domContentLoadedEventEnd: Date.now() + 100,
      loadEventEnd: Date.now() + 200,
    },
  },
  writable: true,
});

// Test environment validation
if (typeof window === 'undefined') {
  throw new Error('Test setup requires DOM environment');
}

// Export utilities for tests
export const testHelpers = {
  // Create a mock component for testing
  createMockComponent: (name: string, props: Record<string, any> = {}) => {
    const MockComponent = ({ children, ...restProps }: Record<string, any> & { children?: React.ReactNode }) => (
      React.createElement('div', { 
        'data-testid': `mock-${name.toLowerCase()}`, 
        ...restProps 
      }, name, children)
    );
    MockComponent.displayName = `Mock${name}`;
    return MockComponent;
  },
  
  // Create realistic test data
  createTestUser: (overrides = {}) => ({
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
    ...overrides,
  }),
  
  createTestProject: (overrides = {}) => ({
    id: '1',
    name: 'Test Project',
    description: 'A test project for development',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
  
  // Simulate loading states
  simulateLoading: async (duration = 100) => {
    await new Promise(resolve => setTimeout(resolve, duration));
  },
  
  // Simulate network delay
  simulateNetworkDelay: (min = 50, max = 200) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  
  // Create mock API responses
  createApiResponse: <T>(data: T, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    config: {},
  }),
  
  createApiError: (message = 'API Error', status = 500) => {
    const error = new Error(message) as any;
    error.response = {
      status,
      statusText: 'Internal Server Error',
      data: { error: message },
    };
    return error;
  },
};

// Console logging for test debugging
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Test-specific console handling
beforeEach(() => {
  // Restore console methods for each test
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

console.info('Enhanced test setup loaded successfully');