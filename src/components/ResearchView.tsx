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
        <h3 className="text-xl font-semibold text-theme-primary mb-4">Research Progress</h3>
        <ResearchArea steps={steps} />
      </div>

      <div className="space-y-4">
        <div className="bg-theme-primary rounded-lg shadow-theme border border-theme-primary p-6">
          <h4 className="font-semibold text-theme-primary mb-4">Research Mode</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary">Paradigm</span>
              <span className="font-medium text-theme-primary">{paradigm ? paradigm.charAt(0).toUpperCase() + paradigm.slice(1) : 'Analyzing...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary">Confidence</span>
              <span className="font-medium text-theme-primary">{confidence > 0 ? `${Math.round(confidence * 100)}%` : '0%'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary">Sources</span>
              <span className="font-medium text-theme-primary">{sourceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary">Model</span>
              <span className="font-medium text-xs text-theme-primary">{activeModel}</span>
            </div>
            {isLoading && (
              <div className="flex items-center justify-between">
                <span className="text-theme-secondary">Phase</span>
                <span className="font-medium text-xs capitalize text-theme-primary">{progressState}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-westworld-gold/10 rounded-lg border border-westworld-gold/30 p-6">
          <h4 className="font-semibold text-westworld-darkBrown mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-westworld-darkBrown hover:bg-westworld-gold/10 rounded transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Results
            </button>
            <button className="w-full text-left px-3 py-2 text-westworld-darkBrown hover:bg-westworld-gold/10 rounded transition-colors flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              View Sources
            </button>
            <button className="w-full text-left px-3 py-2 text-westworld-darkBrown hover:bg-westworld-gold/10 rounded transition-colors flex items-center gap-2">
              <Target className="w-4 h-4" />
              Refine Query
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};