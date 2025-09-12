import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './common/Button';
import { Card } from './common/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to monitoring service if available
    if (window.electronAPI?.logError) {
      window.electronAPI.logError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorInfo, errorCount } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  An unexpected error occurred. Please try again.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Error Details</h2>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-mono text-sm text-red-600 dark:text-red-400">
                    {error.message}
                  </p>
                  {errorCount > 1 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      This error has occurred {errorCount} times
                    </p>
                  )}
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  Show technical details
                </summary>
                <div className="mt-4 bg-gray-900 dark:bg-black rounded-lg p-4 overflow-auto max-h-64">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                    {error?.stack}
                    {'\n\n'}
                    Component Stack:
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="primary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="flex items-center gap-2"
              >
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Need help?</strong> If this problem persists, please contact support or check the 
                {' '}
                <a 
                  href="https://github.com/meinzeug/autodevai/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  GitHub issues
                </a>
                {' '}
                for known problems.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;