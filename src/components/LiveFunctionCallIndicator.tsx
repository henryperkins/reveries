import React from 'react';
import { CpuChipIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface LiveFunctionCall {
  id: string;
  function: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
  duration?: number;
}

interface LiveFunctionCallIndicatorProps {
  calls: LiveFunctionCall[];
}

export const LiveFunctionCallIndicator: React.FC<LiveFunctionCallIndicatorProps> = ({ calls }) => {
  if (calls.length === 0) return null;

  const getStatusIcon = (status: LiveFunctionCall['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <CpuChipIcon className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <CpuChipIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: LiveFunctionCall['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="mt-3 p-3 bg-white rounded-lg shadow border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Live Function Calls</h4>
      <div className="space-y-2">
        {calls.slice(-5).map((call) => (
          <div
            key={call.id}
            className={`flex items-center justify-between p-2 rounded border ${getStatusColor(call.status)}`}
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(call.status)}
              <span className="text-sm font-mono">{call.function}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {call.duration && (
                <span>{call.duration}ms</span>
              )}
              <span>{new Date(call.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};