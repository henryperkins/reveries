import { useMemo } from 'react';
import { useGraphContext } from './GraphContextUtils';
import type { GraphSnapshot, GraphStatistics } from './GraphContext';

// Specialized hooks for specific data
export function useGraphSnapshot(): GraphSnapshot {
  const { snapshot } = useGraphContext();
  return snapshot;
}

export function useGraphStatistics(): GraphStatistics {
  const { snapshot } = useGraphContext();
  return snapshot.statistics;
}

export function useGraphOperations() {
  const { refreshGraph, graphManager } = useGraphContext();

  return useMemo(() => ({
    refreshGraph,

    // Safe graph operations with error handling
    addNode: async (nodeData: any) => {
      if (!graphManager) throw new Error('Graph manager not available');

      try {
        const result = await graphManager.addNode(nodeData);
        refreshGraph();
        return result;
      } catch (error) {
        console.error('Failed to add node:', error);
        throw error;
      }
    },

    updateNodeDuration: async (nodeId: string) => {
      if (!graphManager) throw new Error('Graph manager not available');

      try {
        graphManager.updateNodeDuration(nodeId);
        refreshGraph();
      } catch (error) {
        console.error('Failed to update node duration:', error);
        throw error;
      }
    },

    exportGraph: () => {
      if (!graphManager) throw new Error('Graph manager not available');
      return graphManager.exportForVisualization();
    }
  }), [refreshGraph, graphManager]);
}
