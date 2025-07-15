import React from 'react';
import { motion } from 'framer-motion';

interface ContextDensityBarProps {
  densities: {
    narrative: number;
    analytical: number;
    memory: number;
    adaptive: number;
  };
  dominantContext: 'narrative' | 'analytical' | 'memory' | 'adaptive';
  phase: 'initializing' | 'analyzing' | 'synthesizing' | 'finalizing';
  showLabels?: boolean;
}

const CONTEXT_INFO = {
  narrative: { color: '#D4AF37', label: 'Narrative', icon: '📖' },
  analytical: { color: '#B87333', label: 'Analytical', icon: '🔍' },
  memory: { color: '#8B4513', label: 'Memory', icon: '💭' },
  adaptive: { color: '#654321', label: 'Adaptive', icon: '🔄' }
};

export const ContextDensityBar: React.FC<ContextDensityBarProps> = ({
  densities,
  dominantContext,
  phase,
  showLabels = false
}) => {
  const maxDensity = Math.max(...Object.values(densities));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-westworld-darkbrown">
          Context Analysis - {phase.charAt(0).toUpperCase() + phase.slice(1)}
        </h3>
        <span className="text-xs text-westworld-darkbrown/60">
          Dominant: {CONTEXT_INFO[dominantContext].label}
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(densities).map(([context, density]) => {
          const contextKey = context as keyof typeof CONTEXT_INFO;
          const info = CONTEXT_INFO[contextKey];
          const percentage = maxDensity > 0 ? (density / maxDensity) * 100 : 0;

          return (
            <div key={context} className="space-y-1">
              {showLabels && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-westworld-darkbrown">
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>
                  <span className="text-westworld-darkbrown/60">{density}%</span>
                </div>
              )}

              <div className="h-2 bg-westworld-tan/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: info.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
