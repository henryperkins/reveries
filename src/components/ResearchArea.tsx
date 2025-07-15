import React from 'react';
import { ResearchStep } from '../types';
import { ResearchStepCard } from './ResearchStepCard';

interface ResearchAreaProps {
  steps: ResearchStep[];
}

export const ResearchArea: React.FC<ResearchAreaProps> = ({ steps }) => {
  if (steps.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-surface">
          <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-text-muted text-lg">
          Enter a query to begin the research narrative
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <h2 className="text-2xl font-serif text-text-primary">
          Research Narrative
        </h2>
        <span className="text-sm text-text-muted font-mono">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ResearchStepCard step={step} />
          </div>
        ))}
      </div>
    </div>
  );
};
