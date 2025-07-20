import { useEffect, useSyncExternalStore } from 'react';
import { ResearchGraphManager, GraphEvent } from '@/researchGraph';

/**
 * React hook that subscribes to ResearchGraphManager events
 * Uses useSyncExternalStore for optimal React 18 compatibility
 */
export function useResearchGraph(graphManager: ResearchGraphManager | null) {
  // Subscribe to graph changes using useSyncExternalStore
  const graphVersion = useSyncExternalStore(
    (callback) => {
      if (!graphManager) return () => {};

      const unsubscribe = graphManager.subscribe(() => {
        callback();
      });

      return unsubscribe;
    },
    () => graphManager?.getVersion() || 0,
    () => 0 // Server snapshot (for SSR)
  );

  // Get current stats
  const stats = useSyncExternalStore(
    (callback) => {
      if (!graphManager) return () => {};

      const unsubscribe = graphManager.subscribe((event: GraphEvent) => {
        // Only update stats for events that might change statistics
        if (event.type === 'node-added' ||
            event.type === 'node-completed' ||
            event.type === 'node-error' ||
            event.type === 'batch-update' ||
            event.type === 'graph-reset') {
          callback();
        }
      });

      return unsubscribe;
    },
    () => graphManager?.getStatistics() || {
      totalNodes: 0,
      totalDuration: 0,
      averageStepDuration: 0,
      errorCount: 0,
      successRate: 0,
      sourcesCollected: 0,
      uniqueCitations: 0
    },
    () => ({
      totalNodes: 0,
      totalDuration: 0,
      averageStepDuration: 0,
      errorCount: 0,
      successRate: 0,
      sourcesCollected: 0,
      uniqueCitations: 0
    })
  );

  return {
    graphVersion,
    stats,
    nodes: graphManager?.getNodes() || [],
    edges: graphManager?.getEdges() || []
  };
}

/**
 * Hook for monitoring specific graph events
 */
export function useGraphEvents(
  graphManager: ResearchGraphManager | null,
  eventTypes: GraphEvent['type'][],
  onEvent: (event: GraphEvent) => void
) {
  useEffect(() => {
    if (!graphManager) return;

    const unsubscribe = graphManager.subscribe((event: GraphEvent) => {
      if (eventTypes.includes(event.type)) {
        onEvent(event);
      }
    });

    return unsubscribe;
  }, [graphManager, eventTypes, onEvent]);
}

/**
 * Hook for getting the latest layout data
 */
export function useGraphLayout(graphManager: ResearchGraphManager | null) {
  useResearchGraph(graphManager); // Ensure we're subscribed to changes

  return useSyncExternalStore(
    (callback) => {
      if (!graphManager) return () => {};

      const unsubscribe = graphManager.subscribe(() => {
        callback();
      });

      return unsubscribe;
    },
    () => {
      if (!graphManager) return null;

      try {
        return graphManager.exportForVisualization();
      } catch (error) {
        console.error('Error exporting graph for visualization:', error);
        return null;
      }
    },
    () => null
  );
}
