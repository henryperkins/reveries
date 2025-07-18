import React from 'react';
import { LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AIInsight {
  type: string;
  content: string;
  confidence: number;
}

interface AIInsightsProps {
  insights: AIInsight[];
  isGenerating: boolean;
  onGenerateInsights: () => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  insights,
  isGenerating,
  onGenerateInsights,
}) => {
  if (insights.length === 0 && !isGenerating) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              AI insights will appear here as you research
            </p>
          </div>
          <button
            onClick={onGenerateInsights}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Generate Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-indigo-600" />
          AI Insights
        </h3>
        {!isGenerating && (
          <button
            onClick={onGenerateInsights}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Refresh
          </button>
        )}
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-600">Analyzing research...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <LightBulbIcon className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{insight.content}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </span>
                    <span className="text-xs text-indigo-600 capitalize">
                      {insight.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
