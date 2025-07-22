/**
 * Comprehensive tests for Graph Components
 * Tests layout engine, graph manager, and UI components
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GraphLayoutEngine, getNodeStyle } from '../utils/graphLayout';
import { ResearchGraphManager } from '../researchGraph';
import { ResearchStepType } from '../types';
import { GraphContextProvider } from '../contexts/GraphContext';
import { GraphErrorBoundary } from '../components/GraphErrorBoundary';

// Mock the database service
jest.mock('../services/databaseService', () => ({
  DatabaseService: {
    getInstance: () => ({
      saveResearchGraph: jest.fn(),
      getResearchGraph: jest.fn()
    })
  }
}));

// Mock embedding service
jest.mock('../services/ai/EmbeddingService', () => ({
  EmbeddingService: {
    getInstance: () => ({
      generateEmbedding: jest.fn()
    })
  }
}));

describe('GraphLayoutEngine', () => {
  let layoutEngine: GraphLayoutEngine;

  beforeEach(() => {
    layoutEngine = new GraphLayoutEngine();
  });

  describe('Basic Layout Calculation', () => {
    test('should layout nodes with correct positions', () => {
      const nodes = [
        { id: '1', label: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 },
        { id: '2', label: 'Node 2', type: ResearchStepType.WEB_RESEARCH, level: 1 },
        { id: '3', label: 'Node 3', type: ResearchStepType.FINAL_ANSWER, level: 2 }
      ];

      const edges = [
        { source: '1', target: '2', type: 'sequential' as const },
        { source: '2', target: '3', type: 'sequential' as const }
      ];

      const result = layoutEngine.layoutGraph(nodes, edges);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // Check that nodes are positioned correctly
      const node1 = result.nodes.find(n => n.id === '1');
      const node2 = result.nodes.find(n => n.id === '2');
      const node3 = result.nodes.find(n => n.id === '3');

      expect(node1?.y).toBeLessThan(node2!.y);
      expect(node2?.y).toBeLessThan(node3!.y);
    });

    test('should handle adaptive spacing for large graphs', () => {
      // Create a level with many nodes
      const nodes = Array.from({ length: 15 }, (_, i) => ({
        id: `node-${i}`,
        title: `Node ${i}`,
        type: ResearchStepType.WEB_RESEARCH,
        level: 0
      }));

      const result = layoutEngine.layoutGraph(nodes, []);

      expect(result.nodes).toHaveLength(15);

      // Check that spacing is reduced for large number of nodes
      const sortedNodes = result.nodes.sort((a, b) => a.x - b.x);
      const spacing = sortedNodes[1].x - sortedNodes[0].x;

      // Should be less than the base spacing of 250px
      expect(spacing).toBeLessThan(250);
      expect(spacing).toBeGreaterThanOrEqual(180); // Minimum spacing
    });

    test('should create bezier curves for multi-level edges', () => {
      const nodes = [
        { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 },
        { id: '2', title: 'Node 2', type: ResearchStepType.FINAL_ANSWER, level: 3 }
      ];

      const edges = [
        { source: '1', target: '2', type: 'sequential' as const }
      ];

      const result = layoutEngine.layoutGraph(nodes, edges);
      const edge = result.edges[0];

      // Multi-level edge should have 4 points (bezier curve)
      expect(edge.points).toHaveLength(4);
    });
  });

  describe('Edge Path Generation', () => {
    test('should create linear paths for adjacent levels', () => {
      const nodes = [
        { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 },
        { id: '2', title: 'Node 2', type: ResearchStepType.WEB_RESEARCH, level: 1 }
      ];

      const edges = [
        { source: '1', target: '2', type: 'sequential' as const }
      ];

      const result = layoutEngine.layoutGraph(nodes, edges);
      const edge = result.edges[0];

      // Adjacent levels should have simple linear connection (2 points)
      expect(edge.points).toHaveLength(2);
    });

    test('should handle missing nodes gracefully', () => {
      const nodes = [
        { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 }
      ];

      const edges = [
        { source: '1', target: 'missing', type: 'sequential' as const }
      ];

      const result = layoutEngine.layoutGraph(nodes, edges);
      const edge = result.edges[0];

      // Should return empty points array for missing nodes
      expect(edge.points).toHaveLength(0);
    });
  });

  describe('Cache Functionality', () => {
    test('should cache layout results', () => {
      const nodes = [
        { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 }
      ];

      // First call
      const result1 = layoutEngine.layoutGraph(nodes, []);

      // Second call with same data should return cached result
      const result2 = layoutEngine.layoutGraph(nodes, []);

      expect(result1).toBe(result2); // Should be same object reference (cached)
    });

    test('should invalidate cache when nodes change', () => {
      const nodes1 = [
        { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 }
      ];

      const nodes2 = [
        { id: '1', title: 'Node 1 Modified', type: ResearchStepType.USER_QUERY, level: 0 }
      ];

      const result1 = layoutEngine.layoutGraph(nodes1, []);
      const result2 = layoutEngine.layoutGraph(nodes2, []);

      expect(result1).not.toBe(result2); // Should be different objects (cache miss)
    });
  });
});

describe('getNodeStyle', () => {
  test('should return correct styles for each node type', () => {
    const userQueryStyle = getNodeStyle(ResearchStepType.USER_QUERY);
    expect(userQueryStyle).toHaveProperty('background');
    expect(userQueryStyle).toHaveProperty('border');
    expect(userQueryStyle).toHaveProperty('textColor');
    expect(userQueryStyle).toHaveProperty('icon');

    const errorStyle = getNodeStyle(ResearchStepType.ERROR);
    expect(errorStyle.background).toContain('#ef4444'); // Red color for errors
  });

  test('should handle unknown node types', () => {
    const unknownStyle = getNodeStyle('UNKNOWN_TYPE' as ResearchStepType);
    expect(unknownStyle).toHaveProperty('background');
    expect(unknownStyle.background).toContain('#64748b'); // Default slate color
  });
});

describe('ResearchGraphManager', () => {
  let graphManager: ResearchGraphManager;

  beforeEach(() => {
    graphManager = new ResearchGraphManager();
  });

  describe('Node Management', () => {
    test('should add nodes correctly', async () => {
      const nodeData = {
        type: ResearchStepType.USER_QUERY,
        title: 'Test Query',
        parentId: undefined
      };

      const nodeId = await graphManager.addNode(nodeData);
      expect(nodeId).toBeDefined();
      expect(typeof nodeId).toBe('string');

      const nodes = graphManager.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].title).toBe('Test Query');
    });

    test('should handle node hierarchy', async () => {
      const parentId = await graphManager.addNode({
        type: ResearchStepType.USER_QUERY,
        title: 'Parent',
        parentId: undefined
      });

      const childId = await graphManager.addNode({
        type: ResearchStepType.WEB_RESEARCH,
        title: 'Child',
        parentId
      });

      const nodes = graphManager.getNodes();
      expect(nodes).toHaveLength(2);

      const parentNode = nodes.find(n => n.id === parentId);
      expect(parentNode?.children).toContain(childId);
    });

    test('should update node duration', () => {
      const nodeId = 'test-node-id';
      graphManager.updateNodeDuration(nodeId, 1500);

      // Should not throw - method should handle non-existent nodes gracefully
      expect(() => graphManager.updateNodeDuration('non-existent', 1000)).not.toThrow();
    });

    test('should mark nodes as complete', () => {
      const nodeId = 'test-node-id';
      graphManager.completeNode(nodeId);

      // Should not throw - method should handle non-existent nodes gracefully
      expect(() => graphManager.completeNode('non-existent')).not.toThrow();
    });
  });

  describe('Statistics Calculation', () => {
    test('should calculate statistics correctly', async () => {
      // Add some test nodes
      await graphManager.addNode({
        type: ResearchStepType.USER_QUERY,
        title: 'Query 1',
        parentId: undefined
      });

      await graphManager.addNode({
        type: ResearchStepType.WEB_RESEARCH,
        title: 'Research 1',
        parentId: undefined
      });

      const stats = graphManager.getStatistics();

      expect(stats.totalNodes).toBe(2);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(typeof stats.totalDuration).toBe('number');
    });

    test('should handle empty graph statistics', () => {
      const stats = graphManager.getStatistics();

      expect(stats.totalNodes).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.averageStepDuration).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Event System', () => {
    test('should emit events when nodes are added', async () => {
      const eventListener = jest.fn();
      const unsubscribe = graphManager.subscribe(eventListener);

      await graphManager.addNode({
        type: ResearchStepType.USER_QUERY,
        title: 'Test',
        parentId: undefined
      });

      expect(eventListener).toHaveBeenCalled();
      unsubscribe();
    });

    test('should handle multiple subscribers', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = graphManager.subscribe(listener1);
      const unsubscribe2 = graphManager.subscribe(listener2);

      await graphManager.addNode({
        type: ResearchStepType.USER_QUERY,
        title: 'Test',
        parentId: undefined
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Export Functionality', () => {
    test('should export graph for visualization', async () => {
      await graphManager.addNode({
        type: ResearchStepType.USER_QUERY,
        title: 'Test Query',
        parentId: undefined
      });

      const exportData = graphManager.exportForVisualization();

      expect(exportData).toHaveProperty('nodes');
      expect(exportData).toHaveProperty('edges');
      expect(exportData.nodes).toHaveLength(1);
      expect(exportData.nodes[0]).toHaveProperty('id');
      expect(exportData.nodes[0]).toHaveProperty('label');
      expect(exportData.nodes[0]).toHaveProperty('type');
    });
  });
});

describe('GraphErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  test('should render children when no error occurs', () => {
    render(
      <GraphErrorBoundary>
        <div>Test content</div>
      </GraphErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should render error UI when child component throws', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <GraphErrorBoundary>
        <ThrowError />
      </GraphErrorBoundary>
    );

    expect(screen.getByText('Graph Rendering Error')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  test('should call retry handler', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Success</div>;
    };

    const { rerender } = render(
      <GraphErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GraphErrorBoundary>
    );

    expect(screen.getByText('Graph Rendering Error')).toBeInTheDocument();

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Re-render with no error
    rerender(
      <GraphErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GraphErrorBoundary>
    );

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  test('should call custom error handler', () => {
    const onError = jest.fn();
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <GraphErrorBoundary onError={onError}>
        <ThrowError />
      </GraphErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });
});

describe('GraphContextProvider', () => {
  test('should provide graph context', () => {
    const graphManager = new ResearchGraphManager();

    const TestComponent = () => {
      return <div>Test</div>;
    };

    render(
      <GraphContextProvider graphManager={graphManager}>
        <TestComponent />
      </GraphContextProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('should handle null graph manager', () => {
    const TestComponent = () => {
      return <div>Test</div>;
    };

    render(
      <GraphContextProvider graphManager={null}>
        <TestComponent />
      </GraphContextProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

// Integration tests
describe('Graph Integration', () => {
  test('should handle complete graph workflow', async () => {
    const graphManager = new ResearchGraphManager();

    // Add nodes
    const queryId = await graphManager.addNode({
      type: ResearchStepType.USER_QUERY,
      title: 'What is AI?',
      parentId: undefined
    });

    const researchId = await graphManager.addNode({
      type: ResearchStepType.WEB_RESEARCH,
      title: 'Researching AI',
      parentId: queryId
    });

    const answerId = await graphManager.addNode({
      type: ResearchStepType.FINAL_ANSWER,
      title: 'AI Definition',
      parentId: researchId
    });

    // Update durations
    graphManager.updateNodeDuration(queryId, 100);
    graphManager.updateNodeDuration(researchId, 5000);
    graphManager.updateNodeDuration(answerId, 2000);

    // Complete nodes
    graphManager.completeNode(queryId);
    graphManager.completeNode(researchId);
    graphManager.completeNode(answerId);

    // Test export
    const exportData = graphManager.exportForVisualization();
    expect(exportData.nodes).toHaveLength(3);
    expect(exportData.edges).toHaveLength(2);

    // Test statistics
    const stats = graphManager.getStatistics();
    expect(stats.totalNodes).toBe(3);
    expect(stats.totalDuration).toBe(7100);

    // Test layout
    const layoutEngine = new GraphLayoutEngine();
    const layoutResult = layoutEngine.layoutGraph(exportData.nodes, exportData.edges);
    expect(layoutResult.nodes).toHaveLength(3);
    expect(layoutResult.edges).toHaveLength(2);
  });
});

// Performance tests
describe('Graph Performance', () => {
  test('should handle large number of nodes efficiently', async () => {
    const graphManager = new ResearchGraphManager();
    const layoutEngine = new GraphLayoutEngine();

    const start = performance.now();

    // Add 100 nodes
    const nodeIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const nodeId = await graphManager.addNode({
        type: ResearchStepType.WEB_RESEARCH,
        title: `Node ${i}`,
        parentId: nodeIds[Math.floor(Math.random() * nodeIds.length)] || null
      });
      nodeIds.push(nodeId);
    }

    const exportData = graphManager.exportForVisualization();
    const layoutResult = layoutEngine.layoutGraph(exportData.nodes, exportData.edges);

    const end = performance.now();
    const duration = end - start;

    // Should complete within reasonable time (less than 1 second)
    expect(duration).toBeLessThan(1000);
    expect(layoutResult.nodes).toHaveLength(100);
  });

  test('should cache layout calculations', () => {
    const layoutEngine = new GraphLayoutEngine();
    const nodes = [
      { id: '1', title: 'Node 1', type: ResearchStepType.USER_QUERY, level: 0 }
    ];

    const start1 = performance.now();
    const result1 = layoutEngine.layoutGraph(nodes, []);
    const end1 = performance.now();

    const start2 = performance.now();
    const result2 = layoutEngine.layoutGraph(nodes, []);
    const end2 = performance.now();

    // Second call should be faster (cached)
    expect(end2 - start2).toBeLessThan(end1 - start1);
    expect(result1).toBe(result2); // Same object reference
  });
});

export {};
