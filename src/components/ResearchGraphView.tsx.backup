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

// WCAG AA compliant color palette
const THEME = {
  background: '#faf9f7',
  cardBackground: '#ffffff',
  border: '#d1d5db',
  text: '#1f2937',
  textSecondary: '#4b5563',
  accent: '#3b82f6',
  error: '#dc2626',
  success: '#059669',
  warning: '#d97706'
};

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

  // Poll for graph version changes
  useEffect(() => {
    if (!isOpen || !graphManager) return;

    const checkVersion = () => {
      const currentVersion = graphManager.getVersion();
      if (currentVersion !== graphVersion) {
        setGraphVersion(currentVersion);
        setStats(graphManager.getStatistics());
      }
    };

    // Check immediately
    checkVersion();

    // Check periodically for updates
    const interval = setInterval(checkVersion, 100);
    return () => clearInterval(interval);
  }, [isOpen, graphManager, graphVersion]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply transformations
    ctx.save();
    ctx.translate(rect.width / 2 + pan.x, 100 + pan.y);
    ctx.scale(zoom, zoom);

    // Get graph data and layout
    const graphData = graphManager.exportForVisualization();
    const { nodes: layoutNodes, edges: layoutEdges } = layoutEngine.current.layoutGraph(
      graphData.nodes,
      graphData.edges
    );

    // Draw edges
    layoutEdges.forEach(edge => {
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

      // Style based on edge type
      if (edge.type === 'error') {
        ctx.strokeStyle = '#dc2626';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#c8b8a8';
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
        ctx.fillStyle = edge.type === 'error' ? '#dc2626' : '#c8b8a8';
        ctx.fill();
        ctx.restore();
      }
    });

    // Draw nodes
    layoutNodes.forEach(node => {
      const style = getNodeStyle(node.type);
      const isHovered = node.id === hoveredNode;
      const isSelected = node.id === selectedNode;

      // Shadow for depth
      if (isHovered || isSelected) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      // Node background with gradient
      const gradient = ctx.createLinearGradient(
        node.x, node.y,
        node.x, node.y + node.height
      );

      // Extract the two hexadecimal colors defined in the background
      // gradient string returned by getNodeStyle. We fall back to a pair
      // of neutral slate colours if the regex fails for any reason.
      const bgColors =
        style.background.match(/#[0-9a-f]{6}/gi) || ['#64748b', '#475569'];

      /**
       * NOTE:
       * `CanvasGradient.addColorStop()` expects a **single colour value**.
       * The previous implementation attempted to pass the entire linear-gradient
       * CSS string which causes a runtime `SyntaxError` in Chrome/Firefox:
       *   "Failed to execute 'addColorStop' on 'CanvasGradient' …"
       *
       * We therefore explicitly pass only the hexadecimal colours extracted
       * above. On hover we simply re-use the same colours (we could apply
       * a lightening function, but keeping it simple avoids additional
       * computation and still provides the correct visual feedback via
       * the drop-shadow that is already rendered for hovered/selected nodes).
       */
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

      // Border
      ctx.strokeStyle = isSelected ? '#fbbf24' : style.border;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Icon
      if (style.icon) {
        ctx.font = '20px sans-serif';
        ctx.fillStyle = style.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.icon, node.x + 10, node.y + node.height / 2);
      }

      // Text
      ctx.font = isHovered ? 'bold 13px sans-serif' : '12px sans-serif';
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
      const nodeData = graphData.nodes.find(n => n.id === node.id);
      if (nodeData?.metadata?.duration) {
        const duration = formatDuration(nodeData.metadata.duration);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'right';
        ctx.fillText(duration, node.x + node.width - 10, node.y + node.height - 10);
      }
    });

    ctx.restore();

    // Handle mouse events
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const y = (e.clientY - rect.top - 100 - pan.y) / zoom;

      // Check hover
      const hovered = layoutNodes.find(node =>
        x >= node.x && x <= node.x + node.width &&
        y >= node.y && y <= node.y + node.height
      );

      if (hovered) {
        setHoveredNode(hovered.id);
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const y = (e.clientY - rect.top - 100 - pan.y) / zoom;

      const clicked = layoutNodes.find(node =>
        x >= node.x && x <= node.x + node.width &&
        y >= node.y && y <= node.y + node.height
      );

      if (clicked) {
        setSelectedNode(clicked.id);
      } else {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      setHoveredNode(null);
      setIsDragging(false);
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
  }, [graphManager, isOpen, zoom, pan, hoveredNode, selectedNode, isDragging, graphVersion]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
    };

    canvas.addEventListener('wheel', handleWheel);
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const resizeObserver = new ResizeObserver(() => {
      // Force re-render by incrementing a dummy state
      setGraphVersion(prev => prev + 0.001);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [isOpen]);

  // Early return after all hooks
  if (!graphManager) {
    console.error('ResearchGraphView requires a valid graphManager instance')
    return null
  }

  if (!isOpen) return null;

  const exportMermaid = () => {
    const mermaidCode = generateMermaidDiagram(graphManager);
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-graph.mmd';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Get selected node details
  const getSelectedNodeDetails = () => {
    if (!selectedNode) return null;

    const graphData = graphManager.exportForVisualization();
    const node = graphData.nodes.find(n => n.id === selectedNode);

    if (!node) return null;

    return {
      title: node.label,
      type: node.type,
      metadata: node.metadata
    };
  };

  const selectedDetails = getSelectedNodeDetails();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-westworld-beige rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-westworld-tan flex justify-between items-center bg-gradient-to-r from-westworld-beige to-westworld-tan/20">
          <h2 className="text-2xl font-bold text-westworld-gold flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6" />
            Research Graph Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-westworld-rust hover:text-westworld-gold transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Main Graph Area */}
          <div className="flex-1 p-6 overflow-hidden">
            {/* Graph Controls */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
                className="p-2 bg-black/20 rounded hover:bg-black/30 transition-colors text-white"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
                className="p-2 bg-black/20 rounded hover:bg-black/30 transition-colors text-white"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={resetView}
                className="p-2 bg-black/20 rounded hover:bg-black/30 transition-colors text-white"
                title="Reset View"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <div className="ml-auto text-sm text-westworld-copper">
                Zoom: {(zoom * 100).toFixed(0)}%
              </div>
            </div>

            {/* Graph Canvas */}
            <div className="bg-black/20 rounded-lg overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)' }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-westworld-tan p-6 overflow-y-auto bg-gradient-to-b from-westworld-beige to-westworld-tan/10">
            {/* Statistics */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-westworld-gold mb-3">Statistics</h3>
              <div className="space-y-3">
                <div className="bg-black/10 rounded p-3">
                  <div className="text-westworld-gold text-sm">Total Steps</div>
                  <div className="text-xl font-bold text-white">{stats.totalNodes}</div>
                </div>
                <div className="bg-black/10 rounded p-3">
                  <div className="text-westworld-gold text-sm">Success Rate</div>
                  <div className="text-xl font-bold text-white">{(stats.successRate * 100).toFixed(0)}%</div>
                </div>
                <div className="bg-black/10 rounded p-3">
                  <div className="text-westworld-gold text-sm">Sources Found</div>
                  <div className="text-xl font-bold text-white">{stats.sourcesCollected}</div>
                </div>
                <div className="bg-black/10 rounded p-3">
                  <div className="text-westworld-gold text-sm">Unique Citations</div>
                  <div className="text-xl font-bold text-white">{stats.uniqueCitations}</div>
                </div>
                <div className="bg-black/10 rounded p-3">
                  <div className="text-westworld-gold text-sm">Total Duration</div>
                  <div className="text-xl font-bold text-white">{formatDuration(stats.totalDuration)}</div>
                </div>
              </div>
            </div>

            {/* Selected Node Details */}
            {selectedDetails && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-westworld-gold mb-3">Selected Node</h3>
                <div className="bg-black/10 rounded p-4">
                  <h4 className="font-medium text-white mb-2">{selectedDetails.title}</h4>
                  <div className="text-sm text-westworld-copper space-y-1">
                    <div>Type: {selectedDetails.type}</div>
                    {selectedDetails.metadata?.duration && (
                      <div>Duration: {formatDuration(selectedDetails.metadata.duration)}</div>
                    )}
                    {selectedDetails.metadata?.sourcesCount && (
                      <div>Sources: {selectedDetails.metadata.sourcesCount}</div>
                    )}
                    {selectedDetails.metadata?.errorMessage && (
                      <div className="text-red-400">Error: {selectedDetails.metadata.errorMessage}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Export Options */}
            <div>
              <h3 className="text-lg font-semibold text-westworld-gold mb-3">Export</h3>
              <button
                onClick={exportMermaid}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-westworld-gold text-black rounded hover:bg-westworld-rust hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-westworld-gold focus:ring-offset-2 focus:ring-offset-westworld-beige"
                aria-label="Export graph as Mermaid diagram"
              >
                <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
                Export as Mermaid
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchGraphView;
