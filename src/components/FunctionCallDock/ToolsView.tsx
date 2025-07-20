import React from 'react';
import {
  MagnifyingGlassIcon,
  BeakerIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '@/components/atoms';
import { getToolPurpose } from '@/utils/functionDescriptions';

interface ToolsViewProps {
  toolsUsed: string[];
  recommendedTools?: string[];
}

interface ToolCategory {
  name: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}

const toolCategories: Record<string, ToolCategory> = {
  search: {
    name: 'Search',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: MagnifyingGlassIcon,
  },
  analysis: {
    name: 'Analysis',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: BeakerIcon,
  },
  citation: {
    name: 'Citation',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: DocumentTextIcon,
  },
  verification: {
    name: 'Verification',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: CheckBadgeIcon,
  },
  visualization: {
    name: 'Visualization',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    icon: ChartBarIcon,
  },
  ai: {
    name: 'AI',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: SparklesIcon,
  },
};

export const ToolsView: React.FC<ToolsViewProps> = ({ 
  toolsUsed, 
  recommendedTools = [] 
}) => {
  const categorizeToolName = (toolName: string): keyof typeof toolCategories => {
    const lowerName = toolName.toLowerCase();
    
    if (lowerName.includes('search') || lowerName.includes('query')) {
      return 'search';
    } else if (lowerName.includes('analyze') || lowerName.includes('analysis')) {
      return 'analysis';
    } else if (lowerName.includes('cite') || lowerName.includes('citation')) {
      return 'citation';
    } else if (lowerName.includes('verify') || lowerName.includes('check')) {
      return 'verification';
    } else if (lowerName.includes('visual') || lowerName.includes('graph') || lowerName.includes('chart')) {
      return 'visualization';
    } else if (lowerName.includes('ai') || lowerName.includes('gpt') || lowerName.includes('model')) {
      return 'ai';
    }
    
    return 'analysis'; // default
  };

  const formatToolName = (toolName: string): string => {
    return toolName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const renderTool = (toolName: string, isRecommended: boolean = false) => {
    const category = toolCategories[categorizeToolName(toolName)];
    const Icon = category.icon;
    const purpose = getToolPurpose(toolName);
    
    return (
      <Tooltip key={toolName} content={purpose} position="top">
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium cursor-help ${
            category.bgColor
          } ${category.color} ${isRecommended ? 'opacity-60' : ''}`}
        >
          <Icon className="w-4 h-4 mr-1.5" />
          {formatToolName(toolName)}
        </div>
      </Tooltip>
    );
  };

  const hasTools = toolsUsed.length > 0 || recommendedTools.length > 0;

  if (!hasTools) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white">
        No tools have been used yet
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white">
      {/* Used Tools */}
      {toolsUsed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Tools Used
          </h3>
          <div className="flex flex-wrap gap-2">
            {toolsUsed.map((tool) => renderTool(tool))}
          </div>
        </div>
      )}

      {/* Recommended Tools */}
      {recommendedTools.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            Recommended Tools
          </h3>
          <div className="flex flex-wrap gap-2">
            {recommendedTools.map((tool) => renderTool(tool, true))}
          </div>
        </div>
      )}
    </div>
  );
};