import React from 'react'
import { HostParadigm, ResearchPhase } from '../types'

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
  phase = 'analyzing',
  showLabels = true,
  paradigm,
  showHostColors = false
}) => {
  // Paradigm color mapping
  const paradigmColors = {
    dolores: { primary: 'bg-red-500', gradient: 'from-red-400 to-red-600', text: 'text-red-600' },
    teddy: { primary: 'bg-amber-500', gradient: 'from-amber-400 to-amber-600', text: 'text-amber-600' },
    bernard: { primary: 'bg-blue-500', gradient: 'from-blue-400 to-blue-600', text: 'text-blue-600' },
    maeve: { primary: 'bg-purple-500', gradient: 'from-purple-400 to-purple-600', text: 'text-purple-600' }
  };

  // Auto-detect dominant context if not provided
  const calculatedDominantContext = dominantContext || Object.entries(densities)
    .sort(([,a], [,b]) => b - a)[0][0];

  // Get paradigm styling
  const paradigmStyle = paradigm && showHostColors ? paradigmColors[paradigm] : null;

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
            <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${paradigmStyle?.text}`}>
              {paradigm.charAt(0).toUpperCase() + paradigm.slice(1)} Mode
            </span>
          )}
          <span className="text-sm text-gray-500 capitalize">{phase}</span>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(densities).map(([context, density]) => {
          const isDominant = context === calculatedDominantContext;
          const barColorClass = paradigmStyle && showHostColors && isDominant
            ? `bg-gradient-to-r ${paradigmStyle.gradient}`
            : isDominant
            ? 'bg-gradient-to-r from-westworld-gold to-westworld-copper'
            : 'bg-westworld-copper';

          return (
            <div key={context}>
              {showLabels && (
                <div className="flex justify-between text-sm mb-1">
                  <span className={`capitalize ${
                    isDominant 
                      ? paradigmStyle && showHostColors 
                        ? `font-semibold ${paradigmStyle.text}` 
                        : 'font-semibold text-westworld-gold'
                      : ''
                  }`}>
                    {context}
                    {isDominant && ' ⭐'}
                  </span>
                  <span>{density}%</span>
                </div>
              )}
              <div className="bg-westworld-tan/20 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                  style={{ width: `${density}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}
