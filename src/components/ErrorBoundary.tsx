import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { cn } from '../utils/cn';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorInfo, 
  resetError 
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              An unexpected error occurred in this component
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error.message}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={resetError}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Bug className="w-4 h-4" />
              <span>{showDetails ? 'Hide' : 'Show'} Details</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Reload</span>
            </button>
          </div>

          {showDetails && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Technical Details
              </summary>
              <div className="bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded p-3">
                <div className="text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap">
                  {error.stack}
                </div>
                {errorInfo && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                      Component Stack:
                    </div>
                    <div className="text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="text-xs text-red-600 dark:text-red-400">
            If this error persists, please report it with the technical details above.
          </div>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <div className={cn("error-boundary", this.props.className)}>
          <FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObject = typeof error === 'string' ? new Error(error) : error;
    setError(errorObject);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
}

// Export functional component wrapper
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};