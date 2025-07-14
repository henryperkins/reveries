
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchStep, ResearchStepType } from '../types';

interface ResearchStepCardProps {
  step: ResearchStep;
}

export const ResearchStepCard: React.FC<ResearchStepCardProps> = ({ step }) => {
  const IconComponent = step.icon;
  
  const baseCardClasses = "p-4 rounded-lg bg-westworld-beige flex items-start space-x-3";
  let typeSpecificClasses = "";
  let iconColor = "text-westworld-rust"; 

  switch(step.type) {
    case ResearchStepType.USER_QUERY:
      typeSpecificClasses = "border-westworld-tan border animate-glow"; 
      iconColor = "text-westworld-gold";
      break;
    case ResearchStepType.FINAL_ANSWER:
      typeSpecificClasses = "border-westworld-tan border";
      iconColor = "text-westworld-gold animate-glow";
      break;
    default:
      typeSpecificClasses = "border-westworld-tan border"; 
  }

  return (
    <div className={`${baseCardClasses} ${typeSpecificClasses}`}>
      <div className={`shrink-0 w-6 h-6 ${iconColor} mt-1`}>
        <IconComponent className={step.isSpinning ? 'animate-spin-slow' : ''} />
      </div>
      <div className="grow min-w-0">
        <h3 className="text-md font-semibold text-westworld-gold font-westworld-mono">{step.title}</h3>
        <div className="text-sm mt-1 break-words" style={{color: 'var(--westworld-cream)'}}>
          {typeof step.content === 'string' ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>
            </div>
          ) : (
            step.content 
          )}
        </div>
        {step.timestamp && <p className="text-xs text-westworld-rust mt-1 font-westworld-mono">{step.timestamp}</p>}
      </div>
    </div>
  );
};