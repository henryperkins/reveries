import React from 'react';
import { BookOpen, Download, Target } from 'lucide-react';
import { ResearchStep, HostParadigm } from '../types';
import { ResearchArea } from './ResearchArea';

interface ResearchViewProps {
  steps: ResearchStep[];
  activeModel?: string;
  confidence?: number;
  sourceCount?: number;
  paradigm?: HostParadigm | null;
  isLoading?: boolean;
  progressState?: string;
}

export const ResearchView: React.FC<ResearchViewProps> = ({ 
  steps, 
  activeModel = 'Analytical',
  confidence = 0,
  sourceCount = 0,
  paradigm = null,
  isLoading = false,
  progressState = 'idle'
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Research Progress</h3>
        <ResearchArea steps={steps} />
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Research Mode</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Paradigm</span>
              <span className="font-medium">{paradigm ? paradigm.charAt(0).toUpperCase() + paradigm.slice(1) : 'Analyzing...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Confidence</span>
              <span className="font-medium">{confidence > 0 ? `${Math.round(confidence * 100)}%` : '0%'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sources</span>
              <span className="font-medium">{sourceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Model</span>
              <span className="font-medium text-xs">{activeModel}</span>
            </div>
            {isLoading && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Phase</span>
                <span className="font-medium text-xs capitalize">{progressState}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
          <h4 className="font-semibold text-amber-900 mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-amber-800 hover:bg-amber-100 rounded transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Results
            </button>
            <button className="w-full text-left px-3 py-2 text-amber-800 hover:bg-amber-100 rounded transition-colors flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              View Sources
            </button>
            <button className="w-full text-left px-3 py-2 text-amber-800 hover:bg-amber-100 rounded transition-colors flex items-center gap-2">
              <Target className="w-4 h-4" />
              Refine Query
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};