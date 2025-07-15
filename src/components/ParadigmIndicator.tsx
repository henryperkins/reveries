import React from 'react'
import { HostParadigm, ParadigmProbabilities } from '@/types'

interface ParadigmIndicatorProps {
    paradigm: HostParadigm
    probabilities: ParadigmProbabilities
    confidence: number
}

export const ParadigmIndicator: React.FC<ParadigmIndicatorProps> = ({ paradigm, probabilities, confidence }) => {
    const paradigmLabels: Record<HostParadigm, string> = {
        dolores: 'Action-Oriented',
        teddy: 'Protective',
        bernard: 'Analytical',
        maeve: 'Strategic'
    }

    return (
        <div className="card">
            <h3 className="text-lg font-semibold mb-2">Research Paradigm: {paradigmLabels[paradigm]}</h3>
            <div className="space-y-2">
                {Object.entries(probabilities).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                        <span className="capitalize w-20">{key}:</span>
                        <div className="flex-1 bg-westworld-tan/20 rounded-full h-2">
                            <div
                                className="bg-westworld-gold h-full rounded-full transition-all duration-300"
                                style={{ width: `${value * 100}%` }}
                            />
                        </div>
                        <span className="text-sm">{Math.round(value * 100)}%</span>
                    </div>
                ))}
            </div>
            <p className="text-sm text-westworld-darkbrown mt-2">
                Confidence: {Math.round(confidence * 100)}%
            </p>
        </div>
    )
}
