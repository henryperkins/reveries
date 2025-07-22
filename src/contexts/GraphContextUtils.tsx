import { useContext, useMemo } from 'react';
import GraphContext, { GraphSnapshot, GraphStatistics } from './GraphContext';

export function useGraphContext() {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphContextProvider');
  }
  return context;
}

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
        await graphManager.addNode(nodeData);
        await refreshGraph();
      } catch (error) {
        console.error('Failed to add node:', error);
        throw error;
      }
    },

    updateNodeDuration: async (nodeId: string) => {
      if (!graphManager) throw new Error('Graph manager not available');
      try {
        graphManager.updateNodeDuration(nodeId);
        await refreshGraph();
      } catch (error) {
        console.error('Failed to update node duration:', error);
        throw error;
      }
    },

    exportGraph: () => {
      if (!graphManager) throw new Error('Graph manager not available');
      return graphManager.exportForVisualization();
    },

    // Additional operations as needed...
  }), [refreshGraph, graphManager]);
}