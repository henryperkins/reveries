import React from "react";

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  value: number;
}

// A simple determinate progress bar shown only when value < 1.
export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  // Clamp between 0 and 1
  const clamped = Math.max(0, Math.min(1, value));

  if (clamped >= 1) return null;

  return (
    <div className="w-full h-2 rounded-full overflow-hidden mt-4 westworld-border border" aria-label="Progress" style={{backgroundColor: 'var(--westworld-black)'}}>
      <div
        className="h-full transition-all duration-200 animate-glow"
        style={{
          background: 'linear-gradient(90deg, var(--westworld-copper), var(--westworld-gold))',
          width: `${clamped * 100}%`
        }}
      />
    </div>
  );
};
