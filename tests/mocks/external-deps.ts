/**
 * Mock External Dependencies
 * Comprehensive mocking strategies for external dependencies
 */

import { vi } from 'vitest';
import * as React from 'react';

// Mock Tauri API
export const mockTauriApi = {
  invoke: vi.fn(),
  convertFileSrc: vi.fn((filePath: string) => filePath),
  path: {
    resolve: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
    join: vi.fn((...paths: string[]) => paths.join('/')),
  },
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    exists: vi.fn(),
    createDir: vi.fn(),
    removeFile: vi.fn(),
    readDir: vi.fn(),
  },
  event: {
    listen: vi.fn(),
    emit: vi.fn(),
    once: vi.fn(),
  },
  window: {
    getCurrent: vi.fn(() => ({
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      toggleMaximize: vi.fn(),
      isMaximized: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
      center: vi.fn(),
      requestUserAttention: vi.fn(),
      setResizable: vi.fn(),
      setTitle: vi.fn(),
      setFullscreen: vi.fn(),
    })),
    getAll: vi.fn(() => []),
  },
  dialog: {
    open: vi.fn(),
    save: vi.fn(),
    message: vi.fn(),
    ask: vi.fn(),
    confirm: vi.fn(),
  },
  notification: {
    sendNotification: vi.fn(),
    isPermissionGranted: vi.fn(() => Promise.resolve(true)),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  },
  shell: {
    open: vi.fn(),
  },
  process: {
    exit: vi.fn(),
    relaunch: vi.fn(),
  },
};

// Mock React Router
export const mockReactRouter = {
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  Link: ({ children, to, ...props }: any) => {
    return React.createElement('a', { href: to, ...props }, children);
  },
  NavLink: ({ children, to, ...props }: any) => {
    return React.createElement('a', { href: to, ...props }, children);
  },
  Navigate: () => null,
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }),
};

// Mock React Query
export const mockReactQuery = {
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: true,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    isSuccess: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    clear: vi.fn(),
  })),
  QueryClient: vi.fn().mockImplementation(() => ({
    defaultOptions: {},
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    clear: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
};

// Mock Zustand Store
export const createMockStore = <T>(initialState: T) => {
  let state = initialState;
  const subscribers = new Set<() => void>();

  return {
    getState: () => state,
    setState: (partial: Partial<T> | ((state: T) => T)) => {
      const nextState = typeof partial === 'function' ? partial(state) : { ...state, ...partial };
      state = nextState;
      subscribers.forEach(callback => callback());
    },
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    destroy: () => {
      subscribers.clear();
    },
  };
};

// Mock WebSocket
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(url: string, _protocols?: string | string[]) {
    super();
    this.url = url;
    
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', { data });
      if (this.onmessage) {
        this.onmessage(event);
      }
      this.dispatchEvent(event);
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    if (this.onclose) {
      this.onclose(event);
    }
    this.dispatchEvent(event);
  }

  simulateError() {
    const event = new Event('error');
    if (this.onerror) {
      this.onerror(event);
    }
    this.dispatchEvent(event);
  }
}

// Mock Socket.IO
export const mockSocketIO = {
  connect: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
    close: vi.fn(),
  })),
  Socket: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  })),
};

// Mock OpenAI/Anthropic API
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'mock-completion-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mock AI response',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
    },
  },
  images: {
    generate: vi.fn().mockResolvedValue({
      data: [{
        url: 'https://example.com/mock-image.png',
      }],
    }),
  },
  embeddings: {
    create: vi.fn().mockResolvedValue({
      data: [{
        object: 'embedding',
        embedding: Array(1536).fill(0.1),
        index: 0,
      }],
      model: 'text-embedding-ada-002',
      usage: { total_tokens: 10 },
    }),
  },
};

// Mock Anthropic API
export const mockAnthropic = {
  messages: {
    create: vi.fn().mockResolvedValue({
      id: 'mock-message-id',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Mock Claude response' }],
      model: 'claude-3-sonnet-20240229',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    }),
  },
};

