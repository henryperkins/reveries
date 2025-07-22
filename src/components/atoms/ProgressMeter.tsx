import React from 'react';
import { useParadigmTheme, getParadigmClasses, type HostParadigm } from '@/theme';

export interface ProgressMeterProps {
  /** Progress value from 0 to 100 */
  value?: number;
  /** Optional label for the progress bar */
  label?: string;
  /** Visual variant of the progress bar */
  variant?: 'default' | 'gradient' | 'paradigm' | 'minimal' | 'stacked';
  /** Paradigm for themed variant */
  paradigm?: HostParadigm;
  /** Whether to show percentage text */
  showPercentage?: boolean;
  /** Whether to animate the progress bar */
  animate?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Custom class names */
  className?: string;
  /** Whether to show loading dots animation */
  showLoadingDots?: boolean;
  /** Whether to show progress segments */
  showSegments?: boolean;
  /** Number of segments to show */
  segments?: number;
  /** Whether to show shimmer effect */
  showShimmer?: boolean;
  /** Custom color classes (for non-paradigm variants) */
  colorClass?: string;
  /** Custom gradient classes */
  gradientClass?: string;
  /** Segments for stacked variant */
  stackedSegments?: {
    value: number;
    color: string;
    label?: string;
    paradigm?: HostParadigm;
  }[];
  /** Layout mode */
  layout?: 'default' | 'compact' | 'inline';
  /** Error callback for configuration issues */
  onError?: (error: string) => void;
}

