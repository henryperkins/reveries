import React from 'react';
import { GraphErrorBoundary } from './GraphErrorBoundary';

// Specialized error boundary for graph layout errors
export function GraphLayoutErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8 border border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
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
export function GraphCanvasErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex items-center justify-center w-full h-full border border-gray-300 rounded-lg bg-gray-50">
          <div className="text-center">
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
    </GraphErrorBoundary>
  );
}
