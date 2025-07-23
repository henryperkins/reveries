import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ResearchGraphManager } from '@/researchGraph';
import { GraphLayoutEngine, GraphNode, GraphEdge } from '@/utils/graphLayout';
import { useAnimationChain } from '../hooks/useAnimation';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface AnimatedResearchGraphProps {
  graphManager: ResearchGraphManager;
  enableAnimations?: boolean;
  animationType?: 'circuit' | 'float' | 'ripple' | 'morphing';
}

interface AnimatedNode extends GraphNode {
  animationDelay: number;
  pulseIntensity: number;
}

export const AnimatedResearchGraph: React.FC<AnimatedResearchGraphProps> = ({
  graphManager,
  enableAnimations = true,
  animationType = 'circuit'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutEngine = useRef(new GraphLayoutEngine());
  const [nodes, setNodes] = useState<AnimatedNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationFrame = useRef<number>(0);
  const time = useRef(0);

  // Animation chain for entrance effects
  useAnimationChain(); // Available for future use

  // Scroll-triggered animation
  const scrollAnimation = useScrollAnimation({
    threshold: 0.3,
    animationName: 'fadeIn',
    duration: '800ms',
    triggerOnce: true
  });
  
  // Update graph layout
  const updateLayout = useCallback(() => {
    if (!graphManager) return;

    const graphData = graphManager.exportForVisualization();
    const layout = layoutEngine.current.layoutGraph(
      graphData.nodes,
      graphData.edges
    );

    // Add animation properties to nodes
    const animatedNodes: AnimatedNode[] = layout.nodes.map((node, index) => ({
      ...node,
      animationDelay: index * 100,
      pulseIntensity: Math.random() * 0.5 + 0.5
    }));

    setNodes(animatedNodes);
    setEdges(layout.edges);
  }, [graphManager]);

  // Subscribe to graph updates
  useEffect(() => {
    if (!graphManager) return;

    const unsubscribe = graphManager.subscribe(() => {
      updateLayout();
    });

    updateLayout(); // Initial layout

    return unsubscribe;
  }, [graphManager, updateLayout]);

  // Animate canvas
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enableAnimations) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update time
    time.current += 0.016; // ~60fps

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Animate edges with flowing particles
    edges.forEach((edge) => {
      if (edge.points.length < 2) return;

      // Draw edge path
      ctx.beginPath();
      ctx.moveTo(edge.points[0].x, edge.points[0].y);
      
      if (edge.points.length === 4) {
        ctx.bezierCurveTo(
          edge.points[1].x, edge.points[1].y,
          edge.points[2].x, edge.points[2].y,
          edge.points[3].x, edge.points[3].y
        );
      } else {
        edge.points.forEach((point, i) => {
          if (i > 0) ctx.lineTo(point.x, point.y);
        });
      }

      // Animated stroke
      const gradient = ctx.createLinearGradient(
        edge.points[0].x,
        edge.points[0].y,
        edge.points[edge.points.length - 1].x,
        edge.points[edge.points.length - 1].y
      );

      const offset = (time.current * 0.5) % 1;
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.2)');
      gradient.addColorStop(offset, 'rgba(212, 175, 55, 0.8)');
      gradient.addColorStop(Math.min(offset + 0.1, 1), 'rgba(212, 175, 55, 0.2)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Particle effect
      if (animationType === 'circuit') {
        const particlePos = offset;
        const x = edge.points[0].x + (edge.points[edge.points.length - 1].x - edge.points[0].x) * particlePos;
        const y = edge.points[0].y + (edge.points[edge.points.length - 1].y - edge.points[0].y) * particlePos;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#d4af37';
        ctx.fill();
      }
    });

    // Animate nodes
    nodes.forEach((node) => {
      const pulseScale = 1 + Math.sin(time.current * 2 + node.animationDelay * 0.01) * 0.05 * node.pulseIntensity;
      
      ctx.save();
      ctx.translate(node.x + node.width / 2, node.y + node.height / 2);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-(node.x + node.width / 2), -(node.y + node.height / 2));

      // Node glow effect
      if (node.id === selectedNode) {
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = 20;
      }

      // Draw node
      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, radius);
      
      // Gradient fill
      const nodeGradient = ctx.createLinearGradient(
        node.x, node.y,
        node.x, node.y + node.height
      );
      nodeGradient.addColorStop(0, 'rgba(42, 37, 34, 0.9)');
      nodeGradient.addColorStop(1, 'rgba(42, 37, 34, 0.7)');
      
      ctx.fillStyle = nodeGradient;
      ctx.fill();
      
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Node label
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#FAF6F2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.title, node.x + node.width / 2, node.y + node.height / 2);
    });

    animationFrame.current = requestAnimationFrame(animate);
  }, [nodes, edges, selectedNode, enableAnimations, animationType]);

  // Start animation loop
  useEffect(() => {
    if (enableAnimations) {
      animate();
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [animate, enableAnimations]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // SVG animation for alternative rendering
  const renderSVGGraph = () => (
    <svg
      ref={svgRef}
      className="w-full h-full"
      viewBox={`0 0 800 600`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2A2522" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#2A2522" stopOpacity="0.7"/>
        </linearGradient>

        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.2">
            <animate attributeName="offset" from="0" to="1" dur="3s" repeatCount="indefinite"/>
          </stop>
          <stop offset="50%" stopColor="#d4af37" stopOpacity="0.8">
            <animate attributeName="offset" from="0" to="1" dur="3s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0.2">
            <animate attributeName="offset" from="0" to="1" dur="3s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>

      {/* Render edges */}
      {edges.map((edge, index) => (
        <g key={`edge-${index}`}>
          <path
            d={edge.points.length === 4
              ? `M ${edge.points[0].x} ${edge.points[0].y} C ${edge.points[1].x} ${edge.points[1].y}, ${edge.points[2].x} ${edge.points[2].y}, ${edge.points[3].x} ${edge.points[3].y}`
              : `M ${edge.points.map(p => `${p.x} ${p.y}`).join(' L ')}`
            }
            stroke="url(#edgeGradient)"
            strokeWidth="2"
            fill="none"
            className="animate-circuit"
          />
        </g>
      ))}

      {/* Render nodes */}
      {nodes.map((node) => (
        <g
          key={node.id}
          className={`cursor-pointer ${enableAnimations ? 'animate-float' : ''}`}
          style={{ animationDelay: `${node.animationDelay}ms` }}
          onClick={() => setSelectedNode(node.id)}
        >
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx="8"
            fill="url(#nodeGradient)"
            stroke="#d4af37"
            strokeWidth="2"
            filter={node.id === selectedNode ? "url(#glow)" : undefined}
          />
          <text
            x={node.x + node.width / 2}
            y={node.y + node.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FAF6F2"
            fontSize="12"
            fontFamily="Inter, sans-serif"
          >
            {node.title}
          </text>
        </g>
      ))}
    </svg>
  );

  return (
    <div ref={scrollAnimation.ref as React.RefObject<HTMLDivElement>} className="relative w-full h-full">
      {enableAnimations ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        />
      ) : (
        renderSVGGraph()
      )}
      
      {/* Animation controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={() => setSelectedNode(null)}
          className="px-3 py-1 bg-westworld-nearBlack/80 text-westworld-cream rounded hover:bg-westworld-nearBlack transition-colors"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};