export const ProgressMeter: React.FC<ProgressMeterProps> = ({
  value = 0,
  label = 'Progress',
  variant = 'default',
  paradigm,
  showPercentage = true,
  animate = true,
  size = 'md',
  className = '',
  showLoadingDots = false,
  showSegments = false,
  segments = 10,
  showShimmer = false,
  colorClass,
  gradientClass,
  stackedSegments = [],
  layout = 'default',
  onError,
}) => {
  const getParadigmTheme = useParadigmTheme();

  // Validate and clamp value between 0 and 100
  const percentage = (() => {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      console.warn('ProgressMeter received invalid value:', value);
      return 0;
    }
    return Math.max(0, Math.min(100, value));
  })();

  // Get size classes
  const sizeClasses = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Get color/gradient classes based on variant
  const getBarClasses = () => {
    switch (variant) {
      case 'paradigm':
        if (paradigm) {
          const classes = getParadigmClasses(paradigm);
          return classes.gradient;
        }
        // Log warning and notify parent of configuration issue
        console.warn('ProgressMeter: paradigm variant used but no paradigm provided');
        onError?.('Missing paradigm configuration');
        return 'bg-theme-secondary animate-pulse'; // Visual indication of error

      case 'gradient':
        return gradientClass || 'bg-gradient-to-r from-westworld-gold to-westworld-copper';

      case 'minimal':
        return colorClass || 'bg-theme-secondary';

      default:
        return colorClass || 'bg-westworld-rust';
    }
  };

  // Get text color for paradigm variant
  const getTextColor = () => {
    if (variant === 'paradigm' && paradigm) {
      const theme = getParadigmTheme(paradigm);
      return theme.text;
    }
    return 'text-westworld-rust';
  };

  // Handle stacked variant
  if (variant === 'stacked' && stackedSegments.length > 0) {
    const totalValue = stackedSegments.reduce((sum, seg) => sum + seg.value, 0);

    // Validate and warn about overflow
    if (totalValue > 100) {
      console.warn(`ProgressMeter: stacked segments total ${totalValue}% exceeds 100%. Normalizing values.`);
      onError?.(`Stacked segments exceed 100% (${totalValue}%)`);
    }

    // Normalize segments if needed
    const normalizedSegments = totalValue > 100
      ? stackedSegments.map(seg => ({
          ...seg,
          value: (seg.value / totalValue) * 100
        }))
      : stackedSegments;

    const finalTotalValue = Math.min(totalValue, 100);

    return (
      <div className={`w-full ${className}`}>
        {/* Header with label */}
        {layout !== 'compact' && label && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-theme-secondary">
              {label}
            </span>
            {showPercentage && (
              <span className="text-xs font-mono text-theme-secondary">
                {Math.round(finalTotalValue)}%
                {totalValue > 100 && (
                  <span
                    className="text-red-500 ml-1"
                    title={`Original total: ${Math.round(totalValue)}%`}
                  >
                    ⚠️
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Stacked bar */}
        <div
          className={`relative w-full ${sizeClasses[size]} bg-theme-secondary/20 rounded-full overflow-hidden shadow-inner`}
          role="progressbar"
          aria-valuenow={finalTotalValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className="flex h-full">
            {normalizedSegments.map((segment, index) => {
              const segmentClasses = segment.paradigm
                ? getParadigmClasses(segment.paradigm).gradient
                : segment.color;

              return (
                <div
                  key={index}
                  className={`${segmentClasses} ${animate ? 'transition-all duration-500' : ''}`}
                  style={{ width: `${segment.value}%` }}
                  title={segment.label || `${Math.round(segment.value)}%`}
                />
              );
            })}
          </div>
        </div>

        {/* Legend for stacked segments */}
        {layout !== 'compact' && normalizedSegments.some(s => s.label) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {normalizedSegments.map((segment, index) => (
              segment.label && (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div
                    className={`w-3 h-3 rounded ${segment.paradigm
                      ? getParadigmClasses(segment.paradigm).gradient
                      : segment.color
                    }`}
                  />
                  <span>{segment.label}: {Math.round(segment.value)}%</span>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    );
  }

  // Compact layout adjustments
  const isCompact = layout === 'compact';

  return (
    <div className={`${isCompact ? 'flex items-center gap-2' : 'w-full'} ${className}`}>
      {/* Header with label and percentage */}
      {!isCompact && (label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={`text-xs font-medium ${getTextColor()}`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-mono text-westworld-copper">
              {percentage}%
            </span>
          )}
        </div>
      )}

      {/* Compact layout label */}
      {isCompact && label && (
        <span className={`text-xs font-medium ${getTextColor()} whitespace-nowrap`}>
          {label}
        </span>
      )}

      {/* Progress bar container */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-westworld-tan/20 rounded-full overflow-hidden shadow-inner`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {/* Progress bar fill */}
        <div
          className={`absolute inset-y-0 left-0 ${getBarClasses()} rounded-full ${
            animate ? 'transition-all duration-500 ease-out' : ''
          } shadow-sm`}
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect */}
          {showShimmer && variant === 'gradient' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Progress segments */}
        {showSegments && (
          <div className="absolute inset-0 flex">
            {[...Array(segments)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-westworld-tan/30 last:border-r-0"
              />
            ))}
          </div>
        )}

        {/* Error indicator for missing paradigm */}
        {variant === 'paradigm' && !paradigm && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-red-500" title="Missing paradigm configuration">⚠️</span>
          </div>
        )}
      </div>

      {/* Loading dots animation */}
      {showLoadingDots && percentage < 100 && (
        <div className="flex justify-center mt-2 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 ${
                variant === 'paradigm' && paradigm
                  ? getParadigmTheme(paradigm).primaryClass
                  : 'bg-westworld-gold'
              } rounded-full animate-bounce`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Convenience wrapper for the old ProgressBar component
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <ProgressMeter
    value={value * 100}
    label="Research Progress"
    variant="gradient"
    showLoadingDots={true}
    showSegments={true}
    showShimmer={true}
  />
);

// Convenience wrapper for rate limit indicator
export const RateLimitBar: React.FC<{
  value: number;
  label?: string;
}> = ({ value, label = "Rate Limit" }) => (
  <ProgressMeter
    value={value}
    label={label}
    variant="minimal"
    size="sm"
    showPercentage={false}
    animate={true}
  />
);
