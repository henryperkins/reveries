import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResearchGraphManager, generateMermaidDiagram } from '@/researchGraph';
import { GraphLayoutEngine, getNodeStyle, GraphNode, GraphEdge } from '@/utils/graphLayout';
import { formatDuration } from '@/utils/exportUtils';
import { ChartBarIcon, XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon,
         ArrowPathIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import GraphAccessibilityLayer from './GraphAccessibilityLayer';

interface ResearchGraphViewProps {
  graphManager: ResearchGraphManager;
  isOpen: boolean;
  onClose: () => void;
}

interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
  selectedNode: string | null;
  hoveredNode: string | null;
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

interface LayoutData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number;
}

// Helper to get CSS variable value at runtime
const getCSSVar = (varName: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  return '';
};

// Theme using CSS variables from design system
const getTheme = () => ({
  background: getCSSVar('--colors-semantic-background') || '#FAF6F2',
  cardBackground: getCSSVar('--colors-semantic-surface') || '#FFFFFF',
  border: getCSSVar('--colors-semantic-border') || '#E8D5C4',
  text: getCSSVar('--colors-semantic-text') || '#2A2522',
  textSecondary: getCSSVar('--colors-semantic-text-muted') || '#8B6F47',
  accent: getCSSVar('--colors-semantic-info') || '#3B82F6',
  error: getCSSVar('--colors-semantic-error') || '#EF4444',
  success: getCSSVar('--colors-semantic-success') || '#10B981',
  warning: getCSSVar('--colors-semantic-warning') || '#F59E0B'
});

