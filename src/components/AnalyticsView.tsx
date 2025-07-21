import React from 'react';
import { TrendingUp, Search, Clock, CheckCircle } from 'lucide-react';

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Research Analytics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <Search className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-blue-600">{totalQueries}</div>
            <div className="text-gray-600 mt-2">Total Queries</div>
          </div>
          
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-green-600">{successRate}%</div>
            <div className="text-gray-600 mt-2">Success Rate</div>
          </div>
          
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-600">{sourcesAnalyzed.toLocaleString()}</div>
            <div className="text-gray-600 mt-2">Sources Analyzed</div>
          </div>
          
          <div className="text-center p-6 bg-amber-50 rounded-lg">
            <Clock className="w-8 h-8 text-amber-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-amber-600">{avgResponseTime}s</div>
            <div className="text-gray-600 mt-2">Avg Response Time</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Trends</h4>
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p>Analytics visualization coming soon</p>
        </div>
      </div>
    </div>
  );
};