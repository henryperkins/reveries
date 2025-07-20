/**
 * Error Boundary for Graph Components
 * Provides graceful error handling and recovery for graph-related failures
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('Graph Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          className="flex flex-col items-center justify-center p-8 border-2 border-red-200 rounded-lg bg-red-50"
          role="alert"
          aria-labelledby={`error-title-${this.state.errorId}`}
          aria-describedby={`error-description-${this.state.errorId}`}
        >
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
          
          <h2 
            id={`error-title-${this.state.errorId}`}
            className="text-xl font-semibold text-red-800 mb-2"
          >
            Graph Rendering Error
          </h2>
          
          <p 
            id={`error-description-${this.state.errorId}`}
            className="text-red-700 text-center mb-4 max-w-md"
          >
            Something went wrong while rendering the research graph. This could be due to 
            corrupted data or a temporary issue.
          </p>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Retry rendering the graph"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Reload the entire page"
            >
              Reload Page
            </button>
          </div>

          {/* Debug information in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium text-red-800 mb-2">
                Debug Information (Development Only)
              </summary>
              <div className="bg-red-100 p-4 rounded border text-xs font-mono overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div className="mb-2">
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs mt-1">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withGraphErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <GraphErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </GraphErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withGraphErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

// Specialized error boundary for graph layout errors
export function GraphLayoutErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8 border border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">Layout calculation failed</p>
            <p className="text-gray-500 text-sm mt-1">
              Unable to position graph elements. Please refresh the graph.
            </p>
          </div>
        </div>
      }
      onError={(error) => {
        console.error('Graph layout error:', error);
        // Could trigger a graph refresh or fallback layout
      }}
    >
      {children}
    </GraphErrorBoundary>
  );
}

// Specialized error boundary for canvas rendering errors
export function GraphCanvasErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex items-center justify-center w-full h-full border border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">Canvas rendering failed</p>
            <p className="text-gray-500 text-sm mt-1">
              Your browser may not support the required graphics features.
            </p>
          </div>
        </div>
      }
      onError={(error) => {
        console.error('Graph canvas error:', error);
        // Could fall back to SVG or DOM-based rendering
      }}
    >
      {children}
    </GraphCanvasErrorBoundary>
  );
}

export default GraphErrorBoundary;