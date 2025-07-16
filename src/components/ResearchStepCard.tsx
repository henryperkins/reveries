import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchStep, ResearchStepType } from '../types';

interface ResearchStepCardProps {
  step: ResearchStep;
  isExpanded?: boolean;
  onToggle?: () => void;
  onNavigate?: (stepId: string) => void;
}

export const ResearchStepCard: React.FC<ResearchStepCardProps> = ({
  step
}) => {
  // Fallback to a no-op component if the step lacks an icon
  const IconComponent: React.ElementType =
    (step.icon ?? (() => null)) as React.ElementType;

  const getStepStyles = (type: ResearchStepType) => {
    const styles: Record<ResearchStepType, {
      iconColor: string;
      borderColor: string;
      bgGradient: string;
      glowColor: string;
      animate: boolean;
    }> = {
      [ResearchStepType.USER_QUERY]: {
        iconColor: 'text-westworld-gold',
        borderColor: 'border-westworld-gold/30',
        bgGradient: 'from-westworld-gold/5 to-transparent',
        glowColor: 'shadow-westworld-glow',
        animate: true
      },
      [ResearchStepType.GENERATING_QUERIES]: {
        iconColor: 'text-westworld-darkbrown',
        borderColor: 'border-westworld-darkbrown/30',
        bgGradient: 'from-westworld-darkbrown/5 to-transparent',
        glowColor: '',
        animate: false
      },
      [ResearchStepType.WEB_RESEARCH]: {
        iconColor: 'text-westworld-darkbrown',
        borderColor: 'border-westworld-darkbrown/30',
        bgGradient: 'from-westworld-darkbrown/5 to-transparent',
        glowColor: '',
        animate: false
      },
      [ResearchStepType.REFLECTION]: {
        iconColor: 'text-westworld-darkbrown',
        borderColor: 'border-westworld-darkbrown/30',
        bgGradient: 'from-westworld-darkbrown/5 to-transparent',
        glowColor: '',
        animate: false
      },
      [ResearchStepType.SEARCHING_FINAL_ANSWER]: {
        iconColor: 'text-westworld-darkbrown',
        borderColor: 'border-westworld-darkbrown/30',
        bgGradient: 'from-westworld-darkbrown/5 to-transparent',
        glowColor: '',
        animate: false
      },
      [ResearchStepType.FINAL_ANSWER]: {
        iconColor: 'text-westworld-gold animate-pulse-soft',
        borderColor: 'border-westworld-gold/40',
        bgGradient: 'from-westworld-gold/10 to-transparent',
        glowColor: 'shadow-westworld-glow',
        animate: false
      },
      [ResearchStepType.ERROR]: {
        iconColor: 'text-westworld-rust',
        borderColor: 'border-westworld-rust/50',
        bgGradient: 'from-westworld-rust/10 to-transparent',
        glowColor: '',
        animate: false
      },
      [ResearchStepType.ANALYTICS]: {
        iconColor: 'text-westworld-darkbrown',
        borderColor: 'border-westworld-darkbrown/30',
        bgGradient: 'from-westworld-darkbrown/5 to-transparent',
        glowColor: '',
        animate: false
      }
    };

    return styles[type];
  };

  const stepStyles = getStepStyles(step.type);

  return (
    <div className={`
      research-step-card
      relative overflow-hidden
      bg-gradient-to-br ${stepStyles.bgGradient}
      border-l-4 ${stepStyles.borderColor}
      rounded-lg p-6
      ${stepStyles.animate ? 'animate-glow' : ''}
      ${stepStyles.glowColor}
      transition-all duration-300 ease-out
      hover:translate-x-1 hover:shadow-xl
      group
    `}>
      {/* Background pattern for visual interest - adapted to Westworld aesthetic */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, var(--westworld-gold) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, var(--westworld-darkbrown) 0%, transparent 50%)`,
        }} />
      </div>

      <div className="relative flex gap-4">
        <div className={`
          shrink-0 w-10 h-10 ${stepStyles.iconColor}
          transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
          ${step.isSpinning ? 'animate-spin' : ''}
        `}>
          <IconComponent />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-westworld-darkbrown mb-3 flex items-center justify-between">
            <span>{step.title}</span>
            {step.type === ResearchStepType.FINAL_ANSWER && (
              <span className="text-xs px-2 py-1 bg-westworld-gold/20 text-westworld-darkbrown rounded-full font-medium">
                Narrative Complete
              </span>
            )}
          </h3>
          <div className="text-westworld-rust space-y-3">
            {typeof step.content === 'string' ? (
              <div className="prose prose-sm max-w-none prose-headings:text-westworld-darkbrown prose-a:text-westworld-gold hover:prose-a:text-westworld-rust">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {step.content}
                </ReactMarkdown>
              </div>
            ) : (
              step.content
            )}
          </div>

          {/* Sources section with Westworld-themed styling */}
          {step.sources && step.sources.length > 0 && (
            <div className="mt-4 p-3 bg-westworld-darkbrown/5 rounded-md border border-westworld-gold/20">
              <p className="text-xs font-medium text-westworld-gold mb-2 uppercase tracking-wide">
                Memory Fragments ({step.sources.length})
              </p>
              <ul className="space-y-1">
                {step.sources.slice(0, 3).map((source, idx) => (
                  <li key={idx} className="text-xs text-westworld-rust hover:text-westworld-gold transition-colors">
                    <a href={source.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 group/link">
                      <span className="opacity-50 group-hover/link:opacity-100">→</span>
                      <span className="truncate">{source.name || source.url}</span>
                    </a>
                  </li>
                ))}
                {step.sources.length > 3 && (
                  <li className="text-xs text-westworld-rust italic">
                    +{step.sources.length - 3} more fragments
                  </li>
                )}
              </ul>
            </div>
          )}

          {step.timestamp && (
            <p className="text-xs text-westworld-rust mt-4 font-mono opacity-60 group-hover:opacity-100 transition-opacity">
              {step.timestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
