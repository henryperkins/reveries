import React from 'react';
import { ResearchStep } from './ResearchStep';
import { ResearchStep as ResearchStepType } from '../types';

interface ResearchAreaProps {
  steps: ResearchStepType[];
}

export const ResearchArea: React.FC<ResearchAreaProps> = ({ steps }) => {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl opacity-20">🤔</div>
          <h3 className="text-xl font-semibold text-westworld-darkbrown mb-2">
            Ready to start researching?
          </h3>
          <p className="text-westworld-darkbrown/70">
            Enter your research question below and let our AI agents explore the depths of knowledge for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <ResearchStep
          key={step.id}
          step={step}
          isLast={index === steps.length - 1}
          index={index}
        />
      ))}
    </div>
  );
};
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
