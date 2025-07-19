import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { FunctionCallHistory } from '@/types';

interface HistoryViewProps {
  history: FunctionCallHistory[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpandedCalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatJson = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No function calls recorded yet
      </div>
    );
  }

  return (
    <div className="bg-slate-800 text-white">
      {history.map((call, index) => {
        const isExpanded = expandedCalls.has(index);
        
        return (
          <div
            key={index}
            className="border-b border-slate-700 last:border-b-0"
          >
            {/* Header Row */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </span>
                <span className="font-mono text-cyan-400">{call.function}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(call.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-8 pb-4 space-y-3">
                {/* Arguments */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Arguments:</div>
                  <pre className="text-xs bg-slate-900 p-2 rounded overflow-x-auto">
                    <code className="text-green-400">
                      {formatJson(call.arguments)}
                    </code>
                  </pre>
                </div>

                {/* Results */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Result:</div>
                  <pre className="text-xs bg-slate-900 p-2 rounded overflow-x-auto">
                    <code className="text-blue-400">
                      {formatJson(call.result)}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};