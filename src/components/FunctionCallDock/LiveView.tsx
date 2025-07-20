import React from 'react';
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import { LiveFunctionCall } from './FunctionCallContext';
import { Tooltip } from '@/components/atoms';
import { getFunctionDescription } from '@/utils/functionDescriptions';

interface LiveViewProps {
  liveCalls: LiveFunctionCall[];
}

export const LiveView: React.FC<LiveViewProps> = ({ liveCalls }) => {
  const [expandedCalls, setExpandedCalls] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (callId: string) => {
    setExpandedCalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(callId)) {
        newSet.delete(callId);
      } else {
        newSet.add(callId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (functionName: string) => {
    const lowerName = functionName.toLowerCase();
    
    if (lowerName.includes('search') || lowerName.includes('query')) {
      return MagnifyingGlassIcon;
    } else if (lowerName.includes('analyze') || lowerName.includes('analysis')) {
      return BeakerIcon;
    } else if (lowerName.includes('verify') || lowerName.includes('check')) {
      return CheckBadgeIcon;
    } else if (lowerName.includes('synthesis') || lowerName.includes('compress')) {
      return DocumentTextIcon;
    } else if (lowerName.includes('visual') || lowerName.includes('graph')) {
      return ChartBarIcon;
    } else if (lowerName.includes('ai') || lowerName.includes('agent') || lowerName.includes('grok')) {
      return SparklesIcon;
    }
    return BeakerIcon; // default
  };

  const getCategoryStyle = (functionName: string, status: LiveFunctionCall['status']) => {
    const lowerName = functionName.toLowerCase();
    let baseStyle = '';
    
    if (lowerName.includes('search') || lowerName.includes('query')) {
      baseStyle = 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (lowerName.includes('analyze') || lowerName.includes('analysis')) {
      baseStyle = 'bg-purple-100 text-purple-700 border-purple-200';
    } else if (lowerName.includes('verify') || lowerName.includes('check')) {
      baseStyle = 'bg-amber-100 text-amber-700 border-amber-200';
    } else if (lowerName.includes('synthesis') || lowerName.includes('compress')) {
      baseStyle = 'bg-green-100 text-green-700 border-green-200';
    } else if (lowerName.includes('visual') || lowerName.includes('graph')) {
      baseStyle = 'bg-pink-100 text-pink-700 border-pink-200';
    } else if (lowerName.includes('ai') || lowerName.includes('agent')) {
      baseStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    } else {
      baseStyle = 'bg-purple-100 text-purple-700 border-purple-200';
    }

    // Modify for status
    if (status === 'running') {
      return `${baseStyle} animate-pulse`;
    } else if (status === 'failed') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    
    return baseStyle;
  };

  const getStatusIcon = (status: LiveFunctionCall['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'running':
        return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-4 h-4" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatFunctionName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatJson = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (liveCalls.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white">
        No active function calls
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3 bg-white">
      {liveCalls.map((call) => {
        const Icon = getCategoryIcon(call.name);
        const isExpanded = expandedCalls.has(call.id);
        const description = getFunctionDescription(call.name, call.arguments);
        
        return (
          <div key={call.id} className="space-y-2">
            <Tooltip content={description} position="top">
              <div
                onClick={() => toggleExpanded(call.id)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                  getCategoryStyle(call.name, call.status)
                } ${isExpanded ? 'rounded-b-none' : ''}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span>{formatFunctionName(call.name)}</span>
                <div className="ml-3 flex items-center space-x-2">
                  {getStatusIcon(call.status)}
                  {call.duration !== undefined && (
                    <span className="text-xs opacity-75">
                      {formatDuration(call.duration)}
                    </span>
                  )}
                </div>
              </div>
            </Tooltip>
            
            {/* Expanded Details */}
            {isExpanded && (
              <div className="ml-4 p-4 bg-gray-50 rounded-lg rounded-tl-none border border-gray-200">
                <div className="space-y-3 text-sm">
                  {/* Description */}
                  <div>
                    <div className="text-xs text-gray-600 font-medium mb-1">What it's doing:</div>
                    <div className="text-gray-800">{description}</div>
                  </div>
                  
                  {/* Arguments */}
                  {call.arguments && Object.keys(call.arguments).length > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 font-medium mb-1">Parameters:</div>
                      <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        <code className="text-gray-700">
                          {formatJson(call.arguments)}
                        </code>
                      </pre>
                    </div>
                  )}
                  
                  {/* Timing */}
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Started:</span>{' '}
                      {new Date(call.startTime).toLocaleTimeString()}
                    </div>
                    {call.endTime && (
                      <div>
                        <span className="font-medium">Ended:</span>{' '}
                        {new Date(call.endTime).toLocaleTimeString()}
                      </div>
                    )}
                    {call.duration !== undefined && (
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        {formatDuration(call.duration)}
                      </div>
                    )}
                  </div>
                  
                  {/* Error */}
                  {call.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      <span className="font-medium">Error:</span> {call.error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};