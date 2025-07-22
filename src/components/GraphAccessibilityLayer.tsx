/**
 * Accessibility layer for the research graph
 * Provides screen reader support, keyboard navigation, and WCAG compliance
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGraphSnapshot } from '@/contexts/GraphContextUtils';
import { formatDuration } from '@/utils/exportUtils';

interface GraphAccessibilityLayerProps {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  isVisible: boolean;
}

export function GraphAccessibilityLayer({
  selectedNodeId,
  hoveredNodeId,
  onNodeSelect,
  onNodeHover,
  isVisible
}: GraphAccessibilityLayerProps) {
  const { nodes, edges, statistics } = useGraphSnapshot();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'nodes' | 'edges' | 'stats'>('nodes');
  const listRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isVisible && listRef.current) {
      const firstFocusable = listRef.current.querySelector<HTMLElement>('[tabindex="0"]');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isVisible]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentItems = viewMode === 'nodes' ? nodes :
                        viewMode === 'edges' ? edges :
                        ['statistics'];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(currentItems.length - 1, prev + 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(currentItems.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (viewMode === 'nodes' && nodes[focusedIndex]) {
          onNodeSelect(nodes[focusedIndex].id);
        }
        break;

      case 'Tab':
        if (e.shiftKey) {
          // Previous view mode
          if (viewMode === 'edges') setViewMode('nodes');
          else if (viewMode === 'stats') setViewMode('edges');
          else setViewMode('stats');
        } else {
          // Next view mode
          if (viewMode === 'nodes') setViewMode('edges');
          else if (viewMode === 'edges') setViewMode('stats');
          else setViewMode('nodes');
        }
        setFocusedIndex(0);
        e.preventDefault();
        break;
    }
  }, [viewMode, nodes, edges, focusedIndex, onNodeSelect]);

  // Reset focused index when switching modes
  useEffect(() => {
    setFocusedIndex(0);
  }, [viewMode]);

  if (!isVisible) return null;

  return (
    <div
      ref={listRef}
      className="sr-only focus:not-sr-only fixed top-4 left-4 bg-white border-2 border-blue-500 rounded-lg p-4 max-w-md z-[60] shadow-xl"
      role="region"
      aria-label="Graph accessibility view"
      onKeyDown={handleKeyDown}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Research Graph Navigation</h2>
        <p className="text-sm text-gray-600 mb-2">
          Use arrow keys to navigate, Enter/Space to select, Tab to switch views
        </p>

        {/* View Mode Selector */}
        <div role="tablist" className="flex border-b border-gray-200 mb-4">
          {[
            { mode: 'nodes' as const, label: `Nodes (${nodes.length})` },
            { mode: 'edges' as const, label: `Connections (${edges.length})` },
            { mode: 'stats' as const, label: 'Statistics' }
          ].map(({ mode, label }) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewMode === mode
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setViewMode(mode)}
              tabIndex={viewMode === mode ? 0 : -1}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes View */}
      {viewMode === 'nodes' && (
        <div role="list" aria-label="Graph nodes">
          {nodes.length === 0 ? (
            <p className="text-gray-500">No nodes to display</p>
          ) : (
            nodes.map((node: any, index: number) => (
              <div
                key={node.id}
                role="listitem"
                tabIndex={index === focusedIndex ? 0 : -1}
                className={`p-3 border rounded mb-2 cursor-pointer transition-colors ${
                  node.id === selectedNodeId ? 'bg-blue-100 border-blue-500' :
                  node.id === hoveredNodeId ? 'bg-gray-100 border-gray-300' :
                  index === focusedIndex ? 'bg-gray-50 border-gray-400' :
                  'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onNodeSelect(node.id)}
                onMouseEnter={() => onNodeHover(node.id)}
                onMouseLeave={() => onNodeHover(null)}
                onFocus={() => setFocusedIndex(index)}
                aria-describedby={`node-${node.id}-description`}
              >
                <div className="font-medium text-gray-900">
                  {node.title}
                </div>
                <div
                  id={`node-${node.id}-description`}
                  className="text-sm text-gray-600 mt-1"
                >
                  Type: {node.type}
                  {/* Duration info if available */}
                  {(() => {
                    // Try to get duration from the node or its metadata
                    const duration = node.duration;
                    return duration ? ` • Duration: ${formatDuration(duration)}` : '';
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edges View */}
      {viewMode === 'edges' && (
        <div role="list" aria-label="Graph connections">
          {edges.length === 0 ? (
            <p className="text-gray-500">No connections to display</p>
          ) : (
            edges.map((edge: any, index: number) => {
              const sourceNode = nodes.find((n: any) => n.id === edge.source);
              const targetNode = nodes.find((n: any) => n.id === edge.target);

              return (
                <div
                  key={`${edge.source}-${edge.target}`}
                  role="listitem"
                  tabIndex={index === focusedIndex ? 0 : -1}
                  className={`p-3 border rounded mb-2 transition-colors ${
                    index === focusedIndex ? 'bg-gray-50 border-gray-400' :
                    'border-gray-200'
                  }`}
                  onFocus={() => setFocusedIndex(index)}
                >
                  <div className="text-sm">
                    <div className="font-medium">
                      {sourceNode?.title || edge.source} → {targetNode?.title || edge.target}
                    </div>
                    <div className="text-gray-600 mt-1">
                      Type: {edge.type}
                      {edge.type === 'error' && ' (Error path)'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Statistics View */}
      {viewMode === 'stats' && (
        <div role="region" aria-label="Graph statistics">
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Total Nodes:</dt>
              <dd className="text-sm text-gray-900">{statistics.totalNodes}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Total Duration:</dt>
              <dd className="text-sm text-gray-900">{formatDuration(statistics.totalDuration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Average Step:</dt>
              <dd className="text-sm text-gray-900">{formatDuration(statistics.averageStepDuration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Success Rate:</dt>
              <dd className="text-sm text-gray-900">
                {isNaN(statistics.successRate) ? '0%' : `${(statistics.successRate * 100).toFixed(1)}%`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Sources Found:</dt>
              <dd className="text-sm text-gray-900">{statistics.sourcesCollected}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Unique Citations:</dt>
              <dd className="text-sm text-gray-900">{statistics.uniqueCitations}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-600">Error Count:</dt>
              <dd className="text-sm text-gray-900">{statistics.errorCount}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selectedNodeId && nodes.find((n: any) => n.id === selectedNodeId)?.title &&
          `Selected: ${nodes.find((n: any) => n.id === selectedNodeId)?.title}`
        }
      </div>
    </div>
  );
}

export default GraphAccessibilityLayer;
