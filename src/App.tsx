import React, { useState, useCallback, useMemo } from 'react'
import { ResearchAgentService } from '@/services/researchAgentService'
import { ResearchGraphManager } from '@/researchGraph'
import { Header, Controls, InputBar, ResearchArea, ProgressBar, ResearchGraphView, ErrorDisplay, ParadigmIndicator, ContextDensityBar } from '@/components'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import { GENAI_MODEL_FLASH, ResearchStep, ResearchStepType, EffortType, HostParadigm, ParadigmProbabilities } from '@/types'
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
  const [paradigm, setParadigm] = useState<HostParadigm | null>(null)
  const [paradigmProbabilities, setParadigmProbabilities] = useState<ParadigmProbabilities | null>(null)
  const { error, handleError, clearError } = useErrorHandling()

  const graphManager = useMemo(() => new ResearchGraphManager(), [])
  const researchAgent = useMemo(() => ResearchAgentService.getInstance(), [])

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

      // Add to graph
      const rootNode = graphManager.addNode(initialStep)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Process with research agent
      const result = await researchAgent.generateText(input, currentModel as typeof GENAI_MODEL_FLASH, effort)

      clearInterval(progressInterval)
      setProgress(100)

      // Update step with result
      const completedStep: ResearchStep = {
        ...initialStep,
        content: result.text,
        sources: result.sources || []
      }

      // Complete the node in graph
      graphManager.completeNode(rootNode.id)

      setResearch(prev =>
        prev.map(step => step.id === initialStep.id ? completedStep : step)
      )

      // Update node metadata with processing info
      graphManager.updateNodeMetadata(rootNode.id, {
        model: currentModel as typeof GENAI_MODEL_FLASH,
        effort: effort,
        sourcesCount: result.sources?.length || 0
      })

      // Simulate paradigm detection based on query type
      if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('explain')) {
        setParadigm('bernard')
        setParadigmProbabilities({ dolores: 0.15, teddy: 0.20, bernard: 0.45, maeve: 0.20 })
      } else if (input.toLowerCase().includes('protect') || input.toLowerCase().includes('safe')) {
        setParadigm('teddy')
        setParadigmProbabilities({ dolores: 0.10, teddy: 0.50, bernard: 0.25, maeve: 0.15 })
      } else {
        setParadigm('dolores')
        setParadigmProbabilities({ dolores: 0.40, teddy: 0.20, bernard: 0.25, maeve: 0.15 })
      }

    } catch (err) {
      handleError(err as Error)
      // Mark node as errored if it exists
      if (graphManager.getNodes().length > 0) {
        const nodes = graphManager.getNodes()
        const lastNode = nodes[nodes.length - 1]
        graphManager.markNodeError(lastNode.id, (err as Error).message)
      }
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }, [isLoading, currentModel, effort, researchAgent, clearError, handleError, graphManager])

  const handleClear = useCallback(() => {
    setResearch([])
    setParadigm(null)
    setParadigmProbabilities(null)
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
        duration: graphManager.getStatistics().totalDuration
      })
      const timestamp = new Date().toISOString().split('T')[0]
      downloadFile(markdown, `research-${timestamp}.md`, 'text/markdown')
    } catch (err) {
      handleError(err as Error)
    }
  }, [research, currentModel, enhancedMode, handleError, graphManager])

  // Calculate context densities based on progress
  const contextDensities = useMemo(() => {
    if (!isLoading) return null
    const base = progress / 100
    return {
      narrative: Math.floor(base * 25 + Math.random() * 10),
      analytical: Math.floor(base * 35 + Math.random() * 10),
      memory: Math.floor(base * 20 + Math.random() * 10),
      adaptive: Math.floor(base * 20 + Math.random() * 10)
    }
  }, [isLoading, progress])

  return (
    <div className="app min-h-screen bg-gradient-to-br from-westworld-cream to-westworld-beige text-westworld-black">
      <Header />

      <main className="container mx-auto px-4 py-8 scrollbar-westworld">
        <Controls
          selectedEffort={effort}
          onEffortChange={setEffort}
          selectedModel={currentModel as typeof GENAI_MODEL_FLASH}
          onModelChange={setCurrentModel}
          onNewSearch={handleClear}
          onExport={research.length > 0 ? handleExport : undefined}
          onToggleGraph={graphManager.getNodes().length > 0 ? handleToggleGraph : undefined}
          isLoading={isLoading}
          enhancedMode={enhancedMode}
          onEnhancedModeChange={handleEnhancedModeChange}
        />

        {error && (
          <div className="error-display">
            <ErrorDisplay error={error.message} onDismiss={clearError} />
          </div>
        )}

        <ResearchGraphView graphManager={graphManager} isOpen={showGraph} onClose={handleToggleGraph} />

        <div className="space-y-6">
          {/* Show paradigm UI when detected */}
          {paradigm && paradigmProbabilities && !isLoading && (
            <div className="animate-fade-in">
              <ParadigmIndicator
                paradigm={paradigm}
                probabilities={paradigmProbabilities}
                confidence={Math.max(...Object.values(paradigmProbabilities))}
              />
            </div>
          )}

          {/* Show context density during processing */}
          {isLoading && contextDensities && (
            <div className="animate-slide-up">
              <ContextDensityBar
                densities={contextDensities}
                dominantContext="analytical"
                phase="analyzing"
                showLabels={true}
              />
            </div>
          )}

          <div className="research-container">
            <ResearchArea steps={research} />
          </div>
        </div>

        {isLoading && (
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="input-bar">
          <InputBar
            onQuerySubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  )
}

export default App
