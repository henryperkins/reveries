import React from 'react';
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import { LiveFunctionCall } from './FunctionCallContext';

interface LiveViewProps {
  liveCalls: LiveFunctionCall[];
}

export const LiveView: React.FC<LiveViewProps> = ({ liveCalls }) => {
  const getStatusIcon = (status: LiveFunctionCall['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: LiveFunctionCall['status']) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'running':
        return 'border-blue-200 bg-blue-50 animate-pulse';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  if (liveCalls.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white">
        No active function calls
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-white">
      {liveCalls.map((call) => (
        <div
          key={call.id}
          className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(
            call.status
          )}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(call.status)}
              <span className="font-medium text-gray-800">{call.name}</span>
            </div>
            <div className="text-sm text-gray-600">
              {call.duration !== undefined && (
                <span className="font-mono">{formatDuration(call.duration)}</span>
              )}
            </div>
          </div>
          
          {call.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {call.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};