/**
 * Web Worker for graph layout calculation
 * Moves heavy layout computation off the main thread
 */

import { ResearchStepType } from '@/types';

export interface WorkerGraphNode {
  id: string;
  title: string;
  type: ResearchStepType;
  level: number;
}

export interface WorkerGraphEdge {
  source: string;
  target: string;
  type: 'sequential' | 'dependency' | 'error';
}

export interface LayoutRequest {
  type: 'LAYOUT_GRAPH';
  nodes: WorkerGraphNode[];
  edges: WorkerGraphEdge[];
  requestId: string;
}

export interface LayoutResponse {
  type: 'LAYOUT_COMPLETE';
  requestId: string;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  error?: string;
}

export interface LayoutNode extends WorkerGraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge extends WorkerGraphEdge {
  points: { x: number; y: number }[];
}

// Worker-side GraphLayoutEngine (simplified version)
class WorkerGraphLayoutEngine {
  private nodeWidth = 200;
  private nodeHeight = 60;
  private levelHeight = 120;
  private baseHorizontalSpacing = 250;

  layoutGraph(nodes: WorkerGraphNode[], edges: WorkerGraphEdge[]): {
    nodes: LayoutNode[];
    edges: LayoutEdge[];
  } {
    try {
      // Group nodes by level
      const levels = new Map<number, WorkerGraphNode[]>();
      nodes.forEach(node => {
        if (!levels.has(node.level)) {
          levels.set(node.level, []);
        }
        levels.get(node.level)!.push(node);
      });

      // Calculate positions
      const layoutNodes: LayoutNode[] = [];
      const maxLevel = Math.max(...nodes.map(n => n.level));

      levels.forEach((levelNodes, level) => {
        // Adaptive spacing for large graphs
        const nodesPerLevel = levelNodes.length;
        const horizontalSpacing = nodesPerLevel > 10 
          ? Math.max(180, this.baseHorizontalSpacing - (nodesPerLevel - 10) * 7)
          : this.baseHorizontalSpacing;

        const totalWidth = (levelNodes.length - 1) * horizontalSpacing;
        const startX = -totalWidth / 2;

        levelNodes.forEach((node, index) => {
          layoutNodes.push({
            ...node,
            x: startX + index * horizontalSpacing - this.nodeWidth / 2,
            y: level * this.levelHeight - this.nodeHeight / 2,
            width: this.nodeWidth,
            height: this.nodeHeight
          });
        });
      });

      // Calculate edge paths
      const layoutEdges: LayoutEdge[] = edges.map(edge => {
        const sourceNode = layoutNodes.find(n => n.id === edge.source);
        const targetNode = layoutNodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) {
          return {
            ...edge,
            points: []
          };
        }

        const sourceX = sourceNode.x + sourceNode.width / 2;
        const sourceY = sourceNode.y + sourceNode.height;
        const targetX = targetNode.x + targetNode.width / 2;
        const targetY = targetNode.y;

        // Create bezier curve for multi-level connections
        const levelDiff = Math.abs(targetNode.level - sourceNode.level);
        if (levelDiff > 1) {
          const controlPointOffset = levelDiff * 30;
          const midY = (sourceY + targetY) / 2;

          return {
            ...edge,
            points: [
              { x: sourceX, y: sourceY },
              { x: sourceX, y: midY - controlPointOffset },
              { x: targetX, y: midY + controlPointOffset },
              { x: targetX, y: targetY }
            ]
          };
        } else {
          // Simple linear connection
          return {
            ...edge,
            points: [
              { x: sourceX, y: sourceY },
              { x: targetX, y: targetY }
            ]
          };
        }
      });

      return { nodes: layoutNodes, edges: layoutEdges };
    } catch (error) {
      throw new Error(`Layout calculation failed: ${error}`);
    }
  }
}

// Worker message handler
const layoutEngine = new WorkerGraphLayoutEngine();

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { type, nodes, edges, requestId } = event.data;

  if (type === 'LAYOUT_GRAPH') {
    try {
      const result = layoutEngine.layoutGraph(nodes, edges);
      
      const response: LayoutResponse = {
        type: 'LAYOUT_COMPLETE',
        requestId,
        nodes: result.nodes,
        edges: result.edges
      };

      self.postMessage(response);
    } catch (error) {
      const response: LayoutResponse = {
        type: 'LAYOUT_COMPLETE',
        requestId,
        nodes: [],
        edges: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      self.postMessage(response);
    }
  }
};

export {};