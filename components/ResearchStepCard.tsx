
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchStep, ResearchStepType } from '../types';

interface ResearchStepCardProps {
  step: ResearchStep;
}

export const ResearchStepCard: React.FC<ResearchStepCardProps> = ({ step }) => {
  const IconComponent = step.icon;
  
  const baseCardClasses = "p-4 rounded-lg westworld-card flex items-start space-x-3";
  let typeSpecificClasses = "";
  let iconColor = "westworld-text-copper"; 

  switch(step.type) {
    case ResearchStepType.USER_QUERY:
      typeSpecificClasses = "westworld-border border animate-glow"; 
      iconColor = "westworld-text-gold";
      break;
    case ResearchStepType.FINAL_ANSWER:
      typeSpecificClasses = "westworld-border border westworld-glow";
      iconColor = "westworld-text-gold animate-glow";
      break;
    default:
      typeSpecificClasses = "westworld-border border"; 
  }

  return (
    <div className={`${baseCardClasses} ${typeSpecificClasses}`}>
      <div className={`shrink-0 w-6 h-6 ${iconColor} mt-1`}>
        <IconComponent className={step.isSpinning ? 'animate-spin-slow' : ''} />
      </div>
      <div className="grow min-w-0">
        <h3 className="text-md font-semibold westworld-text-gold westworld-mono">{step.title}</h3>
        <div className="text-sm mt-1 break-words" style={{color: 'var(--westworld-cream)'}}>
          {typeof step.content === 'string' ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>
            </div>
          ) : (
            step.content 
          )}
        </div>
        {step.timestamp && <p className="text-xs westworld-text-copper mt-1 westworld-mono">{step.timestamp}</p>}
      </div>
    </div>
  );
};