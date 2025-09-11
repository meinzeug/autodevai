import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock performance.now for consistent testing
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock localStorage with proper functionality
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage with proper functionality
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

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

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock document and DOM environment for React
Object.defineProperty(document, 'activeElement', {
  get() { return null; },
  configurable: true,
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tag) => ({
    tagName: tag.toUpperCase(),
    innerHTML: '',
    style: {},
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    offsetParent: null,
    offsetTop: 0,
    offsetLeft: 0,
    offsetWidth: 0,
    offsetHeight: 0,
  })),
  writable: true,
});

// Mock HTML elements
global.HTMLElement = vi.fn();
global.HTMLIFrameElement = vi.fn();
global.HTMLImageElement = vi.fn();
global.HTMLCanvasElement = vi.fn();
global.HTMLVideoElement = vi.fn();

// Mock range and selection
global.Range = vi.fn(() => ({
  setStart: vi.fn(),
  setEnd: vi.fn(),
  collapse: vi.fn(),
  selectNodeContents: vi.fn(),
  deleteContents: vi.fn(),
  insertNode: vi.fn(),
}));

Object.defineProperty(window, 'getSelection', {
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
    toString: vi.fn(() => ''),
    rangeCount: 0,
  })),
  writable: true,
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
});

// Mock custom events and event handling
Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
});

// Mock event constructors
global.CustomEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  detail: eventInitDict?.detail,
  bubbles: eventInitDict?.bubbles || false,
  cancelable: eventInitDict?.cancelable || false,
}));

global.StorageEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  key: eventInitDict?.key || null,
  newValue: eventInitDict?.newValue || null,
  oldValue: eventInitDict?.oldValue || null,
  storageArea: eventInitDict?.storageArea || null,
  url: eventInitDict?.url || '',
}));

// Mock React scheduler and internals
global.MessageChannel = vi.fn(() => ({
  port1: { onmessage: null },
  port2: { postMessage: vi.fn() },
}));

global.requestIdleCallback = vi.fn((cb) => setTimeout(cb, 0));
global.cancelIdleCallback = vi.fn();

// Mock React DevTools
Object.defineProperty(global, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
  value: {
    checkDCE: vi.fn(),
    supportsFiber: true,
    supportsProfiling: true,
    inject: vi.fn(),
    onCommitFiberRoot: vi.fn(),
    onCommitFiberUnmount: vi.fn(),
  },
  writable: true,
});

// Mock React Scheduler internals to avoid event priority errors
const scheduler = {
  unstable_getCurrentPriorityLevel: vi.fn(() => 3), // NormalPriority
  unstable_runWithPriority: vi.fn((priority, callback) => callback()),
  unstable_scheduleCallback: vi.fn((callback) => setTimeout(callback, 0)),
  unstable_cancelCallback: vi.fn(),
  unstable_shouldYield: vi.fn(() => false),
  unstable_requestPaint: vi.fn(),
  unstable_now: vi.fn(() => performance.now()),
  unstable_ImmediatePriority: 1,
  unstable_UserBlockingPriority: 2,
  unstable_NormalPriority: 3,
  unstable_LowPriority: 4,
  unstable_IdlePriority: 5,
};

global.scheduler = scheduler;

// Mock React DOM internals
vi.mock('scheduler', () => scheduler);
vi.mock('scheduler/unstable_mock', () => scheduler);

// Mock the tauri API
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
  window: {
    getCurrent: vi.fn(),
  },
  event: {
    listen: vi.fn(),
  },
}));

// Reset functions for test cleanup
export const resetMocks = () => {
  vi.clearAllMocks();
  // Reset localStorage
  localStorageMock.clear();
  // Reset sessionStorage
  sessionStorageMock.clear();
};