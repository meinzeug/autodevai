/**
 * Test Utilities and Helpers
 * Provides common testing utilities for React component tests
 */

import React, { ReactElement } from 'react';
import { render, RenderResult, RenderOptions } from '@testing-library/react';
import { configureStore, Store } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      app: (state = initialState, _action) => state,
    },
    preloadedState: initialState,
  });
};

// Test providers wrapper
interface ProvidersProps {
  children: React.ReactNode;
  store?: Store;
}

const TestProviders: React.FC<ProvidersProps> = ({ children, store }) => {
  const mockStore = store || createMockStore();
  
  return (
    <Provider store={mockStore}>
      {children}
    </Provider>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: Store;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    store,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup>; store: Store } => {
  const mockStore = store || createMockStore();
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders store={mockStore}>
      {children}
    </TestProviders>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  const user = userEvent.setup();

  return {
    ...result,
    user,
    store: mockStore,
  };
};

// Test data generators
export class TestDataGenerators {
  static user(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static project(overrides: Partial<any> = {}) {
    return {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'A test project',
      status: 'active',
      userId: 'test-user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static executionOutput(overrides: Partial<any> = {}) {
    return {
      id: `output-${Date.now()}-${Math.random()}`,
      type: 'stdout' as const,
      content: 'Test output',
      timestamp: new Date(),
      source: undefined,
      ...overrides,
    };
  }

  static toolStatus(overrides: Partial<any> = {}) {
    return {
      name: 'test-tool',
      status: 'active' as const,
      version: '1.0.0',
      ...overrides,
    };
  }

  static systemMetrics(overrides: Partial<any> = {}) {
    return {
      cpuUsage: 25.0,
      memoryUsage: 50.0,
      diskUsage: 75.0,
      networkActivity: 10.0,
      activeProcesses: 15,
      ...overrides,
    };
  }
}

// Mock component factories
export const createMockComponent = (displayName: string) => {
  const MockComponent = ({ children, ...props }: any) => (
    <div data-testid={displayName.toLowerCase()} {...props}>
      {displayName}
      {children}
    </div>
  );
  MockComponent.displayName = displayName;
  return MockComponent;
};

// Common test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const mockApiResponse = (data: any, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(data), delay))
  );
};

export const mockApiError = (error: Error, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  );
};

// Mock event handlers
export const mockHandlers = {
  onClick: vi.fn(),
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
  onMouseEnter: vi.fn(),
  onMouseLeave: vi.fn(),
};

// Reset all mocks
export const resetMocks = () => {
  Object.values(mockHandlers).forEach(mock => mock.mockReset());
  vi.clearAllMocks();
};

// Assert helpers
export const expectToBeInDOM = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectToHaveClass = (element: HTMLElement, className: string) => {
  expect(element).toHaveClass(className);
};

export const expectToHaveAttribute = (element: HTMLElement, attr: string, value?: string) => {
  if (value !== undefined) {
    expect(element).toHaveAttribute(attr, value);
  } else {
    expect(element).toHaveAttribute(attr);
  }
};

// Custom matchers
export const customMatchers = {
  toBeVisible: (element: HTMLElement) => {
    const pass = element.offsetParent !== null;
    return {
      message: () => `expected element to ${pass ? 'not ' : ''}be visible`,
      pass,
    };
  },
};

// Setup function for individual tests
export const setupTest = (_options: { mockStore?: boolean } = {}) => {
  const mocks = {
    ...mockHandlers,
  };

  beforeEach(() => {
    resetMocks();
  });

  return { mocks };
};

export default {
  renderWithProviders,
  TestDataGenerators,
  createMockComponent,
  waitForLoadingToFinish,
  mockApiResponse,
  mockApiError,
  mockHandlers,
  resetMocks,
  setupTest,
};