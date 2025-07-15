import React from 'react'

interface ContextDensityBarProps {
  densities: {
    narrative: number
    analytical: number
    memory: number
    adaptive: number
  }
  dominantContext: string
  phase: string
  showLabels?: boolean
}

export const ContextDensityBar: React.FC<ContextDensityBarProps> = ({
  densities,
  dominantContext,
  phase,
  showLabels = true
}) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Context Analysis - {phase}</h3>
      <div className="space-y-3">
        {Object.entries(densities).map(([context, density]) => (
          <div key={context}>
            {showLabels && (
              <div className="flex justify-between text-sm mb-1">
                <span className={`capitalize ${context === dominantContext ? 'font-semibold text-westworld-gold' : ''}`}>
                  {context}
                </span>
                <span>{density}%</span>
              </div>
            )}
            <div className="bg-westworld-tan/20 rounded-full h-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  context === dominantContext
                    ? 'bg-gradient-to-r from-westworld-gold to-westworld-copper'
                    : 'bg-westworld-copper'
                }`}
                style={{ width: `${density}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
