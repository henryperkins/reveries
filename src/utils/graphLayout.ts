import { ResearchStepType } from '@/types';

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ResearchStepType;
  title: string;
  level: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'sequential' | 'dependency' | 'error';
  points: { x: number; y: number }[];
}

export class GraphLayoutEngine {
  private nodeWidth = 200;
  private nodeHeight = 60;
  private levelHeight = 120;
  private horizontalSpacing = 250;
  private layoutCache = new Map<string, { nodes: GraphNode[]; edges: GraphEdge[]; size: number }>();
  private maxCacheSize = 50; // Limit cache size to prevent memory issues
  private maxCacheMemory = 10 * 1024 * 1024; // 10MB limit

  private generateCacheKey(nodes: { id: string; level?: number; type: ResearchStepType; label: string }[], edges: { source: string; target: string; type: string }[]): string {
    // Create a stable cache key that includes all layout-affecting properties
    const nodeKey = nodes.map(n => `${n.id}:${n.level || 0}:${n.type}:${n.label.substring(0, 20)}`).sort().join('|');
    const edgeKey = edges.map(e => `${e.source}-${e.target}-${e.type}`).sort().join('|');
    return `${nodeKey}::${edgeKey}`;
  }

  private estimateCacheEntrySize(nodes: GraphNode[], edges: GraphEdge[]): number {
    // Rough estimation of memory usage in bytes
    const nodeSize = nodes.length * 300; // ~300 bytes per node
    const edgeSize = edges.length * 200; // ~200 bytes per edge
    return nodeSize + edgeSize;
  }

  clearCache(): void {
    this.layoutCache.clear();
  }

  private evictOldEntries(): void {
    // Evict entries if cache is too large
    if (this.layoutCache.size > this.maxCacheSize) {
      const entriesToDelete = this.layoutCache.size - this.maxCacheSize + 10; // Delete extra to avoid frequent evictions
      const keys = Array.from(this.layoutCache.keys()).slice(0, entriesToDelete);
      keys.forEach(key => this.layoutCache.delete(key));
    }

    // Evict by memory usage
    let totalMemory = 0;
    const entries = Array.from(this.layoutCache.entries());
    for (const [key, value] of entries) {
      totalMemory += value.size;
      if (totalMemory > this.maxCacheMemory) {
        this.layoutCache.delete(key);
      }
    }
  }

