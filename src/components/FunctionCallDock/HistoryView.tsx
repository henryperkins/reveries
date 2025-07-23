import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { FunctionCallHistory } from '@/types';
import { Tooltip } from '@/components/atoms';
import { getFunctionDescription } from '@/utils/functionDescriptions';

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
      <div className="p-8 text-center bg-theme-primary">
        <div className="text-theme-secondary mb-2">
          No tools used yet
        </div>
        <p className="text-sm text-theme-secondary">
          Tools will appear here as they are called during research
        </p>
      </div>
    );
  }

  return (
    <div className="bg-theme-primary text-theme-primary">
      {history.map((call, index) => {
        const isExpanded = expandedCalls.has(index);

        return (
          <div
            key={`call-${call.timestamp}-${call.function}`}
            className="border-b border-theme-primary last:border-b-0"
          >
            {/* Header Row */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover-theme-primary transition-colors"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-theme-secondary">
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </span>
                <Tooltip
                  content={call.context || getFunctionDescription(call.function, call.arguments)}
                  position="right"
                >
                  <span className="font-mono text-westworld-copper dark:text-westworld-gold">{call.function}</span>
                </Tooltip>
              </div>
              <span className="text-xs text-theme-secondary">
                {new Date(call.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-8 pb-4 space-y-3">
                {/* Description */}
                <div>
                  <div className="text-xs text-theme-secondary mb-1">What it did:</div>
                  <div className="text-sm text-theme-primary">
                    {call.context || getFunctionDescription(call.function, call.arguments)}
                  </div>
                </div>

                {/* Arguments */}
                <div>
                  <div className="text-xs text-theme-secondary mb-1">Arguments:</div>
                  <pre className="text-xs bg-theme-secondary p-2 rounded overflow-x-auto">
                    <code className="text-green-600 dark:text-green-400">
                      {formatJson(call.arguments)}
                    </code>
                  </pre>
                </div>

                {/* Results */}
                <div>
                  <div className="text-xs text-theme-secondary mb-1">Result:</div>
                  <pre className="text-xs bg-theme-secondary p-2 rounded overflow-x-auto">
                    <code className="text-blue-600 dark:text-blue-400">
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
