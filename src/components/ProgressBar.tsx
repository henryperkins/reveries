import React from "react";

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  value: number;
}

// A simple determinate progress bar shown only when value < 1.
export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  const percentage = Math.round(value * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-westworld-rust">
          Research Progress
        </span>
        <span className="text-xs font-mono text-westworld-copper">
          {percentage}%
        </span>
      </div>

      <div className="relative w-full h-3 bg-westworld-tan/20 rounded-full overflow-hidden shadow-inner">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-westworld-gold to-westworld-copper rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>

        {/* Progress segments */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-westworld-tan/30 last:border-r-0"
            />
          ))}
        </div>
      </div>

      {/* Loading dots animation */}
      <div className="flex justify-center mt-2 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-westworld-gold rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};
