// src/components/ResearchArea.tsx
import React, { useState } from 'react';
import { ResearchStep, ResearchStepType } from '../types';
import { ResearchStepCard } from './ResearchStepCard';

interface ResearchAreaProps {
  steps: ResearchStep[];
}

export const ResearchArea: React.FC<ResearchAreaProps> = ({ steps }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const updated = new Set(prev);
      updated.has(stepId) ? updated.delete(stepId) : updated.add(stepId);
      return updated;
    });
  };

  return (
    <div className="research-area flex-1 overflow-y-auto p-6 space-y-4">
      {steps.length === 0 ? (
        <div className="flex items-center justify-center h-full text-westworld-rust">
          <p className="text-lg">Begin your journey by entering a query above...</p>
        </div>
      ) : (
        <>
          {steps.map((step, index) => {
            const isFinalAnswer = step.type === ResearchStepType.FINAL_ANSWER && index === steps.length - 1;
            if (isFinalAnswer) {
              return (
                <div key={step.id} className="mt-8 p-6 bg-gradient-to-r from-westworld-gold/10 to-transparent rounded-lg border-l-4 border-westworld-gold">
                  <h3 className="text-xl font-bold text-westworld-darkbrown mb-2">
                    Research Complete
                  </h3>
                  <ResearchStepCard
                    step={step}
                    isExpanded
                    onToggle={() => {}}
                  />
                </div>
              );
            }
            return (
              <ResearchStepCard
                key={step.id}
                step={step}
                isExpanded={expandedSteps.has(step.id)}
                onToggle={() => toggleStep(step.id)}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
