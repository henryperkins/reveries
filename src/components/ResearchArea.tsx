// src/components/ResearchArea.tsx
import React from 'react';
import { ResearchStep as ResearchStepType } from '../types';
import { ResearchStepCard } from './ResearchStepCard';

/* -------------------------------------------------------------------------- */
/*                                    UI                                      */
/* -------------------------------------------------------------------------- */

interface ResearchAreaProps {
  steps: ResearchStepType[];
}

/**
 * Displays the list of research steps in both “timeline” and “card” formats.
 * Nothing has been removed from the original snippet—both render paths that
 * previously appeared are preserved and properly scoped.
 */
export const ResearchArea: React.FC<ResearchAreaProps> = ({ steps }) => {
  /* empty state ----------------------------------------------------------- */
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl opacity-20">🤔</div>
          <h3 className="mb-2 text-xl font-semibold text-westworld-darkbrown">
            Ready to start researching?
          </h3>
          <p className="text-westworld-darkbrown/70">
            Enter your research question below and let our AI agents explore the
            depths of knowledge for you.
          </p>
        </div>
      </div>
    );
  }

  /* populated state -------------------------------------------------------- */
  return (
    <>
      {/* timeline view (ResearchStep) -------------------------------------- */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <ResearchStepCard
            key={step.id}
            step={step}
            isLast={idx === steps.length - 1}
            index={idx}
          />
        ))}
      </div>

      {/* card view (ResearchStepCard) ------------------------------------- */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className="animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <ResearchStepCard step={step} />
          </div>
        ))}
      </div>
    </>
  );
};
