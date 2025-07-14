import React, { useEffect, useRef, useState } from 'react';
import { ResearchGraphManager, getNodeColor, generateMermaidDiagram } from '../researchGraph';
import { ResearchStepType } from '../types';
import { ChartBarIcon, ArrowDownTrayIcon, XMarkIcon } from './icons';

interface ResearchGraphViewProps {
  graphManager: ResearchGraphManager;
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchGraphView: React.FC<ResearchGraphViewProps> = ({ graphManager, isOpen, onClose }) => {
  const [stats, setStats] = useState(graphManager.getStatistics());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Update stats
    setStats(graphManager.getStatistics());

    // Simple canvas visualization
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get graph data
    const graphData = graphManager.exportForVisualization();

    // Simple node positioning
    const nodePositions = new Map<string, { x: number; y: number }>();
    const levelHeight = 100;
    const nodeWidth = 150;

    graphData.nodes.forEach((node, index) => {
      const x = 50 + (index % 3) * (nodeWidth + 50);
      const y = 50 + node.level * levelHeight;
      nodePositions.set(node.id, { x, y });
    });

    // Draw edges
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    graphData.edges.forEach(edge => {
      const start = nodePositions.get(edge.source);
      const end = nodePositions.get(edge.target);
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x + nodeWidth / 2, start.y + 30);
        ctx.lineTo(end.x + nodeWidth / 2, end.y);
        if (edge.type === 'error') {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = '#ef4444';
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = '#64748b';
        }
        ctx.stroke();
      }
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      // Node background
      ctx.fillStyle = getNodeColor(node.type as ResearchStepType);
      ctx.fillRect(pos.x, pos.y, nodeWidth, 50);

      // Node border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, nodeWidth, 50);

      // Node text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate label if too long
      let label = node.label;
      if (label.length > 20) {
        label = label.substring(0, 17) + '...';
      }
      ctx.fillText(label, pos.x + nodeWidth / 2, pos.y + 25);
    });
  }, [graphManager, isOpen]);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-westworld-beige rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-westworld-tan flex justify-between items-center">
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Total Steps</div>
              <div className="text-2xl font-bold text-white">{stats.totalNodes}</div>
            </div>
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Success Rate</div>
              <div className="text-2xl font-bold text-white">{(stats.successRate * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Sources Found</div>
              <div className="text-2xl font-bold text-white">{stats.sourcesCollected}</div>
            </div>
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Total Duration</div>
              <div className="text-2xl font-bold text-white">{(stats.totalDuration / 1000).toFixed(1)}s</div>
            </div>
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Avg Step Time</div>
              <div className="text-2xl font-bold text-white">{(stats.averageStepDuration / 1000).toFixed(1)}s</div>
            </div>
            <div className="bg-black/20 rounded p-4">
              <div className="text-westworld-gold text-sm">Error Count</div>
              <div className="text-2xl font-bold text-white">{stats.errorCount}</div>
            </div>
          </div>

          {/* Graph Visualization */}
          <div className="bg-black/20 rounded p-4 mb-6">
            <h3 className="text-westworld-gold font-semibold mb-2">Research Flow Visualization</h3>
            <div className="overflow-x-auto">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="border border-westworld-tan rounded"
                style={{ background: 'var(--westworld-black)' }}
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="flex gap-4">
            <button
              onClick={exportMermaid}
              className="flex items-center gap-2 px-4 py-2 bg-westworld-gold text-black rounded hover:bg-westworld-rust transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export as Mermaid Diagram
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