export const ResearchGraphView: React.FC<ResearchGraphViewProps> = ({
  graphManager,
  isOpen,
  onClose
}) => {
  // Consolidated view state
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedNode: null,
    hoveredNode: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });

  // Accessibility layer state
  const [showAccessibilityLayer, setShowAccessibilityLayer] = useState(false);

  const [stats, setStats] = useState(() =>
    graphManager?.getStatistics() || {
      totalNodes: 0,
      totalDuration: 0,
      averageStepDuration: 0,
      errorCount: 0,
      successRate: 0,
      sourcesCollected: 0,
      uniqueCitations: 0
    }
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutEngine = useRef(new GraphLayoutEngine());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const redrawNeeded = useRef(false);

  // Unsubscribe function for the graph manager
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Memoized layout data with version tracking
  const graphVersion = graphManager?.getVersion() || 0;
  const layoutData = useMemo<LayoutData>(() => {
    if (!graphManager) {
      console.log('No graphManager provided to ResearchGraphView');
      return { nodes: [], edges: [], version: 0 };
    }

    try {
      const graphData = graphManager.exportForVisualization();
      console.log('Graph data for visualization:', graphData);
      const { nodes, edges } = layoutEngine.current.layoutGraph(
        graphData.nodes,
        graphData.edges
      );

      console.log('Layout data generated:', { nodes: nodes.length, edges: edges.length });
      return {
        nodes,
        edges,
        version: graphVersion
      };
    } catch (error) {
      console.error('Error generating layout:', error);
      return { nodes: [], edges: [], version: 0 };
    }
  }, [graphManager, graphVersion]);

  // Subscribe to graph events for reactive updates
  useEffect(() => {
    if (!graphManager || !isOpen) return;

    console.log('Setting up graph subscription. GraphManager:', graphManager);
    console.log('GraphManager has subscribe method:', typeof graphManager.subscribe === 'function');

    const handleGraphEvent = () => {
      console.log('Graph event received!');
      // Update stats immediately
      setStats(graphManager.getStatistics());
      // Mark for redraw
      redrawNeeded.current = true;
    };

    // Subscribe to graph events
    if (typeof graphManager.subscribe === 'function') {
      unsubscribeRef.current = graphManager.subscribe(handleGraphEvent);
      console.log('Subscribed to graph events');
    } else {
      console.error('GraphManager does not have subscribe method!');
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [graphManager, isOpen]);

  // Main drawing function - split from event handling
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Reset transform to avoid cumulative scaling issues
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply transformations
      ctx.save();
      ctx.translate(rect.width / 2 + viewState.pan.x, 100 + viewState.pan.y);
      ctx.scale(viewState.zoom, viewState.zoom);

      // Draw edges first
      layoutData.edges.forEach(edge => {
        if (edge.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(edge.points[0].x, edge.points[0].y);

        if (edge.points.length === 4) {
          // Bezier curve
          ctx.bezierCurveTo(
            edge.points[1].x, edge.points[1].y,
            edge.points[2].x, edge.points[2].y,
            edge.points[3].x, edge.points[3].y
          );
        } else {
          // Linear
          edge.points.forEach((point, i) => {
            if (i > 0) ctx.lineTo(point.x, point.y);
          });
        }

        // Style based on edge type with improved contrast
        if (edge.type === 'error') {
          ctx.strokeStyle = getTheme().error;
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = getCSSVar('--colors-semantic-text-muted') || '#94a3b8';
          ctx.setLineDash([]);
          ctx.lineWidth = 1.5;
        }

        ctx.stroke();

        // Draw arrow
        if (edge.points.length >= 2) {
          const lastPoint = edge.points[edge.points.length - 1];
          const prevPoint = edge.points[edge.points.length - 2];
          const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);

          ctx.save();
          ctx.translate(lastPoint.x, lastPoint.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-10, -5);
          ctx.lineTo(-10, 5);
          ctx.closePath();
          ctx.fillStyle = edge.type === 'error' ? getTheme().error : getCSSVar('--colors-semantic-text-muted') || '#94a3b8';
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw nodes
      layoutData.nodes.forEach(node => {
        const style = getNodeStyle(node.type);
        const isHovered = node.id === viewState.hoveredNode;
        const isSelected = node.id === viewState.selectedNode;

        // Shadow for depth
        if (isHovered || isSelected) {
          ctx.shadowColor = getCSSVar('--shadows-base') ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
        }

        // Node background with gradient
        const gradient = ctx.createLinearGradient(
          node.x, node.y,
          node.x, node.y + node.height
        );

        // Extract colors from style.background
        const bgColors = style.background.match(/#[0-9a-f]{6}/gi) || [getCSSVar('--colors-semantic-text-muted') || '#64748b', getCSSVar('--colors-semantic-text') || '#475569'];
        gradient.addColorStop(0, bgColors[0]);
        gradient.addColorStop(1, bgColors[1]);

        // Draw rounded rectangle
        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(node.x + radius, node.y);
        ctx.lineTo(node.x + node.width - radius, node.y);
        ctx.quadraticCurveTo(node.x + node.width, node.y, node.x + node.width, node.y + radius);
        ctx.lineTo(node.x + node.width, node.y + node.height - radius);
        ctx.quadraticCurveTo(node.x + node.width, node.y + node.height, node.x + node.width - radius, node.y + node.height);
        ctx.lineTo(node.x + radius, node.y + node.height);
        ctx.quadraticCurveTo(node.x, node.y + node.height, node.x, node.y + node.height - radius);
        ctx.lineTo(node.x, node.y + radius);
        ctx.quadraticCurveTo(node.x, node.y, node.x + radius, node.y);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();

        // Border with improved visibility
        ctx.strokeStyle = isSelected ? getTheme().warning : style.border;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Icon
        if (style.icon) {
          ctx.font = `${getCSSVar('--typography-font-size-xl') || '20px'} ${getCSSVar('--typography-font-family-sans') || 'sans-serif'}`.trim();
          ctx.fillStyle = style.textColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(style.icon, node.x + 10, node.y + node.height / 2);
        }

        // Text with better contrast
        const fontSize = getCSSVar('--typography-font-size-sm') || '12px';
        const fontFamily = getCSSVar('--typography-font-family-sans') || 'sans-serif';
        ctx.font = isHovered ? `bold ${fontSize} ${fontFamily}` : `${fontSize} ${fontFamily}`;
        ctx.fillStyle = style.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate text if too long
        let text = node.title;
        const maxWidth = node.width - (style.icon ? 50 : 20);
        const textWidth = ctx.measureText(text).width;

        if (textWidth > maxWidth) {
          while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
            text = text.slice(0, -1);
          }
          text += '...';
        }

        ctx.fillText(text, node.x + node.width / 2 + (style.icon ? 10 : 0), node.y + node.height / 2);

        // Duration badge
        const nodeData = layoutData.nodes.find(n => n.id === node.id);
        if (nodeData) {
          // Try to get duration from graph manager
          const graphNode = graphManager?.getNodes().find(n => n.id === node.id);
          const duration = graphNode?.duration;
          if (duration) {
            const durationText = formatDuration(duration);
            ctx.font = `${getCSSVar('--typography-font-size-xs') || '10px'} ${getCSSVar('--typography-font-family-sans') || 'sans-serif'}`.trim();
            ctx.fillStyle = `${getCSSVar('--colors-westworld-white') || '#FFFFFF'}E6`; // E6 = 90% opacity
            ctx.textAlign = 'right';
            ctx.fillText(durationText, node.x + node.width - 10, node.y + node.height - 10);
          }
        }
      });

      ctx.restore();
    } catch (error) {
      console.error('Error drawing canvas:', error);
      // Draw error message
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${getCSSVar('--typography-font-size-base') || '16px'} ${getCSSVar('--typography-font-family-sans') || 'sans-serif'}`.trim();
      ctx.fillStyle = getTheme().error;
      ctx.textAlign = 'center';
      ctx.fillText('Error rendering graph', canvas.width / 2, canvas.height / 2);
    }
  }, [layoutData, viewState, isOpen, graphManager]);

  // Throttled drawing function using requestAnimationFrame
  const requestRedraw = useCallback(() => {
    if (animationFrameRef.current) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = undefined;
      if (redrawNeeded.current) {
        drawCanvas();
        redrawNeeded.current = false;
      }
    });
  }, [drawCanvas]);

  // Request redraw when layout data or view state changes
  useEffect(() => {
    redrawNeeded.current = true;
    requestRedraw();
  }, [layoutData, viewState, requestRedraw]);

  // Mouse event handlers - separated from drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const getMousePosition = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - rect.width / 2 - viewState.pan.x) / viewState.zoom,
        y: (e.clientY - rect.top - 100 - viewState.pan.y) / viewState.zoom
      };
    };

    const findNodeAtPosition = (x: number, y: number) => {
      return layoutData.nodes.find(node =>
        x >= node.x && x <= node.x + node.width &&
        y >= node.y && y <= node.y + node.height
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (viewState.isDragging) return;

      const { x, y } = getMousePosition(e);
      const hovered = findNodeAtPosition(x, y);

      const newHoveredNode = hovered?.id || null;
      if (newHoveredNode !== viewState.hoveredNode) {
        setViewState(prev => ({ ...prev, hoveredNode: newHoveredNode }));
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const { x, y } = getMousePosition(e);
      const clicked = findNodeAtPosition(x, y);

      if (clicked) {
        setViewState(prev => ({ ...prev, selectedNode: clicked.id }));
      } else {
        setViewState(prev => ({
          ...prev,
          isDragging: true,
          dragStart: { x: e.clientX - prev.pan.x, y: e.clientY - prev.pan.y }
        }));
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      setViewState(prev => ({ ...prev, isDragging: false }));
      canvas.style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
      setViewState(prev => ({
        ...prev,
        hoveredNode: null,
        isDragging: false
      }));
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [layoutData, viewState, isOpen]);

  // Handle dragging
  useEffect(() => {
    if (!viewState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setViewState(prev => ({
        ...prev,
        pan: {
          x: e.clientX - prev.dragStart.x,
          y: e.clientY - prev.dragStart.y
        }
      }));
    };

    const handleMouseUp = () => {
      setViewState(prev => ({ ...prev, isDragging: false }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewState.isDragging, viewState.dragStart]);

  // Enhanced zoom handling with extended range
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewState(prev => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(10, prev.zoom * delta)) // Extended zoom range
      }));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // UI action handlers - defined before keyboard handler that uses them
  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(10, prev.zoom * 1.2)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.1, prev.zoom / 1.2)
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 },
      selectedNode: null
    }));
  }, []);

  // Enhanced keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showAccessibilityLayer) {
            setShowAccessibilityLayer(false);
          } else {
            onClose();
          }
          break;
          
        case 'a':
        case 'A':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowAccessibilityLayer(prev => !prev);
          }
          break;
          
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleResetView();
          }
          break;
          
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
          
        case '-':
        case '_':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
          
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewState(prev => ({ ...prev, pan: { ...prev.pan, x: prev.pan.x + 50 } }));
          }
          break;
          
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewState(prev => ({ ...prev, pan: { ...prev.pan, x: prev.pan.x - 50 } }));
          }
          break;
          
        case 'ArrowUp':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewState(prev => ({ ...prev, pan: { ...prev.pan, y: prev.pan.y + 50 } }));
          }
          break;
          
        case 'ArrowDown':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewState(prev => ({ ...prev, pan: { ...prev.pan, y: prev.pan.y - 50 } }));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showAccessibilityLayer, handleResetView, handleZoomIn, handleZoomOut]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const resizeObserver = new ResizeObserver(() => {
      redrawNeeded.current = true;
      requestRedraw();
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [isOpen, requestRedraw]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Export handlers

  const handleExportMermaid = useCallback(() => {
    if (!graphManager) return;

    try {
      const mermaidCode = generateMermaidDiagram(graphManager);
      const blob = new Blob([mermaidCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'research-graph.mmd';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting graph:', error);
    }
  }, [graphManager]);

  // Get selected node details with error handling
  const getSelectedNodeDetails = useCallback(() => {
    if (!viewState.selectedNode || !graphManager) return null;

    try {
      const nodes = graphManager.getNodes();
      const node = nodes.find(n => n.id === viewState.selectedNode);
      return node ? {
        title: node.title,
        type: node.type,
        metadata: node.metadata,
        timestamp: node.timestamp,
        duration: node.duration
      } : null;
    } catch (error) {
      console.error('Error getting node details:', error);
      return null;
    }
  }, [viewState.selectedNode, graphManager]);

  const selectedDetails = getSelectedNodeDetails();

  // Early return if not open or no manager
  if (!isOpen || !graphManager) return null;

  return (
    <div
      className="fixed inset-0 bg-westworld-nearBlack/50 flex items-center justify-center z-modal p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="graph-title"
    >
      <div
        className="bg-theme-primary rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        <div
          className="p-6 border-b border-theme-primary flex justify-between items-center bg-westworld-cream"
        >
          <h2
            id="graph-title"
            className="text-2xl font-bold flex items-center gap-2 text-westworld-darkBrown"
          >
            <ChartBarIcon className="w-6 h-6" />
            Research Graph Analysis
          </h2>
          <button
            onClick={onClose}
            className="transition-colors p-2 rounded text-westworld-rust hover:text-westworld-darkBrown"
            aria-label="Close graph view (Escape key)"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-6.25rem)]">
          {/* Main Graph Area */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="flex gap-2 mb-4" role="toolbar" aria-label="Graph controls">
              <button
                onClick={handleZoomIn}
                className="px-3 py-2 rounded transition-colors bg-westworld-copper text-white hover:bg-westworld-darkCopper"
                aria-label="Zoom in"
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="px-3 py-2 rounded transition-colors bg-westworld-copper text-white hover:bg-westworld-darkCopper"
                aria-label="Zoom out"
              >
                <ArrowsPointingInIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="px-3 py-2 rounded transition-colors bg-westworld-copper text-white hover:bg-westworld-darkCopper"
                aria-label="Reset view"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportMermaid}
                className="px-3 py-2 rounded transition-colors bg-westworld-gold text-westworld-nearBlack hover:bg-westworld-darkGold"
                aria-label="Export as Mermaid diagram"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
              </button>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full h-full border border-westworld-gold/30 rounded bg-westworld-cream"
              role="img"
              aria-label={`Research graph with ${layoutData.nodes.length} nodes and ${layoutData.edges.length} connections`}
            />

            {layoutData.nodes.length === 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center text-westworld-rust"
              >
                <p>No research steps to display yet.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div
            className="w-80 border-l border-westworld-gold/30 p-6 overflow-y-auto bg-westworld-beige"
          >
            {/* Statistics */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-westworld-darkBrown">
                Graph Statistics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Total Nodes:</span>
                  <span className="text-westworld-darkBrown font-medium">{stats.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Duration:</span>
                  <span className="text-westworld-darkBrown font-medium">{formatDuration(stats.totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Avg Step:</span>
                  <span className="text-westworld-darkBrown font-medium">{formatDuration(stats.averageStepDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Success Rate:</span>
                  <span className="text-westworld-darkBrown font-medium">
                    {isNaN(stats.successRate) ? '0%' : `${(stats.successRate * 100).toFixed(1)}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Sources:</span>
                  <span className="text-westworld-darkBrown font-medium">{stats.sourcesCollected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-westworld-rust">Citations:</span>
                  <span className="text-westworld-darkBrown font-medium">{stats.uniqueCitations}</span>
                </div>
              </div>
            </div>

            {/* Selected Node Details */}
            {selectedDetails && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-westworld-darkBrown">
                  Selected Node
                </h3>
                <div
                  className="p-4 rounded border border-westworld-gold/30 bg-westworld-cream"
                >
                  <h4 className="font-medium mb-2 text-westworld-darkBrown">
                    {selectedDetails.title}
                  </h4>
                  <div className="text-sm space-y-1 text-westworld-rust">
                    <div>Type: {selectedDetails.type}</div>
                    {selectedDetails.duration && (
                      <div>Duration: {formatDuration(selectedDetails.duration)}</div>
                    )}
                    {selectedDetails.metadata?.sourcesCount && (
                      <div>Sources: {selectedDetails.metadata.sourcesCount}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Usage Instructions */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-westworld-darkBrown">
                Controls
              </h3>
              <div className="text-sm space-y-2 text-westworld-rust">
                <div>• Click nodes to select and view details</div>
                <div>• Drag to pan the view</div>
                <div>• Scroll to zoom in/out</div>
                <div>• Press Escape to close</div>
                <div>• Ctrl+A to toggle accessibility view</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Layer */}
      {showAccessibilityLayer && (
        <GraphAccessibilityLayer
          selectedNodeId={viewState.selectedNode}
          hoveredNodeId={viewState.hoveredNode}
          onNodeSelect={(nodeId) => setViewState(prev => ({ ...prev, selectedNode: nodeId }))}
          onNodeHover={(nodeId) => setViewState(prev => ({ ...prev, hoveredNode: nodeId }))}
          isVisible={showAccessibilityLayer}
        />
      )}
    </div>
  );
};

export default ResearchGraphView;