// Mock Express Server (for testing server endpoints)
export const mockExpress = {
  application: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    use: vi.fn(),
    listen: vi.fn((port, callback) => {
      if (callback) setTimeout(callback, 0);
      return {
        close: vi.fn(),
        address: () => ({ port }),
      };
    }),
  },
  request: {
    params: {},
    query: {},
    body: {},
    headers: {},
    get: vi.fn(),
  },
  response: {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  },
};

// Mock Redis Client
export const mockRedis = {
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
    flushall: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    isOpen: true,
    isReady: true,
  })),
};

// Mock Docker API
export const mockDocker = {
  Docker: vi.fn().mockImplementation(() => ({
    listContainers: vi.fn().mockResolvedValue([]),
    listImages: vi.fn().mockResolvedValue([]),
    createContainer: vi.fn().mockResolvedValue({
      id: 'mock-container-id',
      start: vi.fn(),
      stop: vi.fn(),
      remove: vi.fn(),
      inspect: vi.fn().mockResolvedValue({
        State: { Running: true },
        Config: { Image: 'mock-image' },
      }),
    }),
    getContainer: vi.fn((id) => ({
      id,
      start: vi.fn(),
      stop: vi.fn(),
      remove: vi.fn(),
      inspect: vi.fn().mockResolvedValue({
        State: { Running: true },
        Config: { Image: 'mock-image' },
      }),
      logs: vi.fn().mockResolvedValue(Buffer.from('mock logs')),
    })),
    pull: vi.fn(),
  })),
};

// Mock File System Operations
export const mockFileSystem = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  rmdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date(),
    ctime: new Date(),
  }),
  exists: vi.fn().mockResolvedValue(true),
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
};

// Mock Process Environment
export const mockProcess = {
  env: {
    NODE_ENV: 'test',
    PORT: '3000',
    ...process.env,
  },
  exit: vi.fn(),
  nextTick: vi.fn((cb) => setTimeout(cb, 0)),
  cwd: vi.fn(() => '/mock/current/directory'),
  argv: ['node', 'test'],
  platform: 'linux',
  version: 'v18.0.0',
};

// Mock Console (for testing logging)
export const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  table: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  clear: vi.fn(),
};

// Mock Date for consistent testing
export const mockDate = (fixedDate?: string | number | Date) => {
  const fixed = fixedDate ? new Date(fixedDate) : new Date('2024-01-01T12:00:00Z');
  vi.setSystemTime(fixed);
  return fixed;
};

// Mock Math.random for predictable tests
export const mockMath = {
  random: vi.fn(() => 0.5),
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  max: Math.max,
  min: Math.min,
};

// Mock Crypto for UUID generation
export const mockCrypto = {
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
  subtle: {
    digest: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  },
};

// Mock Performance API
export const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
};

// Utility function to apply all mocks
export const applyAllMocks = () => {
  // Apply global mocks
  (global as any).__TAURI__ = mockTauriApi;
  (global as any).fetch = vi.fn();
  (global as any).WebSocket = MockWebSocket as any;
  (global as any).crypto = mockCrypto as any;
  (global as any).performance = mockPerformance as any;

  // Mock modules that need to be mocked at module level
  vi.mock('react-router-dom', () => mockReactRouter);
  vi.mock('@tanstack/react-query', () => mockReactQuery);
  vi.mock('socket.io-client', () => mockSocketIO);
  vi.mock('openai', () => ({ default: vi.fn(() => mockOpenAI) }));
  vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn(() => mockAnthropic) }));
  vi.mock('redis', () => mockRedis);
  vi.mock('dockerode', () => mockDocker);
  vi.mock('fs/promises', () => mockFileSystem);
};

// Utility function to reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
};

export default {
  mockTauriApi,
  mockReactRouter,
  mockReactQuery,
  createMockStore,
  MockWebSocket,
  mockSocketIO,
  mockOpenAI,
  mockAnthropic,
  mockExpress,
  mockRedis,
  mockDocker,
  mockFileSystem,
  mockProcess,
  mockConsole,
  mockDate,
  mockMath,
  mockCrypto,
  mockPerformance,
  applyAllMocks,
  resetAllMocks,
};