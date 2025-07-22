import React from 'react';
import { GraphErrorBoundary } from './GraphErrorBoundary';

// HOC for wrapping components with error boundary
export function withGraphErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<React.ComponentProps<typeof GraphErrorBoundary>, 'children'>
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