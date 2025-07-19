import React from 'react'
import { HostParadigm, ParadigmProbabilities } from '@/types'
import { ProgressMeterGroup, ProgressMeter } from '@/components/atoms'

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
            <ProgressMeterGroup
                meters={Object.entries(probabilities).map(([key, value]) => ({
                    label: key,
                    value: value * 100,
                    paradigm: key as HostParadigm,
                }))}
                variant="paradigm"
                size="sm"
                showValues={true}
                showLabels={true}
            />
            <div className="mt-4">
                <ProgressMeter
                    value={confidence * 100}
                    label="Confidence"
                    variant="gradient"
                    size="xs"
                    showPercentage={true}
                    layout="compact"
                    className="text-sm text-westworld-darkbrown"
                />
            </div>
        </div>
    )
}
