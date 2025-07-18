import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { ResearchAgentService } from '@/services/researchAgentServiceWrapper'
import { FunctionCallingService } from '@/services/functionCallingService'
import { DatabaseService } from '@/services/databaseService'
import { ResearchGraphManager } from '@/researchGraph'
import { Header, Controls, InputBar, ResearchArea, ResearchGraphView, ErrorDisplay, ParadigmIndicator, ContextDensityBar, FunctionCallVisualizer, SemanticSearch, SessionHistoryBrowser, ParadigmDashboard, ContextLayerProgress, LiveFunctionCallIndicator } from '@/components'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useResearchSessions } from '@/hooks/useEnhancedPersistedState'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import {
  ResearchStep,
  ResearchStepType,
  EffortType,
  HostParadigm,
  ParadigmProbabilities,
  ContextLayer,
  ResearchPhase,
  ModelType,
  FunctionCallHistory
} from '@/types'
import { exportToMarkdown, downloadFile } from '@/utils/exportUtils'
import { DEFAULT_MODEL } from '@/constants'
import '@/App.css'

const App: React.FC = () => {
  const [research, setResearch] = usePersistedState<ResearchStep[]>('reveries_research', [])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState<ModelType>(DEFAULT_MODEL)
  const [showGraph, setShowGraph] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(true)
  const [effort, setEffort] = useState<EffortType>(EffortType.MEDIUM)
  const [paradigm, setParadigm] = useState<HostParadigm | null>(null)
  const [paradigmProbabilities, setParadigmProbabilities] = useState<ParadigmProbabilities | null>(null)
  const [contextLayers, setContextLayers] = useState<ContextLayer[]>([])
  const [currentLayer, setCurrentLayer] = useState<ContextLayer | null>(null)
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('discovery')
  const { error, handleError, clearError } = useErrorHandling()

  const graphManager = useMemo(() => new ResearchGraphManager(), [])
  const researchAgent = useMemo(() => ResearchAgentService.getInstance(), [])
  const functionCallingService = useMemo(() => FunctionCallingService.getInstance(), [])
  const databaseService = useMemo(() => DatabaseService.getInstance(), [])
  const [functionHistory, setFunctionHistory] = useState<FunctionCallHistory[]>([])
  const [showSemanticSearch, setShowSemanticSearch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSessionHistory, setShowSessionHistory] = useState(false)
  const [liveFunctionCalls, setLiveFunctionCalls] = useState<Array<{
    id: string;
    function: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp: number;
    duration?: number;
  }>>([]);
  
  // Research sessions management
  const { sessions, addSession, deleteSession } = useResearchSessions()

  // Update function history when research changes
  useEffect(() => {
    const history = functionCallingService.getExecutionHistory();
    setFunctionHistory(history);
  }, [research, functionCallingService]);

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
    setCurrentLayer(null)
    setRealTimeContextDensities(null)
    setLiveFunctionCalls([])
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

      // Process with enhanced research agent using processQuery
      const result = await researchAgent.processQuery(
        input, 
        currentModel, 
        effort,
        (message: string) => {
          console.log('🔄 Research Progress:', message);
          
          // Handle tool usage tracking
          if (message.startsWith('tool_used:')) {
            const toolName = message.split(':')[1];
            
            // Add to live function calls
            const callId = crypto.randomUUID();
            setLiveFunctionCalls(prev => [...prev, {
              id: callId,
              function: toolName,
              status: 'running',
              timestamp: Date.now()
            }]);
            
            // Mark as completed after a brief delay to simulate processing
            setTimeout(() => {
              setLiveFunctionCalls(prev => 
                prev.map(call => 
                  call.id === callId 
                    ? { ...call, status: 'completed', duration: Date.now() - call.timestamp }
                    : call
                )
              );
            }, 500);
            
            setResearch(prev => 
              prev.map(step => {
                if (step.isSpinning) {
                  const currentTools = step.toolsUsed || [];
                  if (!currentTools.includes(toolName)) {
                    return { ...step, toolsUsed: [...currentTools, toolName] };
                  }
                }
                return step;
              })
            );
            return;
          }
          
          // Create research steps based on actual progress messages
          if (message.includes('Query classified as:')) {
            setProgress(15);
            const generatingStep: ResearchStep = {
              id: crypto.randomUUID(),
              title: 'Analyzing Query',
              icon: () => null,
              content: message,
              timestamp: new Date().toISOString(),
              type: ResearchStepType.GENERATING_QUERIES,
              sources: [],
              isSpinning: true,
              toolsUsed: [],
              recommendedTools: ['query_analysis', 'paradigm_classification']
            };
            setResearch(prev => [...prev, generatingStep]);
            
          } else if (message.includes('Routing to') && message.includes('paradigm')) {
            setProgress(25);
            const routingStep: ResearchStep = {
              id: crypto.randomUUID(),
              title: 'Selecting Research Strategy',
              icon: () => null,
              content: message,
              timestamp: new Date().toISOString(),
              type: ResearchStepType.GENERATING_QUERIES,
              sources: [],
              isSpinning: true,
              toolsUsed: [],
              recommendedTools: ['paradigm_routing', 'strategy_selection']
            };
            setResearch(prev => [...prev, routingStep]);
            
          } else if (message.includes('search queries') || message.includes('Comprehensive research')) {
            setProgress(40);
            const searchingStep: ResearchStep = {
              id: crypto.randomUUID(),
              title: 'Conducting Web Research',
              icon: () => null,
              content: message,
              timestamp: new Date().toISOString(),
              type: ResearchStepType.WEB_RESEARCH,
              sources: [],
              isSpinning: true,
              toolsUsed: [],
              recommendedTools: ['web_search', 'google_search', 'bing_search', 'academic_search']
            };
            setResearch(prev => [...prev, searchingStep]);
            
          } else if (message.includes('quality') || message.includes('evaluating') || message.includes('self-healing')) {
            setProgress(60);
            const reflectionStep: ResearchStep = {
              id: crypto.randomUUID(),
              title: 'Evaluating Research Quality',
              icon: () => null,
              content: message,
              timestamp: new Date().toISOString(),
              type: ResearchStepType.REFLECTION,
              sources: [],
              isSpinning: true,
              toolsUsed: [],
              recommendedTools: ['quality_evaluation', 'fact_verification', 'source_validation']
            };
            setResearch(prev => [...prev, reflectionStep]);
            
          } else if (message.includes('Finalizing') || message.includes('synthesis') || message.includes('comprehensive answer')) {
            setProgress(80);
            setCurrentLayer('compress');
            const synthesisStep: ResearchStep = {
              id: crypto.randomUUID(),
              title: 'Synthesizing Final Answer',
              icon: () => null,
              content: message,
              timestamp: new Date().toISOString(),
              type: ResearchStepType.SEARCHING_FINAL_ANSWER,
              sources: [],
              isSpinning: true,
              toolsUsed: [],
              recommendedTools: ['synthesis_engine', 'content_compression', 'narrative_generation']
            };
            setResearch(prev => [...prev, synthesisStep]);
          }
          
          // Update any existing steps with more detailed content
          if (message.includes('[Dolores]') || message.includes('[Teddy]') || message.includes('[Bernard]')) {
            setResearch(prev => 
              prev.map(step => {
                if (step.isSpinning && step.type === ResearchStepType.REFLECTION) {
                  return { ...step, content: step.content + '\n\n' + message };
                }
                return step;
              })
            );
          }

          // Handle layer progress messages
          if (message.startsWith('layer_progress:')) {
            const layer = message.split(':')[1] as ContextLayer;
            setCurrentLayer(layer);
          }
          // Also handle legacy message-based detection
          else if (message.includes('Writing') || message.includes('memory')) setCurrentLayer('write')
          else if (message.includes('Selecting') || message.includes('sources')) setCurrentLayer('select')
          else if (message.includes('Compressing') || message.includes('synthesis')) setCurrentLayer('compress')
          else if (message.includes('Isolating') || message.includes('analysis')) setCurrentLayer('isolate')
        }
      )

      setProgress(100)

      // Create final answer step
      const finalAnswerStep: ResearchStep = {
        id: crypto.randomUUID(),
        title: 'Research Complete',
        icon: () => null,
        content: 'synthesis' in result ? result.synthesis : (result as any).text,
        timestamp: new Date().toISOString(),
        type: ResearchStepType.FINAL_ANSWER,
        sources: result.sources || []
      }

      // Stop any spinning indicators by updating previous steps
      setResearch(prev => 
        prev.map(step => ({ ...step, isSpinning: false }))
      )

      // Add final answer step
      setResearch(prev => [...prev, finalAnswerStep])

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
      
      // Update context densities with real data
      if ('contextDensity' in result && result.contextDensity) {
        const density = result.contextDensity.density || 0.5;
        const phase = result.contextDensity.phase || currentPhase;
        
        // Calculate realistic context densities based on phase and paradigm
        let analytical = Math.floor(density * 100);
        let narrative = 20;
        let memory = 15;
        let adaptive = 25;
        
        // Adjust based on paradigm
        if (paradigm === 'bernard') {
          analytical += 20;
          memory += 10;
        } else if (paradigm === 'dolores') {
          narrative += 15;
          adaptive += 10;
        } else if (paradigm === 'maeve') {
          adaptive += 20;
          analytical += 10;
        } else if (paradigm === 'teddy') {
          narrative += 10;
          memory += 15;
        }
        
        // Adjust based on phase
        if (phase === 'discovery') {
          analytical += 10;
        } else if (phase === 'exploration') {
          adaptive += 15;
        } else if (phase === 'synthesis') {
          memory += 20;
          analytical += 5;
        } else if (phase === 'validation') {
          analytical += 15;
          memory += 10;
        }
        
        setRealTimeContextDensities({
          narrative: Math.min(narrative, 100),
          analytical: Math.min(analytical, 100),
          memory: Math.min(memory, 100),
          adaptive: Math.min(adaptive, 100)
        });
      }


      // Progress phase if needed
      progressPhase()

    } catch (err) {
      handleError(err as Error)
    } finally {
      setIsLoading(false)
      setProgress(0)
      setCurrentLayer(null)
      // Keep context densities to show final results
    }
  }, [isLoading, currentModel, currentPhase, researchAgent, clearError, handleError, graphManager, setResearch, progressPhase])

  const handleClear = useCallback(() => {
    setResearch([])
    setParadigm(null)
    setParadigmProbabilities(null)
    functionCallingService.resetToolState()
    setFunctionHistory([])
  }, [setResearch, functionCallingService])

  const handleToggleGraph = useCallback(() => {
    setShowGraph(prev => !prev)
  }, [])

  const handleEnhancedModeChange = useCallback((enabled: boolean) => {
    setEnhancedMode(enabled)
  }, [])

  const handleSemanticSearch = useCallback(async (query: string): Promise<ResearchStep[]> => {
    try {
      setIsSearching(true)
      // Get a session ID from first research step or generate one
      const sessionId = research.length > 0 ? research[0].id : undefined
      const results = await databaseService.semanticSearch(query, sessionId)
      return results
    } catch (error) {
      console.error('Semantic search error:', error)
      return []
    } finally {
      setIsSearching(false)
    }
  }, [databaseService, research])

  const handleSelectSearchResult = useCallback((step: ResearchStep) => {
    // Add the selected result to the current research
    setResearch(prev => [...prev, { ...step, id: crypto.randomUUID() }])
    setShowSemanticSearch(false)
  }, [setResearch])

  const handleLoadSession = useCallback((session: any) => {
    // Load session data into current state
    setResearch(session.steps)
    setParadigm(session.paradigm || null)
    setParadigmProbabilities(session.paradigmProbabilities || null)
    setCurrentPhase(session.phase || 'discovery')
    setShowSessionHistory(false)
  }, [setResearch])

  const handleSaveCurrentSession = useCallback(async () => {
    if (research.length === 0) return;

    const session = {
      id: crypto.randomUUID(),
      query: typeof research[0]?.content === 'string' 
        ? research[0].content 
        : research[0]?.title || 'Untitled Session',
      timestamp: Date.now(),
      steps: research,
      completed: !isLoading,
      duration: undefined, // Could track this if needed
      model: currentModel,
      effort: effort
    };

    await addSession(session);
  }, [research, isLoading, currentModel, effort, addSession])

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

  // State for real context densities from research
  const [realTimeContextDensities, setRealTimeContextDensities] = useState<{
    narrative: number;
    analytical: number;
    memory: number;
    adaptive: number;
  } | null>(null)

  // Calculate context densities - use real data when available, fallback to progress-based
  const contextDensities = useMemo(() => {
    if (!isLoading) return null
    
    if (realTimeContextDensities) {
      return realTimeContextDensities
    }
    
    // Fallback to progress-based estimation during initial loading
    const base = progress / 100
    return {
      narrative: Math.floor(base * 25 + 15),
      analytical: Math.floor(base * 35 + 20),
      memory: Math.floor(base * 20 + 10),
      adaptive: Math.floor(base * 20 + 10)
    }
  }, [isLoading, progress, realTimeContextDensities])

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
                phase={currentPhase}
                paradigm={paradigm || undefined}
                showHostColors={enhancedMode}
                showLabels={true}
              />
            </div>
          )}

          <div className="research-container flex flex-col">
            <ResearchArea steps={research} />
            
            {/* Live Function Call Indicator */}
            {enhancedMode && liveFunctionCalls.length > 0 && (
              <LiveFunctionCallIndicator calls={liveFunctionCalls} />
            )}
            
            {/* Function Call History */}
            {enhancedMode && functionHistory.length > 0 && (
              <div className="mt-4">
                <FunctionCallVisualizer history={functionHistory} />
              </div>
            )}

            {/* Semantic Search */}
            {enhancedMode && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Semantic Search</h3>
                  <button
                    onClick={() => setShowSemanticSearch(!showSemanticSearch)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showSemanticSearch ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showSemanticSearch && (
                  <SemanticSearch
                    onSearch={handleSemanticSearch}
                    isSearching={isSearching}
                    onSelectResult={handleSelectSearchResult}
                  />
                )}
              </div>
            )}

            {/* Session Management */}
            {enhancedMode && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Session Management</h3>
                  <span className="text-xs text-gray-500">{sessions.length} saved sessions</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSessionHistory(true)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse History
                  </button>
                  <button
                    onClick={handleSaveCurrentSession}
                    disabled={research.length === 0}
                    className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Session
                  </button>
                </div>
              </div>
            )}
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
            currentParadigm={paradigm || undefined}
            paradigmProbabilities={paradigmProbabilities || undefined}
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
            currentLayer={currentLayer || undefined}
            paradigm={paradigm}
          />
        </div>
      )}

      {/* Session History Browser */}
      <SessionHistoryBrowser
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
        onClose={() => setShowSessionHistory(false)}
        isVisible={showSessionHistory}
      />
    </div>
  )
}

export default App
