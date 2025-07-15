import React from 'react';
import { FunctionCallHistory } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface FunctionCallVisualizerProps {
    history: FunctionCallHistory[];
}

export const FunctionCallVisualizer: React.FC<FunctionCallVisualizerProps> = ({ history }) => {
    const [expandedCalls, setExpandedCalls] = React.useState<Set<number>>(new Set());

    const toggleExpanded = (index: number) => {
        const newExpanded = new Set(expandedCalls);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedCalls(newExpanded);
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatResult = (result: any): string => {
        if (typeof result === 'string') return result;
        return JSON.stringify(result, null, 2);
    };

    return (
        <div className="mt-4 p-4 bg-slate-800 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Function Call History</h3>
            <div className="space-y-2">
                {history.map((call, index) => (
                    <div key={index} className="bg-slate-700 rounded p-3">
                        <button
                            onClick={() => toggleExpanded(index)}
                            className="w-full flex items-center justify-between text-left hover:bg-slate-600 rounded transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {expandedCalls.has(index) ? (
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="font-mono text-sm text-blue-400">{call.function}</span>
                                <span className="text-xs text-slate-500">{formatTimestamp(call.timestamp)}</span>
                            </div>
                        </button>

                        {expandedCalls.has(index) && (
                            <div className="mt-2 pl-6 space-y-2">
                                <div>
                                    <span className="text-xs text-slate-400">Arguments:</span>
                                    <pre className="mt-1 text-xs bg-slate-800 rounded p-2 overflow-x-auto">
                                        {JSON.stringify(call.arguments, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400">Result:</span>
                                    <pre className="mt-1 text-xs bg-slate-800 rounded p-2 overflow-x-auto">
                                        {formatResult(call.result)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
