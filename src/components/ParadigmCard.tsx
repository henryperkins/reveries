import { cn } from '../utils/cn';
import { HostParadigm } from '../theme/paradigm';

interface ParadigmCardProps {
  paradigm: HostParadigm;
  title?: string;
  description?: string;
  className?: string;
}

export function ParadigmCard({
  paradigm,
  title = 'Research Session',
  description = 'Explore the depths of consciousness',
  className
}: ParadigmCardProps) {
  return (
    <div
      className={cn(
        /* semantic tokens */
        'bg-surface text-foreground rounded-lg border border-border',
        /* paradigm accent */
        `data-[paradigm=${paradigm}]:border-paradigm-accent`,
        /* dark-mode tokens */
        'dark:bg-surface-dark dark:text-foreground-dark dark:border-border-dark',
        className
      )}
      data-paradigm={paradigm}
    >
      <div className="p-6">
        <h3 className={cn(
          'text-lg font-semibold',
          `data-[paradigm=${paradigm}]:text-paradigm-accent`
        )}>
          {title}
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          {description}
        </p>
        <div className="mt-4 flex items-center space-x-2">
          <span className={cn(
            'inline-block w-3 h-3 rounded-full',
            `data-[paradigm=${paradigm}]:bg-paradigm-accent`
          )} />
          <span className="text-sm font-medium capitalize">{paradigm}</span>
        </div>
      </div>
    </div>
  );
}
