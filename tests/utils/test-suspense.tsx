/**
 * @fileoverview Suspense boundaries and lazy loading test utilities
 * Testing utilities for React Suspense and lazy loading components
 */

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Enhanced loading component with accessibility
export const TestLoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'medium',
  showMessage = true 
}: {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showMessage?: boolean;
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="flex items-center justify-center space-x-2 p-4"
      data-testid="loading-spinner"
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} text-blue-500`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {showMessage && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </span>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
};

// Error boundary for handling lazy loading errors
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class TestErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TestErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div 
          role="alert" 
          className="p-4 bg-red-50 border border-red-200 rounded-md"
          data-testid="error-boundary"
        >
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-2">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
export const DefaultErrorFallback = ({ error }: { error: Error }) => (
  <div 
    role="alert"
    className="p-6 bg-red-50 border border-red-200 rounded-lg"
    data-testid="error-fallback"
  >
    <div className="flex items-center space-x-2">
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      <h3 className="text-lg font-medium text-red-800">Failed to load component</h3>
    </div>
    <p className="mt-2 text-red-600">{error.message}</p>
  </div>
);

// Enhanced Suspense wrapper with timeout and error handling
export const TestSuspenseWrapper = ({ 
  children, 
  fallback = <TestLoadingSpinner />,
  timeout = 5000,
  errorBoundary = true,
  onTimeout,
  onError
}: {
  children: ReactNode;
  fallback?: ReactNode;
  timeout?: number;
  errorBoundary?: boolean;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}) => {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  if (hasTimedOut) {
    return (
      <div 
        role="alert"
        className="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
        data-testid="suspense-timeout"
      >
        <p className="text-yellow-800">Component took too long to load</p>
        <button
          onClick={() => setHasTimedOut(false)}
          className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const content = (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );

  if (errorBoundary) {
    return (
      <TestErrorBoundary fallback={DefaultErrorFallback}>
        {content}
      </TestErrorBoundary>
    );
  }

  return content;
};

// Utility for creating lazy components in tests
export const createLazyTestComponent = <P extends object>(
  componentFactory: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string
) => {
  const LazyComponent = lazy(componentFactory);
  
  if (displayName) {
    LazyComponent.displayName = displayName;
  }
  
  return LazyComponent;
};

// Mock component factory for testing lazy loading
export const createMockLazyComponent = (
  name: string,
  delay: number = 100,
  shouldError: boolean = false
) => {
  return createLazyTestComponent(
    () => new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldError) {
          reject(new Error(`Failed to load ${name} component`));
        } else {
          resolve({
            default: ({ children, ...props }: any) => (
              <div data-testid={`lazy-${name.toLowerCase()}`} {...props}>
                <h2>{name} Component</h2>
                {children}
              </div>
            )
          });
        }
      }, delay);
    }),
    `Lazy${name}`
  );
};

// Test utilities for suspense behavior
export const suspenseTestUtils = {
  // Render component with suspense and wait for loading
  renderWithSuspense: async (
    component: ReactNode,
    options?: {
      fallback?: ReactNode;
      timeout?: number;
      errorBoundary?: boolean;
    }
  ) => {
    const { fallback, timeout = 5000, errorBoundary = true } = options || {};
    
    const result = render(
      <TestSuspenseWrapper
        fallback={fallback}
        timeout={timeout}
        errorBoundary={errorBoundary}
      >
        {component}
      </TestSuspenseWrapper>
    );

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      },
      { timeout }
    );

    return result;
  },

  // Wait for lazy component to load
  waitForLazyLoad: async (testId: string, timeout: number = 5000) => {
    await waitFor(
      () => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      },
      { timeout }
    );
  },

  // Test loading state
  expectLoadingState: () => {
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  },

  // Test error state
  expectErrorState: () => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  },

  // Test timeout state
  expectTimeoutState: () => {
    expect(screen.getByTestId('suspense-timeout')).toBeInTheDocument();
    expect(screen.getByText('Component took too long to load')).toBeInTheDocument();
  },

  // Simulate network delay for testing
  simulateNetworkDelay: (delay: number = 1000) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
};

// Route-based lazy loading utility for testing
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options?: {
    fallback?: ReactNode;
    errorBoundary?: boolean;
    preload?: boolean;
  }
) => {
  const LazyComponent = lazy(importFn);
  const { fallback = <TestLoadingSpinner />, errorBoundary = true, preload = false } = options || {};

  // Preload component if requested
  if (preload) {
    importFn().catch(console.error);
  }

  const WrappedComponent = (props: any) => (
    <TestSuspenseWrapper fallback={fallback} errorBoundary={errorBoundary}>
      <LazyComponent {...props} />
    </TestSuspenseWrapper>
  );

  // Add preload method
  (WrappedComponent as any).preload = importFn;

  return WrappedComponent;
};

// Higher-order component for adding suspense to existing components
export const withSuspense = <P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    errorBoundary?: boolean;
  }
) => {
  const { fallback = <TestLoadingSpinner />, errorBoundary = true } = options || {};
  
  const SuspenseComponent = (props: P) => (
    <TestSuspenseWrapper fallback={fallback} errorBoundary={errorBoundary}>
      <Component {...props} />
    </TestSuspenseWrapper>
  );

  SuspenseComponent.displayName = `withSuspense(${Component.displayName || Component.name})`;
  
  return SuspenseComponent;
};

// Performance monitoring for lazy loading
export const createPerformanceMonitor = () => {
  const marks = new Map<string, number>();
  const measures = new Map<string, number>();

  return {
    mark: (name: string) => {
      const time = performance.now();
      marks.set(name, time);
      if (typeof performance.mark === 'function') {
        performance.mark(name);
      }
    },

    measure: (name: string, startMark: string, endMark?: string) => {
      const startTime = marks.get(startMark);
      const endTime = endMark ? marks.get(endMark) : performance.now();
      
      if (startTime && endTime) {
        const duration = endTime - startTime;
        measures.set(name, duration);
        
        if (typeof performance.measure === 'function') {
          performance.measure(name, startMark, endMark);
        }
        
        return duration;
      }
      
      return 0;
    },

    getMeasure: (name: string) => measures.get(name) || 0,
    getAllMeasures: () => Object.fromEntries(measures),
    clear: () => {
      marks.clear();
      measures.clear();
    }
  };
};

// Export all utilities
export default {
  TestLoadingSpinner,
  TestErrorBoundary,
  DefaultErrorFallback,
  TestSuspenseWrapper,
  createLazyTestComponent,
  createMockLazyComponent,
  suspenseTestUtils,
  createLazyRoute,
  withSuspense,
  createPerformanceMonitor
};