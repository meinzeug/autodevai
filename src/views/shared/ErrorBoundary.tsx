import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Card, Button, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
  showDetails?: boolean;
  level?: 'component' | 'view' | 'app';
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // In a real application, you might want to log to an error service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This would typically send to an error tracking service like Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: this.props.level || 'component'
    };
    
    // Mock error service call
    console.warn('Would send error report to service:', errorReport);
  };

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const { level = 'component', showDetails = true } = this.props;
      
      const getErrorTitle = () => {
        switch (level) {
          case 'app': return 'Application Error';
          case 'view': return 'View Error';
          case 'component': return 'Component Error';
          default: return 'An Error Occurred';
        }
      };

      const getErrorDescription = () => {
        switch (level) {
          case 'app': return 'The application encountered an unexpected error and needs to restart.';
          case 'view': return 'This view encountered an error and cannot be displayed properly.';
          case 'component': return 'A component failed to render. Try refreshing to resolve the issue.';
          default: return 'Something went wrong. Please try again.';
        }
      };

      const getAvailableActions = () => {
        const actions = [
          {
            key: 'retry',
            label: 'Try Again',
            icon: RefreshCw,
            variant: 'default' as const,
            onClick: this.handleRetry
          }
        ];

        if (level === 'view' || level === 'app') {
          actions.push({
            key: 'reload',
            label: 'Reload Page',
            icon: RefreshCw,
            variant: 'default' as const,
            onClick: this.handleReload
          });
        }

        if (level === 'app') {
          actions.push({
            key: 'home',
            label: 'Go Home',
            icon: Home,
            variant: 'default' as const,
            onClick: this.handleGoHome
          });
        }

        return actions;
      };

      return (
        <div className={cn('p-6', this.props.className)}>
          <Card className="p-8 text-center max-w-2xl mx-auto">
            <div className="flex flex-col items-center space-y-4">
              {/* Error Icon */}
              <div className={cn(
                'rounded-full p-3',
                level === 'app' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
              )}>
                <AlertTriangle className="w-8 h-8" />
              </div>

              {/* Error Title */}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getErrorTitle()}
              </h2>

              {/* Error Description */}
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                {getErrorDescription()}
              </p>

              {/* Error ID */}
              <div className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                Error ID: {errorId}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                {getAvailableActions().map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      onClick={action.onClick}
                      className="gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>

              {/* Error Details (Collapsible) */}
              {showDetails && error && (
                <details className="w-full mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Technical Details
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      <div>
                        <h4 className="font-medium">Error Message</h4>
                        <p className="text-sm mt-1 font-mono">{error.message}</p>
                      </div>
                    </Alert>
                    
                    {error.stack && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Stack Trace</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Component Stack</h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Debugging Tips:</strong>
                        <br />• Check the browser console for additional error details
                        <br />• Verify network connectivity and API endpoints
                        <br />• Clear browser cache and localStorage if issues persist
                        <br />• Report this error with ID {errorId} if it continues
                      </p>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component with hooks support
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />;
}

// Higher-order component for easy integration
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Manual error report:', error, errorInfo);
    // This could also integrate with error reporting services
  }, []);
}

export default ErrorBoundary;