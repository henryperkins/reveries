import React from 'react';
import { BarChart3, TrendingUp, Clock, Layers } from 'lucide-react';

interface AnalyticsViewProps {
  totalQueries?: number;
  successRate?: number;
  sourcesAnalyzed?: number;
  avgResponseTime?: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  totalQueries = 247,
  successRate = 89,
  sourcesAnalyzed = 1432,
  avgResponseTime = 3.2
}) => {

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-westworld-nearBlack rounded-xl shadow-sm border border-gray-200 dark:border-westworld-tan dark:border-opacity-30 p-6 transition-colors duration-300">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-westworld-cream mb-6">Research Analytics</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-westworld-brown dark:bg-opacity-20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-semantic-text-muted">Total Sessions</span>
              <BarChart3 className="w-4 h-4 text-gray-400 dark:text-westworld-tan" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-westworld-cream">{totalQueries}</p>
          </div>

          <div className="bg-gray-50 dark:bg-westworld-brown dark:bg-opacity-20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-semantic-text-muted">Avg. Duration</span>
              <Clock className="w-4 h-4 text-gray-400 dark:text-westworld-tan" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-westworld-cream">{avgResponseTime}s</p>
          </div>

          <div className="bg-gray-50 dark:bg-westworld-brown dark:bg-opacity-20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-semantic-text-muted">Success Rate</span>
              <TrendingUp className="w-4 h-4 text-gray-400 dark:text-westworld-tan" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-westworld-cream">{successRate}%</p>
          </div>

          <div className="bg-gray-50 dark:bg-westworld-brown dark:bg-opacity-20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-semantic-text-muted">Paradigms Used</span>
              <Layers className="w-4 h-4 text-gray-400 dark:text-westworld-tan" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-westworld-cream">{sourcesAnalyzed.toLocaleString()}</p>
          </div>
        </div>

        <div className="text-center py-12">
          <p className="text-semantic-text-muted dark:text-westworld-tan">Analytics data will be available after completing research sessions.</p>
        </div>
      </div>
    </div>
  );
};
