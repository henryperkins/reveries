
import React from 'react';
import { ResearchStep } from '../types';
import { ResearchStepCard } from './ResearchStepCard';

interface ResearchAreaProps {
  steps: ResearchStep[];
}

export const ResearchArea: React.FC<ResearchAreaProps> = ({ steps }) => {
  if (steps.length === 0) {
    return (
      <div className="text-center py-10 westworld-text-copper">
        <p>Provide a query to initiate the host's narrative loop.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-xl font-semibold westworld-text-gold mb-3 pb-2 border-b westworld-border">
        Narrative Construction
      </h2>
      {steps.map((step) => (
        <ResearchStepCard key={step.id} step={step} />
      ))}
    </div>
  );
};
