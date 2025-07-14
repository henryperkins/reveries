import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchStep, ResearchStepType } from '../types';

interface ResearchStepCardProps {
  step: ResearchStep;
}

export const ResearchStepCard: React.FC<ResearchStepCardProps> = ({ step }) => {
  const IconComponent = step.icon;

  const getStepStyles = (type: ResearchStepType) => {
    const styles = {
      [ResearchStepType.USER_QUERY]: {
        iconColor: 'text-accent',
        borderColor: 'border-accent/30',
        bgGradient: 'from-accent/5 to-transparent',
        animate: true
      },
      [ResearchStepType.FINAL_ANSWER]: {
        iconColor: 'text-accent animate-pulse-soft',
        borderColor: 'border-accent/40',
        bgGradient: 'from-accent/10 to-transparent',
        animate: false
      },
      [ResearchStepType.ERROR]: {
        iconColor: 'text-red-500',
        borderColor: 'border-red-300',
        bgGradient: 'from-red-50 to-transparent',
        animate: false
      },
      default: {
        iconColor: 'text-accent-dark',
        borderColor: 'border-border',
        bgGradient: 'from-surface to-transparent',
        animate: false
      }
    };

    return styles[type] || styles.default;
  };

  const stepStyles = getStepStyles(step.type);

  return (
    <div className={`
      research-step-card
      bg-gradient-to-r ${stepStyles.bgGradient}
      border ${stepStyles.borderColor}
      ${stepStyles.animate ? 'animate-glow' : ''}
      group
    `}>
      <div className="flex gap-4">
        <div className={`
          shrink-0 w-8 h-8 ${stepStyles.iconColor}
          transition-transform duration-200 group-hover:scale-110
          ${step.isSpinning ? 'animate-spin' : ''}
        `}>
          <IconComponent />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {step.title}
          </h3>
          <div className="text-text-secondary space-y-2">
            {typeof step.content === 'string' ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {step.content}
                </ReactMarkdown>
              </div>
            ) : (
              step.content
            )}
          </div>
          {step.timestamp && (
            <p className="text-xs text-text-muted mt-3 font-mono">
              {step.timestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
