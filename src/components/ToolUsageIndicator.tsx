import React from 'react';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PresentationChartLineIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface ToolUsageIndicatorProps {
  toolsUsed?: string[];
  recommendedTools?: string[];
}

const toolIcons: Record<string, React.ComponentType<any>> = {
  'advanced_web_search': MagnifyingGlassIcon,
  'search_academic_papers': BookOpenIcon,
  'analyze_statistics': ChartBarIcon,
  'verify_facts': CheckCircleIcon,
  'generate_visualization': PresentationChartLineIcon,
  'default': CpuChipIcon
};

const toolCategories: Record<string, string> = {
  'search': 'bg-blue-100 text-blue-700',
  'analysis': 'bg-purple-100 text-purple-700',
  'citation': 'bg-green-100 text-green-700',
  'verification': 'bg-yellow-100 text-yellow-700',
  'visualization': 'bg-pink-100 text-pink-700'
};

export const ToolUsageIndicator: React.FC<ToolUsageIndicatorProps> = ({
  toolsUsed = [],
  recommendedTools = []
}) => {
  if (toolsUsed.length === 0 && recommendedTools.length === 0) {
    return null;
  }

  const getToolIcon = (toolName: string) => {
    const Icon = toolIcons[toolName] || toolIcons.default;
    return <Icon className="w-4 h-4" />;
  };

  const getToolCategory = (toolName: string): string => {
    // Determine category from tool name patterns
    if (toolName.includes('search')) return 'search';
    if (toolName.includes('analyz') || toolName.includes('extract')) return 'analysis';
    if (toolName.includes('citat')) return 'citation';
    if (toolName.includes('verif')) return 'verification';
    if (toolName.includes('visual')) return 'visualization';
    return 'analysis';
  };

  return (
    <div className="mt-4 p-4 bg-surface rounded-lg border border-border/20">
      <h4 className="text-sm font-semibold text-text-secondary mb-2">Research Tools</h4>

      {toolsUsed.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1">Used:</p>
          <div className="flex flex-wrap gap-2">
            {toolsUsed.map((tool) => {
              const category = getToolCategory(tool);
              const categoryStyle = toolCategories[category] || 'bg-gray-100 text-gray-700';

              return (
                <span
                  key={tool}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryStyle}`}
                >
                  {getToolIcon(tool)}
                  {tool.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {recommendedTools.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-1">Recommended:</p>
          <div className="flex flex-wrap gap-2">
            {recommendedTools.filter(tool => !toolsUsed.includes(tool)).map((tool) => {
              const category = getToolCategory(tool);
              const categoryStyle = toolCategories[category] || 'bg-gray-100 text-gray-700';

              return (
                <span
                  key={tool}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium opacity-60 ${categoryStyle}`}
                >
                  {getToolIcon(tool)}
                  {tool.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
