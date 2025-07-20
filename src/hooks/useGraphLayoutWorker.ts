/**
 * React hook for managing graph layout calculations in a Web Worker
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  WorkerGraphNode, 
  WorkerGraphEdge, 
  LayoutRequest, 
  LayoutResponse, 
  LayoutNode, 
  LayoutEdge 
} from '@/utils/graphLayoutWorker';

interface UseGraphLayoutWorkerResult {
  calculateLayout: (nodes: WorkerGraphNode[], edges: WorkerGraphEdge[]) => Promise<{
    nodes: LayoutNode[];
    edges: LayoutEdge[];
  }>;
  isCalculating: boolean;
  error: string | null;
}

export function useGraphLayoutWorker(): UseGraphLayoutWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef<Map<string, {
    resolve: (result: { nodes: LayoutNode[]; edges: LayoutEdge[] }) => void;
    reject: (error: Error) => void;
  }>>(new Map());

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker from the TypeScript file
    // Note: This requires proper webpack configuration for worker loading
    try {
      workerRef.current = new Worker(
        new URL('../utils/graphLayoutWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<LayoutResponse>) => {
        const { type, requestId, nodes, edges, error: workerError } = event.data;

        if (type === 'LAYOUT_COMPLETE') {
          const pending = pendingRequestsRef.current.get(requestId);
          if (pending) {
            pendingRequestsRef.current.delete(requestId);
            
            if (workerError) {
              pending.reject(new Error(workerError));
            } else {
              pending.resolve({ nodes, edges });
            }
          }

          // Update calculating state
          setIsCalculating(pendingRequestsRef.current.size > 0);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Graph layout worker error:', error);
        setError('Worker initialization failed');
        
        // Reject all pending requests
        pendingRequestsRef.current.forEach(({ reject }) => {
          reject(new Error('Worker failed'));
        });
        pendingRequestsRef.current.clear();
        setIsCalculating(false);
      };
    } catch (err) {
      console.error('Failed to create layout worker:', err);
      setError('Worker not supported');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Reject all pending requests
      pendingRequestsRef.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      pendingRequestsRef.current.clear();
    };
  }, []);

  const calculateLayout = useCallback(async (
    nodes: WorkerGraphNode[], 
    edges: WorkerGraphEdge[]
  ): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> => {
    if (!workerRef.current) {
      throw new Error('Layout worker not available');
    }

    return new Promise((resolve, reject) => {
      const requestId = `layout-${Date.now()}-${Math.random()}`;
      
      // Store the promise handlers
      pendingRequestsRef.current.set(requestId, { resolve, reject });
      setIsCalculating(true);
      setError(null);

      // Send layout request to worker
      const request: LayoutRequest = {
        type: 'LAYOUT_GRAPH',
        nodes,
        edges,
        requestId
      };

      workerRef.current!.postMessage(request);

      // Set timeout for request
      setTimeout(() => {
        const pending = pendingRequestsRef.current.get(requestId);
        if (pending) {
          pendingRequestsRef.current.delete(requestId);
          setIsCalculating(pendingRequestsRef.current.size > 0);
          pending.reject(new Error('Layout calculation timeout'));
        }
      }, 5000); // 5 second timeout
    });
  }, []);

  return {
    calculateLayout,
    isCalculating,
    error
  };
}

// Fallback hook for when Web Workers are not available
export function useFallbackGraphLayout(): UseGraphLayoutWorkerResult {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error] = useState<string | null>(null);

  // Import the main thread layout engine as fallback
  const calculateLayout = useCallback(async (
    nodes: WorkerGraphNode[], 
    edges: WorkerGraphEdge[]
  ): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> => {
    setIsCalculating(true);
    
    try {
      // Dynamic import to avoid bundling issues
      const { GraphLayoutEngine } = await import('@/utils/graphLayout');
      const engine = new GraphLayoutEngine();
      
      // Convert worker types to main thread types
      const mainThreadNodes = nodes.map(node => ({
        id: node.id,
        label: node.title,  // GraphLayoutEngine expects 'label' not 'title'
        type: node.type,
        level: node.level,
        x: 0,
        y: 0,
        width: 200,
        height: 60,
        title: node.title
      }));

      const mainThreadEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        points: []
      }));

      const result = engine.layoutGraph(mainThreadNodes, mainThreadEdges);
      
      return {
        nodes: result.nodes as LayoutNode[],
        edges: result.edges as LayoutEdge[]
      };
    } finally {
      setIsCalculating(false);
    }
  }, []);

  return {
    calculateLayout,
    isCalculating,
    error
  };
}

// Smart hook that detects worker support and falls back gracefully
export function useSmartGraphLayout(): UseGraphLayoutWorkerResult {
  const [workerSupported, setWorkerSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect worker support
    try {
      const testWorker = new Worker(
        'data:application/javascript,self.postMessage("test")',
        { type: 'module' }
      );
      testWorker.onmessage = () => {
        setWorkerSupported(true);
        testWorker.terminate();
      };
      testWorker.onerror = () => {
        setWorkerSupported(false);
        testWorker.terminate();
      };
      testWorker.postMessage('test');
    } catch {
      setWorkerSupported(false);
    }
  }, []);

  const workerHook = useGraphLayoutWorker();
  const fallbackHook = useFallbackGraphLayout();

  if (workerSupported === null) {
    // Still detecting, return fallback with loading state
    return {
      calculateLayout: async () => ({ nodes: [], edges: [] }),
      isCalculating: true,
      error: null
    };
  }

  return workerSupported ? workerHook : fallbackHook;
}