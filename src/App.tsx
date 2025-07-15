import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { ResearchGraphManager, ResearchStep, ResearchStepType, generateMermaidDiagram } from '@/researchGraph'
import { ResearchAgentService } from '@/services/researchAgentService'
import { ContextEngineeringService } from '@/services/contextEngineeringService'
import { Header, Controls, InputBar, ResearchArea, ProgressBar, ResearchGraphView, ErrorDisplay } from '@/components'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import { GENAI_MODEL_FLASH } from '@/types'
import '@/App.css'

const App: React.FC = () => {
  const [research, setResearch] = usePersistedState<ResearchStep[]>('reveries_research', [])
  const [isLoading, setIsLoading] = useState(false)
  const [currentModel, setCurrentModel] = useState(GENAI_MODEL_FLASH)
  const [showGraph, setShowGraph] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const { error, handleError, clearError } = useErrorHandling()

  const graphManager = useMemo(() => {
    const manager = new ResearchGraphManager()
    research.forEach((step, index) => {
      manager.addNode(step, index > 0 ? research[index - 1].id : undefined)
    })
    return manager
  }, [research])

  const researchAgent = useMemo(() => {
    return new ResearchAgentService()
  }, [])

  const contextEngineering = useMemo(() => {
    return new ContextEngineeringService()
  }, [])

  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    clearError()

    try {
      // Create initial step
      const initialStep: ResearchStep = {
        id: crypto.randomUUID(),
        content: input,
        timestamp: new Date().toISOString(),
        type: ResearchStepType.RESEARCH,
        status: 'pending',
        sources: []
      }

      setResearch(prev => [...prev, initialStep])

      // Process with research agent
      const result = await researchAgent.processQuery(input, {
        model: currentModel,
        enhancedMode,
        onProgress: (progress) => {
          // Update progress in UI
          console.log('Progress:', progress)
        }
      })

      // Update step with result
      const completedStep: ResearchStep = {
        ...initialStep,
        content: result.text,
        status: 'completed',
        sources: result.sources || []
      }

      setResearch(prev =>
        prev.map(step => step.id === initialStep.id ? completedStep : step)
      )

    } catch (err) {
      handleError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, currentModel, enhancedMode, researchAgent, clearError, handleError])

  const handleClear = useCallback(() => {
    setResearch([])
  }, [setResearch])

  const handleToggleGraph = useCallback(() => {
    setShowGraph(prev => !prev)
  }, [])

  const handleEnhancedModeChange = useCallback((enabled: boolean) => {
    setEnhancedMode(enabled)
  }, [])

  const handleExport = useCallback(() => {
    const mermaidDiagram = generateMermaidDiagram(graphManager)
    // Export logic here
    console.log('Mermaid diagram:', mermaidDiagram)
  }, [graphManager])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Controls
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          enhancedMode={enhancedMode}
          onEnhancedModeChange={handleEnhancedModeChange}
          showGraph={showGraph}
          onToggleGraph={handleToggleGraph}
          onExport={handleExport}
          onClear={handleClear}
        />

        {error && (
          <ErrorDisplay error={error} onDismiss={clearError} />
        )}

        {showGraph ? (
          <ResearchGraphView manager={graphManager} />
        ) : (
          <>
            <ResearchArea research={research} />
            {isLoading && <ProgressBar />}
          </>
        )}

        <InputBar
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Enter your research query..."
        />
      </main>
    </div>
  )
}

export default App
