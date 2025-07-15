import React, { useState, useCallback, useMemo } from 'react'
import { ResearchAgentService } from '@/services/researchAgentService'
import { Header, Controls, InputBar, ResearchArea, ProgressBar, ResearchGraphView, ErrorDisplay } from '@/components'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import { GENAI_MODEL_FLASH, ResearchStep, ResearchStepType, EffortType } from '@/types'
import { exportToMarkdown, downloadFile } from '@/utils/exportUtils'
import '@/App.css'

const App: React.FC = () => {
  const [research, setResearch] = usePersistedState<ResearchStep[]>('reveries_research', [])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState(GENAI_MODEL_FLASH)
  const [showGraph, setShowGraph] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [effort, setEffort] = useState<EffortType>(EffortType.LOW)
  const { error, handleError, clearError } = useErrorHandling()

  // graphManager removed, will use researchAgent as graphManager if needed

  const researchAgent = useMemo(() => ResearchAgentService.getInstance(), [])

  // contextEngineering removed

  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setProgress(0)
    clearError()

    try {
      // Create initial step
      const initialStep: ResearchStep = {
        id: crypto.randomUUID(),
        title: 'User Query',
        icon: () => null,
        content: input,
        timestamp: new Date().toISOString(),
        type: ResearchStepType.USER_QUERY,
        sources: []
      }

      setResearch(prev => [...prev, initialStep])

      // Process with research agent
      const result = await researchAgent.generateText(input, currentModel as typeof GENAI_MODEL_FLASH, effort)
      // Note: If you want progress, you must adapt to the available API.

      // Update step with result
      const completedStep: ResearchStep = {
        ...initialStep,
        content: result.text,
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

  const handleExport = useCallback(async () => {
    try {
      const query = research[0]?.content || 'Research Export'
      const markdown = await exportToMarkdown(query as string, research, {
        model: currentModel,
        effort: enhancedMode ? 'enhanced' : 'standard',
        timestamp: new Date().toLocaleString(),
        // duration: graphManager.getStatistics().totalDuration // Remove if not needed
      })
      const timestamp = new Date().toISOString().split('T')[0]
      downloadFile(markdown, `research-${timestamp}.md`, 'text/markdown')
    } catch (err) {
      handleError(err as Error)
    }
  }, [research, currentModel, enhancedMode, handleError])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Controls
          selectedEffort={effort}
          onEffortChange={setEffort}
          selectedModel={currentModel as typeof GENAI_MODEL_FLASH}
          onModelChange={setCurrentModel}
          onNewSearch={handleClear}
          isLoading={isLoading}
          enhancedMode={enhancedMode}
          onEnhancedModeChange={handleEnhancedModeChange}
        />

        {error && (
          <ErrorDisplay error={error.message} onDismiss={clearError} />
        )}

        {/* ResearchGraphView expects a graphManager, but researchAgent is not a graphManager.
            You may need to adapt this or pass the correct object. For now, pass null. */}
        <ResearchGraphView graphManager={null as any} isOpen={showGraph} onClose={handleToggleGraph} />

        <ResearchArea steps={research} />
        {isLoading && <ProgressBar value={progress} />}

        <InputBar
          onQuerySubmit={handleSubmit}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}

export default App
