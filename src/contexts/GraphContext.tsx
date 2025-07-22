/**
 * GraphContext - Separates readonly graph data from mutating operations
 * Provides clean separation between UI state and graph manager operations
 */

import React, { createContext, useMemo, useCallback, useEffect, useState } from 'react';
import { ResearchGraphManager } from '@/researchGraph';
import { useSmartGraphLayout } from '@/hooks/useGraphLayoutWorker';
import { LayoutNode, LayoutEdge, WorkerGraphNode, WorkerGraphEdge } from '@/utils/graphLayoutWorker';

export interface GraphStatistics {
  totalNodes: number;
  totalDuration: number;
  averageStepDuration: number;
  errorCount: number;
  successRate: number;
  sourcesCollected: number;
  uniqueCitations: number;
}

export interface GraphSnapshot {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  statistics: GraphStatistics;
  version: number;
  isLoading: boolean;
  error: string | null;
}

interface GraphContextValue {
  // Readonly graph data
  snapshot: GraphSnapshot;

  // Graph operations (debounced and optimized)
  refreshGraph: () => void;

  // Layout operations
  isLayoutCalculating: boolean;
  layoutError: string | null;

  // Manager access (for operations that need direct access)
  graphManager: ResearchGraphManager | null;
}

const GraphContext = createContext<GraphContextValue | null>(null);

interface GraphContextProviderProps {
  graphManager: ResearchGraphManager | null;
  children: React.ReactNode;
}

export function GraphContextProvider({ graphManager, children }: GraphContextProviderProps) {
  const { calculateLayout, isCalculating: isLayoutCalculating, error: layoutError } = useSmartGraphLayout();

  const [snapshot, setSnapshot] = useState<GraphSnapshot>({
    nodes: [],
    edges: [],
    statistics: {
      totalNodes: 0,
      totalDuration: 0,
      averageStepDuration: 0,
      errorCount: 0,
      successRate: 0,
      sourcesCollected: 0,
      uniqueCitations: 0
    },
    version: 0,
    isLoading: false,
    error: null
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to graph manager events
  useEffect(() => {
    if (!graphManager) return;

    let timeoutId: NodeJS.Timeout;

    const handleGraphEvent = () => {
      // Debounce rapid updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 50);
    };

    const unsubscribe = graphManager.subscribe(handleGraphEvent);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [graphManager]);

  // Calculate layout when graph changes
  useEffect(() => {
    if (!graphManager) {
      setSnapshot(prev => ({
        ...prev,
        nodes: [],
        edges: [],
        statistics: {
          totalNodes: 0,
          totalDuration: 0,
          averageStepDuration: 0,
          errorCount: 0,
          successRate: 0,
          sourcesCollected: 0,
          uniqueCitations: 0
        },
        version: 0,
        isLoading: false,
        error: null
      }));
      return;
    }

    let isCancelled = false;

    const updateSnapshot = async () => {
      try {
        setSnapshot(prev => ({ ...prev, isLoading: true, error: null }));

        // Get graph data
        const graphData = graphManager.exportForVisualization();
        const statistics = graphManager.getStatistics();
        const version = graphManager.getVersion();

        // Convert to worker format
        const workerNodes: WorkerGraphNode[] = graphData.nodes.map(node => ({
          id: node.id,
          title: node.label,
          type: node.type,
          level: node.level || 0
        }));

        const workerEdges: WorkerGraphEdge[] = graphData.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          type: edge.type
        }));

        // Calculate layout in worker
        const layoutResult = await calculateLayout(workerNodes, workerEdges);

        if (!isCancelled) {
          setSnapshot({
            nodes: layoutResult.nodes,
            edges: layoutResult.edges,
            statistics,
            version,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error updating graph snapshot:', error);
          setSnapshot(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    };

    updateSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [graphManager, refreshTrigger, calculateLayout]);

  const refreshGraph = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const contextValue = useMemo<GraphContextValue>(() => ({
    snapshot,
    refreshGraph,
    isLayoutCalculating,
    layoutError,
    graphManager
  }), [snapshot, refreshGraph, isLayoutCalculating, layoutError, graphManager]);

  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
}

export default GraphContext;
