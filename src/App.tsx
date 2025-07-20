import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ResearchAgentService } from '@/services/researchAgentServiceWrapper'
import { FunctionCallingService } from '@/services/functionCallingService'
import { DatabaseService } from '@/services/databaseService'
import { ResearchGraphManager } from '@/researchGraph'
import { Header, Controls, InputBar, ResearchArea, ResearchGraphView, ErrorDisplay, ParadigmIndicator, ContextDensityBar, FunctionCallDock, SemanticSearch, SessionHistoryBrowser, ParadigmDashboard, ContextLayerProgress } from '@/components'
import { ProgressMeter } from '@/components/atoms'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useFunctionCalls } from '@/components/FunctionCallDock'
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
import { DEFAULT_MODEL, TIMEOUTS } from '@/constants'
import { useTimeoutManager, TimeoutManager } from '@/utils/timeoutManager'
import '@/App.css'

interface ResearchSession {
  id: string;
  query: string;
  timestamp: number;
  steps: ResearchStep[];
  graphData?: string;
  completed: boolean;
  duration?: number;
  model?: string;
  effort?: string;
  paradigm?: HostParadigm | null;
  paradigmProbabilities?: ParadigmProbabilities | null;
  phase?: ResearchPhase;
}

const App: React.FC = () => {
  const [research, setResearch] = usePersistentState<ResearchStep[]>('reveries_research', [], { version: 1 })
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

  // Progress state machine
  const [progressState, setProgressState] = useState<'idle' | 'analyzing' | 'routing' | 'researching' | 'evaluating' | 'synthesizing' | 'complete'>('idle')
  const { error, handleError, clearError } = useErrorHandling()

  const graphManager = useMemo(() => new ResearchGraphManager(), [])
  const researchAgent = useMemo(() => ResearchAgentService.getInstance(), [])
  const functionCallingService = useMemo(() => FunctionCallingService.getInstance(), [])
  const databaseService = useMemo(() => DatabaseService.getInstance(), [])
  const [functionHistory, setFunctionHistory] = useState<FunctionCallHistory[]>([])
  const [showSemanticSearch, setShowSemanticSearch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSessionHistory, setShowSessionHistory] = useState(false)

  // --- Function call context helpers --------------------------------------
  const {
    addLiveCall,
    updateLiveCall,
    addToolUsed,
    addToHistory,
    liveCalls
  } = useFunctionCalls();

  // Map tool-name -> context live-call id so we can mark completion
  const liveCallIdMap = useRef<Record<string, string>>({});

  // Timeout manager for centralized cleanup
  const timeoutManager = useTimeoutManager();

  // Progress timeout manager with stable identity across renders
  const progressTimeoutMgrRef = useRef<TimeoutManager>(new TimeoutManager());
  const progressTimeoutMgr   = progressTimeoutMgrRef.current;

  // Ensure all progress-related timers are cleared when the component unmounts
  useEffect(() => {
    return () => {
      progressTimeoutMgr.clearAll();
    };
  }, []);

  // Progress ref to track current value (fixes race condition)
  const currentProgressRef = useRef<number>(0);

  // Track which phase cards have been created to prevent duplicates
  const createdPhaseCardsRef = useRef<Set<string>>(new Set());

  // Progress state machine helper
  const updateProgressState = useCallback((phase: typeof progressState, message?: string) => {
    const progressMap = {
      'idle': 0,
      'analyzing': 15,
      'routing': 25,
      'researching': 40,
      'evaluating': 60,
      'synthesizing': 80,
      'complete': 100
    };

    const stepTypeMap = {
      'analyzing': ResearchStepType.GENERATING_QUERIES,
      'routing': ResearchStepType.GENERATING_QUERIES,
      'researching': ResearchStepType.WEB_RESEARCH,
      'evaluating': ResearchStepType.REFLECTION,
      'synthesizing': ResearchStepType.SEARCHING_FINAL_ANSWER
    };

    const titleMap = {
      'analyzing': 'Analyzing Query',
      'routing': 'Selecting Research Strategy',
      'researching': 'Conducting Web Research',
      'evaluating': 'Evaluating Research Quality',
      'synthesizing': 'Synthesizing Final Answer'
    };

    const toolMap = {
      'analyzing': ['query_analysis', 'paradigm_classification'],
      'routing': ['paradigm_routing', 'strategy_selection'],
      'researching': ['web_search', 'google_search', 'bing_search', 'academic_search'],
      'evaluating': ['quality_evaluation', 'fact_verification', 'source_validation'],
      'synthesizing': ['synthesis_engine', 'content_compression', 'narrative_generation']
    };

    setProgressState(phase);
    const newProgress = progressMap[phase];
    setProgress(newProgress);
    currentProgressRef.current = newProgress;

    // Complete previous spinning steps
    if (phase !== 'idle') {
      setResearch(prev => prev.map(step =>
        step.isSpinning ? { ...step, isSpinning: false } : step
      ));
    }

    // Skip creating cards for research phase - these are redundant with FunctionCallDock
    // Only create cards for meaningful phases with actual content
    const skipPhases = ['researching', 'routing'];
    const shouldCreateCard = phase !== 'idle' &&
                           phase !== 'complete' &&
                           stepTypeMap[phase] &&
                           !skipPhases.includes(phase) &&
                           !createdPhaseCardsRef.current.has(phase);

    if (shouldCreateCard) {
      createdPhaseCardsRef.current.add(phase);

      const newStep: ResearchStep = {
        id: crypto.randomUUID(),
        title: titleMap[phase],
        icon: () => null,
        content: message || `Starting ${phase} phase...`,
        timestamp: new Date().toISOString(),
        type: stepTypeMap[phase],
        sources: [],
        isSpinning: true,
        toolsUsed: [],
        recommendedTools: toolMap[phase] || []
      };
      setResearch(prev => [...(Array.isArray(prev) ? prev : []), newStep]);

      // Keep research graph in sync
      graphManager.addNode(newStep);
    }

    // Reset phase tracking on completion
    if (phase === 'complete') {
      createdPhaseCardsRef.current.clear();
    }
  }, [setResearch, graphManager]);

  // Research sessions management
  const [sessions, setSessions] = usePersistentState<ResearchSession[]>('research_sessions', [], { version: 1 })

  const addSession = useCallback((session: ResearchSession) => {
    setSessions(prev => [...prev, session].slice(-10)); // Keep last 10 sessions
  }, [setSessions]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [setSessions]);

  // Update function history when research changes
  useEffect(() => {
    const history = functionCallingService.getExecutionHistory();
    setFunctionHistory(history);

    // Push any new records into the shared context so they appear in the dock.
    history.forEach((call) => addToHistory(call));
  }, [research, functionCallingService]);

  const advancePhase = useCallback(() => {
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
    currentProgressRef.current = 0;
    setProgressState('idle')
    setCurrentLayer(null)
    setRealTimeContextDensities(null)
    clearError()

    // Progress timeout protection helper - starts initial timeout
    const startProgressTimeout = (phase: string, timeoutMs: number) => {
      progressTimeoutMgr.start(phase, timeoutMs, (attempt) => {
        console.warn(`Progress timeout in ${phase} phase, advancing (attempt ${attempt})`);

        // Use ref to get current progress value (fixes race condition)
        const currentProgress = currentProgressRef.current;

        // Force advance to next phase based on current progress
        if (currentProgress < 25) updateProgressState('routing', `Timeout in ${phase}, continuing...`);
        else if (currentProgress < 40) updateProgressState('researching', `Timeout in ${phase}, continuing...`);
        else if (currentProgress < 60) updateProgressState('evaluating', `Timeout in ${phase}, continuing...`);
        else if (currentProgress < 80) updateProgressState('synthesizing', `Timeout in ${phase}, continuing...`);
        else updateProgressState('complete');
      });
    };

    // Helper to get adaptive timeout value for current phase based on model
    const getPhaseTimeoutMs = () => {
      const isO3Model = currentModel.includes('o3') || currentModel.includes('azure-o3');
      const multiplier = isO3Model ? 4 : 1; // 4x longer timeouts for O3 models

      switch (progressState) {
        case 'analyzing': return TIMEOUTS.PROGRESS_ANALYSIS * multiplier;
        case 'routing': return TIMEOUTS.PROGRESS_ROUTING * multiplier;
        case 'researching': return TIMEOUTS.PROGRESS_RESEARCH * multiplier;
        case 'evaluating': return TIMEOUTS.PROGRESS_EVALUATION * multiplier;
        case 'synthesizing': return TIMEOUTS.PROGRESS_SYNTHESIS * multiplier;
        default: return TIMEOUTS.PROGRESS_RESEARCH * multiplier;
      }
    };

    // Extended global research timeout to accommodate O3 models
    const isO3Model = currentModel.includes('o3') || currentModel.includes('azure-o3');
    const globalTimeout = isO3Model ? TIMEOUTS.GLOBAL_RESEARCH * 3 : TIMEOUTS.GLOBAL_RESEARCH; // 30min for O3, 10min for others

    timeoutManager.set('global-research', () => {
      if (isLoading) {
        console.warn(`Global research timeout reached (${globalTimeout/60000}min)`);
        updateProgressState('complete');
        setIsLoading(false);
      }
    }, globalTimeout);

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

      setResearch(prev => [...(Array.isArray(prev) ? prev : []), initialStep])

      // Add to graph
      graphManager.addNode(initialStep)

      // Process with enhanced research agent using processQuery
      const result = await researchAgent.processQuery(
        input,
        currentModel,
        {
          phase: currentPhase,
          onProgress: (message: string) => {
          console.log('🔄 Research Progress:', message);

          // Handle tool usage tracking
          if (message.startsWith('tool_used:')) {
            // Completion message pattern: tool_used:completed:<toolName>:<startTime>
            if (message.startsWith('tool_used:completed:')) {
              const [, , completedToolName] = message.split(':');

              // Update shared context
              const liveId = liveCallIdMap.current[completedToolName];
              if (liveId) {
                updateLiveCall(liveId, { status: 'completed', endTime: Date.now() });
              }
              return;
            }

            // New tool used message pattern: tool_used:<toolName>
            const [, toolName] = message.split(':');

            // Add to shared context with description
            const ctxId = addLiveCall({
              name: toolName,
              status: 'running',
              startTime: Date.now(),
              context: `Processing ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`
            });
            liveCallIdMap.current[toolName] = ctxId;

            // Track tool usage for tools view
            addToolUsed(toolName);

            // Fallback completion timeout for operations without explicit completion signal
            timeoutManager.set(`tool-fallback-${toolName}`, () => {
              // Context update
              const id = liveCallIdMap.current[toolName];
              if (id) {
                updateLiveCall(id, { status: 'completed', endTime: Date.now() });
              }
            }, TIMEOUTS.TOOL_FALLBACK);

            // Also propagate to current spinning step's toolsUsed
            setResearch((prev) =>
              prev.map((step) => {
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

          // Structured progress state machine based on message patterns with adaptive timeouts
          const isO3Model = currentModel.includes('o3') || currentModel.includes('azure-o3');
          const multiplier = isO3Model ? 4 : 1; // 4x longer timeouts for O3 models

          if (message.includes('Query classified as:')) {
            updateProgressState('analyzing', message);
            startProgressTimeout('analyzing', TIMEOUTS.PROGRESS_ANALYSIS * multiplier);
          } else if (message.includes('Routing to') && message.includes('paradigm')) {
            updateProgressState('routing', message);
            startProgressTimeout('routing', TIMEOUTS.PROGRESS_ROUTING * multiplier);
          } else if (message.includes('search queries') || message.includes('Comprehensive research')) {
            updateProgressState('researching', message);
            startProgressTimeout('researching', TIMEOUTS.PROGRESS_RESEARCH * multiplier);
          } else if (message.includes('quality') || message.includes('evaluating') || message.includes('self-healing') ||
                     message.includes('evaluation') || message.includes('Research evaluation') ||
                     message.includes('completed, evaluating') || message.includes('enhance research quality')) {
            updateProgressState('evaluating', message);
            startProgressTimeout('evaluating', TIMEOUTS.PROGRESS_EVALUATION * multiplier);
          } else if (message.includes('Finalizing') || message.includes('synthesis') || message.includes('comprehensive answer')) {
            updateProgressState('synthesizing', message);
            setCurrentLayer('compress');
            startProgressTimeout('synthesizing', TIMEOUTS.PROGRESS_SYNTHESIS * multiplier);
          } else if (message.includes('O3 model') && message.includes('processing')) {
            // Special handling for O3 background task progress
            console.log(`O3 reasoning in progress: ${message}`);
            // Reset timeout to give O3 more time
            progressTimeoutMgr.reset(TIMEOUTS.PROGRESS_RESEARCH * 8, (attempt) =>
              console.warn(`O3 extended timeout, advancing (attempt ${attempt})`)
            );
          } else {
            // Reset timeout on any other progress message to prevent premature timeout
            progressTimeoutMgr.reset(getPhaseTimeoutMs(), (attempt) =>
              console.warn(`Progress timeout, advancing (attempt ${attempt})`)
            );
          }

          // Update any existing steps with more detailed content
          if (message.includes('[Dolores]') || message.includes('[Teddy]') || message.includes('[Bernard]') ||
              message.includes('[Maeve]') || message.includes('evaluation') || message.includes('quality')) {
            setResearch(prev => {
              const hasReflectionStep = prev.some(step =>
                step.isSpinning && (step.type === ResearchStepType.REFLECTION || step.type === ResearchStepType.GENERATING_QUERIES)
              );

              if (hasReflectionStep) {
                // Update existing reflection/evaluation step
                return prev.map(step => {
                  if (step.isSpinning && (step.type === ResearchStepType.REFLECTION || step.type === ResearchStepType.GENERATING_QUERIES)) {
                    return { ...step, content: step.content + '\n\n' + message };
                  }
                  return step;
                });
              } else if (message.includes('[') && message.includes(']')) {
                // Only create a new reflection step if we have actual host content
                const newStep: ResearchStep = {
                  id: crypto.randomUUID(),
                  title: 'Research Evaluation',
                  icon: () => null,
                  content: message,
                  timestamp: new Date().toISOString(),
                  type: ResearchStepType.REFLECTION,
                  sources: [],
                  isSpinning: true,
                  toolsUsed: []
                };
                return [...prev, newStep];
              }
              return prev;
            });
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
        }
      )

      updateProgressState('complete')

      // Create final answer step
      const finalAnswerStep: ResearchStep = {
        id: crypto.randomUUID(),
        title: 'Research Complete',
        icon: () => null,
        content: 'synthesis' in result ? String(result.synthesis) : String((result as { text: string }).text),
        timestamp: new Date().toISOString(),
        type: ResearchStepType.FINAL_ANSWER,
        sources: result.sources || []
      }

      // Stop any remaining spinning indicators (handled by updateProgressState, but ensure cleanup)
      setResearch(prev =>
        prev.map(step => ({ ...step, isSpinning: false }))
      )

      // Add final answer step
      setResearch(prev => [...(Array.isArray(prev) ? prev : []), finalAnswerStep])

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
      advancePhase()

    } catch (err) {
      handleError(err as Error)
      // On error, show partial progress but don't complete
      setProgress(prev => prev > 0 ? prev : 10)
    } finally {
      // Clean up all research-related timeouts
      timeoutManager.clear('global-research');
      timeoutManager.clear('progress-analyzing');
      timeoutManager.clear('progress-routing');
      timeoutManager.clear('progress-researching');
      timeoutManager.clear('progress-evaluating');
      timeoutManager.clear('progress-synthesizing');
      progressTimeoutMgr.clearTimer();

      setIsLoading(false)
      // Complete progress before reset for visual feedback
      timeoutManager.set('progress-reset', () => {
        setProgress(0);
        currentProgressRef.current = 0;
      }, TIMEOUTS.PROGRESS_RESET);
      setCurrentLayer(null)
      // Keep context densities to show final results
    }
  }, [isLoading, currentModel, currentPhase, researchAgent, clearError, handleError, graphManager, setResearch, advancePhase, updateProgressState, progress])

  const handleClear = useCallback(() => {
    setResearch([]);
    setParadigm(null);
    setParadigmProbabilities(null);
    graphManager.reset();
    functionCallingService.resetToolState();
    setFunctionHistory([]);
  }, [setResearch, functionCallingService, graphManager]);

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
    setResearch(prev => [...(Array.isArray(prev) ? prev : []), { ...step, id: crypto.randomUUID() }])
    setShowSemanticSearch(false)
  }, [setResearch])

  const handleLoadSession = useCallback((session: ResearchSession) => {
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
  }, [progress, realTimeContextDensities, isLoading])

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
                confidence={paradigmProbabilities ? Math.max(...Object.values(paradigmProbabilities)) : 0}
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

            {/* Function Call Dock - shows both live and history */}
            {enhancedMode && (liveCalls.length > 0 || functionHistory.length > 0) && (
              <div className="mt-4">
                <FunctionCallDock
                  mode={liveCalls.length > 0 ? 'live' : 'history'}
                  showModeSelector={true}
                />
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

        {/* Global progress bar – positioned above input bar with proper spacing */}
        {isLoading && (
          <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
            <ProgressMeter
              value={progress}
              label="Research Progress"
              variant="gradient"
              showLoadingDots={true}
              showSegments={true}
              showShimmer={true}
              animate={true}
              onError={(error) => console.error('ProgressMeter error:', error)}
            />
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
