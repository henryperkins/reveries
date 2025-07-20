/**
 * Comprehensive graph export utilities
 * Supports PNG, SVG, JSON, and enhanced Mermaid export
 */

import { ResearchGraphManager, generateMermaidDiagram } from '@/researchGraph';
import { LayoutNode, LayoutEdge } from './graphLayoutWorker';

export interface ExportOptions {
  format?: 'png' | 'svg' | 'json' | 'mermaid';
  filename?: string;
  quality?: number; // For PNG export
  backgroundColor?: string;
  includeLegend?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface JSONGraphExport {
  version: string;
  timestamp: string;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    exportedBy: string;
  };
  nodes: Array<{
    id: string;
    title: string;
    type: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    metadata?: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    points: Array<{ x: number; y: number }>;
  }>;
  statistics: any;
}

export class GraphExportService {
  constructor(private graphManager: ResearchGraphManager) {}

  /**
   * Export graph as PNG image
   */
  async exportToPNG(
    canvas: HTMLCanvasElement,
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      filename = 'research-graph.png',
      quality = 1.0,
      backgroundColor = '#ffffff'
    } = options;

    try {
      // Create a new canvas with background
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set dimensions
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw the original canvas content
      ctx.drawImage(canvas, 0, 0);

      // Add legend if requested
      if (options.includeLegend) {
        this.drawLegend(ctx, exportCanvas.width, exportCanvas.height);
      }

      // Convert to blob and download
      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            this.downloadBlob(blob, filename);
          }
        },
        'image/png',
        quality
      );
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error(`PNG export failed: ${error}`);
    }
  }

  /**
   * Export graph as SVG
   */
  async exportToSVG(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      filename = 'research-graph.svg',
      backgroundColor = '#ffffff',
      includeLegend = true
    } = options;

    try {
      // Calculate bounds
      const bounds = this.calculateBounds(nodes);
      const margin = 50;
      const width = bounds.width + margin * 2;
      const height = bounds.height + margin * 2;

      // Create SVG
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  <g transform="translate(${margin - bounds.minX}, ${margin - bounds.minY})">`;

      // Add edges
      edges.forEach(edge => {
        const strokeColor = edge.type === 'error' ? '#dc2626' : '#94a3b8';
        const strokeDasharray = edge.type === 'error' ? '5,5' : 'none';
        
        if (edge.points.length >= 2) {
          let pathData = `M ${edge.points[0].x} ${edge.points[0].y}`;
          
          if (edge.points.length === 4) {
            // Bezier curve
            pathData += ` C ${edge.points[1].x} ${edge.points[1].y} ${edge.points[2].x} ${edge.points[2].y} ${edge.points[3].x} ${edge.points[3].y}`;
          } else {
            // Line segments
            edge.points.slice(1).forEach(point => {
              pathData += ` L ${point.x} ${point.y}`;
            });
          }

          svg += `
    <path d="${pathData}" 
          stroke="${strokeColor}" 
          stroke-width="2" 
          stroke-dasharray="${strokeDasharray}"
          fill="none"/>`;

          // Add arrowhead
          const lastPoint = edge.points[edge.points.length - 1];
          const secondLastPoint = edge.points[edge.points.length - 2];
          const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
          
          svg += `
    <polygon points="0,0 -10,-5 -10,5" 
             fill="${strokeColor}"
             transform="translate(${lastPoint.x}, ${lastPoint.y}) rotate(${angle * 180 / Math.PI})"/>`;
        }
      });

      // Add nodes
      nodes.forEach(node => {
        const nodeStyle = this.getNodeStyle(node.type);
        
        svg += `
    <rect x="${node.x}" y="${node.y}" 
          width="${node.width}" height="${node.height}" 
          fill="${nodeStyle.background}" 
          stroke="${nodeStyle.border}" 
          stroke-width="2" 
          rx="8"/>
    <text x="${node.x + node.width/2}" y="${node.y + node.height/2}" 
          text-anchor="middle" 
          dominant-baseline="middle" 
          fill="${nodeStyle.textColor}"
          font-family="Arial, sans-serif" 
          font-size="12">
      ${this.escapeXML(node.title)}
    </text>`;
      });

      svg += `
  </g>`;

      // Add legend
      if (includeLegend) {
        svg += this.generateSVGLegend(width, height);
      }

      svg += `
</svg>`;

      // Download SVG
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('SVG export failed:', error);
      throw new Error(`SVG export failed: ${error}`);
    }
  }

  /**
   * Export graph as JSON
   */
  async exportToJSON(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename = 'research-graph.json' } = options;

    try {
      const statistics = this.graphManager.getStatistics();
      
      const exportData: JSONGraphExport = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          exportedBy: 'Research Graph Analysis Tool'
        },
        nodes: nodes.map(node => ({
          id: node.id,
          title: node.title,
          type: node.type,
          position: { x: node.x, y: node.y },
          dimensions: { width: node.width, height: node.height },
          metadata: node
        })),
        edges: edges.map((edge, index) => ({
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          points: edge.points
        })),
        statistics
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw new Error(`JSON export failed: ${error}`);
    }
  }

  /**
   * Enhanced Mermaid export with pagination for large graphs
   */
  async exportToMermaid(options: ExportOptions = {}): Promise<void> {
    const { filename = 'research-graph.mmd' } = options;

    try {
      const nodes = this.graphManager.getNodes();
      
      if (nodes.length > 50) {
        // Split large graphs into multiple diagrams
        await this.exportLargeMermaidGraph(nodes, filename);
      } else {
        // Standard export
        const mermaidCode = generateMermaidDiagram(this.graphManager);
        const blob = new Blob([mermaidCode], { type: 'text/plain' });
        this.downloadBlob(blob, filename);
      }
    } catch (error) {
      console.error('Mermaid export failed:', error);
      throw new Error(`Mermaid export failed: ${error}`);
    }
  }

  /**
   * Copy graph data to clipboard
   */
  async copyToClipboard(format: 'json' | 'mermaid', nodes: LayoutNode[], edges: LayoutEdge[]): Promise<void> {
    try {
      let content: string;

      if (format === 'json') {
        const exportData: JSONGraphExport = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          metadata: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            exportedBy: 'Research Graph Analysis Tool'
          },
          nodes: nodes.map(node => ({
            id: node.id,
            title: node.title,
            type: node.type,
            position: { x: node.x, y: node.y },
            dimensions: { width: node.width, height: node.height }
          })),
          edges: edges.map((edge, index) => ({
            id: `edge-${index}`,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            points: edge.points
          })),
          statistics: this.graphManager.getStatistics()
        };
        content = JSON.stringify(exportData, null, 2);
      } else {
        content = generateMermaidDiagram(this.graphManager);
      }

      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      throw new Error(`Clipboard copy failed: ${error}`);
    }
  }

  // Private helper methods

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private calculateBounds(nodes: LayoutNode[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const maxY = Math.max(...nodes.map(n => n.y + n.height));

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private getNodeStyle(type: string): { background: string; border: string; textColor: string } {
    // Simplified version - in real implementation, import from graphLayout
    switch (type) {
      case 'USER_QUERY':
        return { background: '#3b82f6', border: '#2563eb', textColor: '#ffffff' };
      case 'WEB_RESEARCH':
        return { background: '#06b6d4', border: '#0891b2', textColor: '#ffffff' };
      case 'FINAL_ANSWER':
        return { background: '#10b981', border: '#059669', textColor: '#ffffff' };
      case 'ERROR':
        return { background: '#ef4444', border: '#dc2626', textColor: '#ffffff' };
      default:
        return { background: '#64748b', border: '#475569', textColor: '#ffffff' };
    }
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private drawLegend(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    const legendX = canvasWidth - 200;
    const legendY = 20;
    const legendWidth = 180;
    const legendHeight = 150;

    // Draw legend background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend content
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('Legend', legendX + 10, legendY + 20);

    // Add node type examples
    const nodeTypes = [
      { type: 'USER_QUERY', label: 'User Query', color: '#3b82f6' },
      { type: 'WEB_RESEARCH', label: 'Web Research', color: '#06b6d4' },
      { type: 'FINAL_ANSWER', label: 'Final Answer', color: '#10b981' },
      { type: 'ERROR', label: 'Error', color: '#ef4444' }
    ];

    nodeTypes.forEach((nodeType, index) => {
      const y = legendY + 40 + index * 25;
      
      // Draw color swatch
      ctx.fillStyle = nodeType.color;
      ctx.fillRect(legendX + 10, y - 8, 15, 15);
      
      // Draw label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(nodeType.label, legendX + 35, y + 3);
    });
  }

  private generateSVGLegend(width: number, _height: number): string {
    const legendX = width - 200;
    const legendY = 20;

    return `
  <g>
    <rect x="${legendX}" y="${legendY}" width="180" height="150" 
          fill="rgba(255,255,255,0.9)" stroke="#000" stroke-width="1"/>
    <text x="${legendX + 10}" y="${legendY + 20}" font-family="Arial" font-size="14" font-weight="bold">Legend</text>
    
    <rect x="${legendX + 10}" y="${legendY + 35}" width="15" height="15" fill="#3b82f6"/>
    <text x="${legendX + 35}" y="${legendY + 47}" font-family="Arial" font-size="12">User Query</text>
    
    <rect x="${legendX + 10}" y="${legendY + 60}" width="15" height="15" fill="#06b6d4"/>
    <text x="${legendX + 35}" y="${legendY + 72}" font-family="Arial" font-size="12">Web Research</text>
    
    <rect x="${legendX + 10}" y="${legendY + 85}" width="15" height="15" fill="#10b981"/>
    <text x="${legendX + 35}" y="${legendY + 97}" font-family="Arial" font-size="12">Final Answer</text>
    
    <rect x="${legendX + 10}" y="${legendY + 110}" width="15" height="15" fill="#ef4444"/>
    <text x="${legendX + 35}" y="${legendY + 122}" font-family="Arial" font-size="12">Error</text>
  </g>`;
  }

  private async exportLargeMermaidGraph(nodes: any[], baseFilename: string): Promise<void> {
    const chunkSize = 25;
    const chunks: any[][] = [];
    
    for (let i = 0; i < nodes.length; i += chunkSize) {
      chunks.push(nodes.slice(i, i + chunkSize));
    }

    // Create index file
    let indexContent = `# Research Graph Export (${chunks.length} parts)\n\n`;
    indexContent += `Total nodes: ${nodes.length}\n`;
    indexContent += `Generated: ${new Date().toISOString()}\n\n`;
    indexContent += `## Files:\n`;

    chunks.forEach((_, index) => {
      const filename = `${baseFilename.replace('.mmd', '')}-part-${index + 1}.mmd`;
      indexContent += `- [Part ${index + 1}](${filename})\n`;
    });

    const indexBlob = new Blob([indexContent], { type: 'text/plain' });
    this.downloadBlob(indexBlob, `${baseFilename.replace('.mmd', '')}-index.md`);

    // Create individual mermaid files
    chunks.forEach((chunk, index) => {
      // Create a temporary manager with subset of nodes
      // This is simplified - in practice, you'd need to maintain edge relationships
      const mermaidContent = this.generateMermaidForChunk(chunk, index + 1);
      const filename = `${baseFilename.replace('.mmd', '')}-part-${index + 1}.mmd`;
      const blob = new Blob([mermaidContent], { type: 'text/plain' });
      this.downloadBlob(blob, filename);
    });
  }

  private generateMermaidForChunk(nodes: any[], chunkNumber: number): string {
    let mermaid = `graph TD\n`;
    mermaid += `    subgraph "Part ${chunkNumber}"\n`;
    
    nodes.forEach(node => {
      const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
      const safeLabel = node.title.replace(/"/g, "'");
      mermaid += `        ${safeId}["${safeLabel}"]\n`;
    });
    
    mermaid += `    end\n`;
    return mermaid;
  }
}

// Convenience functions for direct use
export async function exportGraphToPNG(
  _canvas: HTMLCanvasElement,
  _options?: ExportOptions
): Promise<void> {
  // This requires a graph manager instance, so it's mainly for use within components
  throw new Error('exportGraphToPNG requires GraphExportService instance');
}

export async function exportGraphToSVG(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: ExportOptions
): Promise<void> {
  // This is a simplified version for direct use
  const service = new GraphExportService({} as ResearchGraphManager);
  return service.exportToSVG(nodes, edges, options);
}

export default GraphExportService;