  layoutGraph(nodes: { id: string; level?: number; type: ResearchStepType; label: string }[], edges: { source: string; target: string; type: 'sequential' | 'dependency' | 'error' }[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // Check cache first
    const cacheKey = this.generateCacheKey(nodes, edges);
    const cached = this.layoutCache.get(cacheKey);
    if (cached) {
      return { nodes: cached.nodes, edges: cached.edges };
    }

    // Adaptive spacing for large graphs
    const maxNodesPerLevel = Math.max(...Object.values(
      nodes.reduce((acc, node) => {
        const level = node.level || 0;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    ));

    // Reduce spacing for graphs with many nodes
    const adaptiveSpacing = maxNodesPerLevel > 10
      ? Math.max(180, this.horizontalSpacing - (maxNodesPerLevel - 10) * 10)
      : this.horizontalSpacing;

    // Group nodes by level
    const levels = new Map<number, typeof nodes>();
    nodes.forEach(node => {
      const level = node.level || 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    });

    // Calculate positions
    const layoutNodes: GraphNode[] = [];
    levels.forEach((levelNodes, level) => {
      const levelWidth = levelNodes.length * adaptiveSpacing;
      const startX = -levelWidth / 2 + adaptiveSpacing / 2;

      levelNodes.forEach((node, index) => {
        layoutNodes.push({
          id: node.id,
          x: startX + index * adaptiveSpacing,
          y: level * this.levelHeight,
          width: this.nodeWidth,
          height: this.nodeHeight,
          type: node.type,
          title: node.label,
          level
        });
      });
    });

    // Calculate edge paths with improved bezier curves
    const layoutEdges: GraphEdge[] = edges.map(edge => {
      const sourceNode = layoutNodes.find(n => n.id === edge.source);
      const targetNode = layoutNodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        return {
          source: edge.source,
          target: edge.target,
          type: edge.type,
          points: []
        };
      }

      // Calculate bezier curve control points with better curves for different layouts
      const startX = sourceNode.x + sourceNode.width / 2;
      const startY = sourceNode.y + sourceNode.height;
      const endX = targetNode.x + targetNode.width / 2;
      const endY = targetNode.y;

      const levelDiff = Math.abs((targetNode.level || 0) - (sourceNode.level || 0));
      const controlY = levelDiff > 1
        ? (startY + endY) / 2 + (levelDiff * 20) // More pronounced curve for distant levels
        : (startY + endY) / 2;

      return {
        source: edge.source,
        target: edge.target,
        type: edge.type,
        points: [
          { x: startX, y: startY },
          { x: startX, y: controlY },
          { x: endX, y: controlY },
          { x: endX, y: endY }
        ]
      };
    });

    const result = { nodes: layoutNodes, edges: layoutEdges };
    const entrySize = this.estimateCacheEntrySize(layoutNodes, layoutEdges);

    // Cache the result with size information
    this.layoutCache.set(cacheKey, { ...result, size: entrySize });

    // Manage cache size
    this.evictOldEntries();

    return result;
  }

  // Force-directed layout for complex graphs
  forceDirectedLayout(nodes: { id: string; type: ResearchStepType; title: string; level?: number; x?: number; y?: number; width?: number; height?: number; fx?: number; fy?: number }[], edges: { source: string; target: string }[], iterations = 100): GraphNode[] {
    const layoutNodes: GraphNode[] = nodes.map((node) => ({
      id: node.id,
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 100,
      height: node.height || 50,
      type: node.type || 'analysis',
      title: node.title || node.id,
      level: node.level || 0,
      vx: 0,
      vy: 0,
      fx: node.fx,
      fy: node.fy
    }));

    // Simple force simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Repulsive forces between all nodes
      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const dx = layoutNodes[j].x - layoutNodes[i].x;
          const dy = layoutNodes[j].y - layoutNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0 && dist < 300) {
            const force = 50 / (dist * dist);
            layoutNodes[i].x -= dx * force;
            layoutNodes[i].y -= dy * force;
            layoutNodes[j].x += dx * force;
            layoutNodes[j].y += dy * force;
          }
        }
      }

      // Attractive forces along edges
      edges.forEach(edge => {
        const source = layoutNodes.find(n => n.id === edge.source);
        const target = layoutNodes.find(n => n.id === edge.target);

        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0) {
            const force = dist * 0.01;
            source.x += dx * force;
            target.x -= dx * force;
          }
        }
      });

      // Keep nodes at their assigned levels
      layoutNodes.forEach(node => {
        node.y = node.level * this.levelHeight;
      });
    }

    return layoutNodes;
  }
}

export function getNodeStyle(type: ResearchStepType): {
  background: string;
  border: string;
  textColor: string;
  icon?: string;
} {
  const styles = {
    [ResearchStepType.USER_QUERY]: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: '#1e40af',
      textColor: '#ffffff',
      icon: '❓'
    },
    [ResearchStepType.GENERATING_QUERIES]: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      border: '#6d28d9',
      textColor: '#ffffff',
      icon: '🔍'
    },
    [ResearchStepType.WEB_RESEARCH]: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      border: '#0e7490',
      textColor: '#ffffff',
      icon: '🌐'
    },
    [ResearchStepType.REFLECTION]: {
      background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
      border: '#7e22ce',
      textColor: '#ffffff',
      icon: '💭'
    },
    [ResearchStepType.SEARCHING_FINAL_ANSWER]: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      border: '#b45309',
      textColor: '#ffffff',
      icon: '⚡'
    },
    [ResearchStepType.FINAL_ANSWER]: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: '#047857',
      textColor: '#ffffff',
      icon: '✅'
    },
    [ResearchStepType.ERROR]: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      border: '#b91c1c',
      textColor: '#ffffff',
      icon: '❌'
    },
    [ResearchStepType.ANALYTICS]: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      border: '#4338ca',
      textColor: '#ffffff',
      icon: '📊'
    }
  };

  return styles[type] || {
    background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    border: '#334155',
    textColor: '#ffffff'
  };
}
