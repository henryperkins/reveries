import React from 'react'
import { HostParadigm, ResearchPhase } from '@/types'
import { getParadigmTheme, getParadigmClasses } from '@/theme'
import { ProgressMeter } from '@/components/atoms'

interface ContextDensityBarProps {
  densities: {
    narrative: number
    analytical: number
    memory: number
    adaptive: number
  }
  dominantContext?: string
  phase?: ResearchPhase | string
  showLabels?: boolean
  paradigm?: HostParadigm
  showHostColors?: boolean
}

export const ContextDensityBar: React.FC<ContextDensityBarProps> = ({
  densities,
  dominantContext,
  phase = 'synthesis',
  showLabels = true,
  paradigm,
  showHostColors = false
}) => {
  // Get paradigm theme and classes
  const paradigmTheme = paradigm ? getParadigmTheme(paradigm) : null;
  const paradigmClasses = paradigm ? getParadigmClasses(paradigm) : null;

  // Auto-detect dominant context if not provided
  const calculatedDominantContext = dominantContext || Object.entries(densities)
    .sort(([,a], [,b]) => b - a)[0][0];

  // Use paradigm styling if enabled
  const useParadigmStyle = paradigm && showHostColors && paradigmTheme;

  // Phase emoji mapping
  const phaseEmojis = {
    discovery: '🔍',
    exploration: '🌟',
    synthesis: '🔬',
    validation: '✅',
    analyzing: '⚡'
  };

  const phaseEmoji = phaseEmojis[phase as keyof typeof phaseEmojis] || '⚡';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">
          {phaseEmoji} Context Analysis
        </h3>
        <div className="flex items-center gap-2">
          {paradigm && showHostColors && (
            <span className={`text-xs px-2 py-1 rounded-full ${paradigmClasses?.badge || 'bg-gray-100'}`}>
              {paradigm.charAt(0).toUpperCase() + paradigm.slice(1)} Mode
            </span>
          )}
          <span className="text-sm text-gray-500 capitalize">{phase}</span>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(densities).map(([context, density]) => {
          const isDominant = context === calculatedDominantContext;

          return (
            <div key={context}>
              {showLabels && (
                <div className="flex justify-between text-sm mb-1">
                  <span className={`capitalize ${
                    isDominant 
                      ? useParadigmStyle
                        ? `font-semibold ${paradigmTheme!.text}` 
                        : 'font-semibold text-westworld-gold'
                      : ''
                  }`}>
                    {context}
                    {isDominant && ' ⭐'}
                  </span>
                  <span>{density}%</span>
                </div>
              )}
              <ProgressMeter
                value={density}
                variant={useParadigmStyle && isDominant ? 'paradigm' : 'gradient'}
                paradigm={useParadigmStyle && isDominant ? paradigm : undefined}
                showPercentage={false}
                label=""
                gradientClass={isDominant && !useParadigmStyle ? 'from-westworld-gold to-westworld-copper' : undefined}
                colorClass={!isDominant ? 'bg-westworld-copper' : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  )
}
