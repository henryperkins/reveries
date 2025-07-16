import React, { useState, useCallback, useMemo } from 'react'
import { ResearchAgentService } from '@/services/researchAgentServiceWrapper'
import { ResearchGraphManager } from '@/researchGraph'
import { Header, Controls, InputBar, ResearchArea, ResearchGraphView, ErrorDisplay, ParadigmIndicator, ContextDensityBar } from '@/components'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import {
  ResearchStep,
  ResearchStepType,
  EffortType,
  HostParadigm,
  ParadigmProbabilities,
  ContextLayer,
  ResearchPhase,
  ModelType
} from '@/types'
import { exportToMarkdown, downloadFile } from '@/utils/exportUtils'
import { DEFAULT_MODEL } from '@/constants'
import '@/App.css'
import {
  ParadigmDashboard,
  ContextLayerProgress
} from './components';

const App: React.FC = () => {
  const [research, setResearch] = usePersistedState<ResearchStep[]>('reveries_research', [])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState<ModelType>(DEFAULT_MODEL)
  const [showGraph, setShowGraph] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [effort, setEffort] = useState<EffortType>(EffortType.LOW)
  const [paradigm, setParadigm] = useState<HostParadigm | null>(null)
  const [paradigmProbabilities, setParadigmProbabilities] = useState<ParadigmProbabilities | null>(null)
  const [contextLayers, setContextLayers] = useState<ContextLayer[]>([])
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('discovery')
  const { error, handleError, clearError } = useErrorHandling()

  const graphManager = useMemo(() => new ResearchGraphManager(), [])
  const researchAgent = useMemo(() => ResearchAgentService.getInstance(), [])

  const progressPhase = useCallback(() => {
    const phases: ResearchPhase[] = ['discovery', 'exploration', 'synthesis', 'validation'];
    const currentIndex = phases.indexOf(currentPhase);
    if (currentIndex < phases.length - 1) {
      setCurrentPhase(phases[currentIndex + 1]);
    }
  }, [currentPhase, setCurrentPhase]);

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
      graphManager.addNode(initialStep)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Process with enhanced research agent using processQuery
      const result = await researchAgent.processQuery(input, currentModel, EffortType.MEDIUM)

      clearInterval(progressInterval)
      setProgress(100)

      // Update step with result
      const completedStep: ResearchStep = {
        ...initialStep,
        content: 'synthesis' in result ? result.synthesis : (result as any).text,
        sources: result.sources || []
      }

      // Update paradigm information
      if ('paradigmProbabilities' in result && result.paradigmProbabilities) {
        setParadigmProbabilities(result.paradigmProbabilities)
        const dominantParadigms = Object.entries(result.paradigmProbabilities)
          .sort(([,a], [,b]) => (b as number) - (a as number))
        if (dominantParadigms.length > 0) {
          setParadigm(dominantParadigms[0][0] as HostParadigm)
        }
      }

      // Update context information
      setContextLayers('contextLayers' in result ? result.contextLayers || [] : [])

      setResearch(prev =>
        prev.map(step => step.id === initialStep.id ? completedStep : step)
      )

      // Progress phase if needed
      progressPhase()

    } catch (err) {
      handleError(err as Error)
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }, [isLoading, currentModel, currentPhase, researchAgent, clearError, handleError, graphManager, setResearch, progressPhase])

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
          selectedModel={currentModel}
          onModelChange={setCurrentModel}
          onNewSearch={handleClear}
          onExport={research.length > 0 ? handleExport : undefined}
          onToggleGraph={graphManager.getNodes().length > 0 ? handleToggleGraph : undefined}
          isLoading={isLoading}
          enhancedMode={enhancedMode}
          onEnhancedModeChange={handleEnhancedModeChange}
        />

        {error && (
          <ErrorDisplay error={error.message} onDismiss={clearError} />
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

          <div className="research-container flex flex-col">
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

      {/* Paradigm Dashboard */}
      {paradigmProbabilities && (
        <div className="fixed top-4 right-4 z-50">
          <ParadigmDashboard
            paradigm={paradigm || 'bernard'}
            probabilities={paradigmProbabilities}
            layers={contextLayers}
          />
        </div>
      )}

      {/* Context Layer Progress */}
      {isLoading && contextLayers.length > 0 && paradigm && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <ContextLayerProgress
            layers={contextLayers}
            paradigm={paradigm}
          />
        </div>
      )}
    </div>
  )
}

export default App
