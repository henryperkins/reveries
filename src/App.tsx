import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { FunctionCallingService } from '@/services/functionCallingService'
import { DatabaseService } from '@/services'
import { ResearchGraphManager } from '@/researchGraph'
import { TopNavigation } from '@/components/TopNavigation'
import { ReverieHeader } from '@/components/ReverieHeader'
import { ResearchView } from '@/components/ResearchView'
import { SessionsView } from '@/components/SessionsView'
import { AnalyticsView } from '@/components/AnalyticsView'
import { EnhancedInputBar, ErrorDisplay, ContextDensityBar, FunctionCallDock, SemanticSearch, SessionHistoryBrowser, ParadigmDashboard, ContextLayerProgress, Controls, ParadigmIndicator, InterHostCollaboration } from '@/components'
import type { InputBarRef } from '@/components/EnhancedInputBar'
import ResearchGraphView from '@/components/ResearchGraphView';
import { ProgressMeter } from '@/components/atoms'
import { usePersistentState, ResearchSession, useProgressManager } from '@/hooks'
import { useFunctionCalls } from '@/components/FunctionCallDock'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import { ThemeToggle } from '@/theme';

import {
    ResearchStep,
    ResearchStepType,
    EffortType,
    HostParadigm,
    ParadigmProbabilities,
    ContextLayer,
    ResearchPhase,
    ModelType,
    FunctionCallHistory,
} from '@/types'
import { exportToMarkdown, downloadFile } from '@/utils/exportUtils'
import { DEFAULT_MODEL } from '@/constants'
import { useTimeoutManager } from '@/utils/timeoutManager'
import { ProgressState } from '@/hooks/useProgressManager'

const App: React.FC = () => {
    // ThemeProvider handles theme application

    const [research, setResearch] = usePersistentState<ResearchStep[]>('reveries_research', [], { version: 1 })
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)

    const [currentModel, setCurrentModel] = useState<ModelType>(DEFAULT_MODEL)
    const [showGraph, setShowGraph] = useState(false)
    const [enhancedMode, setEnhancedMode] = useState(true)
    const [effort, setEffort] = useState<EffortType>(EffortType.MEDIUM)
    const [paradigm, setParadigm] = useState<HostParadigm | null>(null)
    const [paradigmProbabilities, setParadigmProbabilities] = useState<ParadigmProbabilities | null>(null)
    const [contextLayers] = useState<ContextLayer[]>([])
    const [currentLayer] = useState<ContextLayer | null>(null)
    const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('discovery')
    const [blendedParadigms, setBlendedParadigms] = useState<HostParadigm[]>([])
    const [activeCollaborations, setActiveCollaborations] = useState<{
        id: string;
        fromHost: HostParadigm;
        toHost: HostParadigm;
        reason: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
    }[]>([])
    const [activeTab, setActiveTab] = useState('research')

    // Progress state machine
    const [progressState, setProgressState] = useState<ProgressState>('idle')
    const { error, handleError, clearError } = useErrorHandling()

    const graphManager = React.useRef(new ResearchGraphManager()).current
    // Track the last node ID for parent-child relationships
    const lastNodeIdRef = useRef<string | null>(null)

    // Singleton services - already instances, no wrapper needed
    const functionCallingService = FunctionCallingService.getInstance();
    const databaseService = DatabaseService.getInstance();

    const [functionHistory, setFunctionHistory] = useState<FunctionCallHistory[]>([])
    const [showSemanticSearch, setShowSemanticSearch] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [showSessionHistory, setShowSessionHistory] = useState(false)

    // --- Function call context helpers --------------------------------------
    const {
        addToHistory,
        liveCalls
    } = useFunctionCalls();

    // Timeout manager for centralized cleanup
    const timeoutManager = useTimeoutManager();

    // Track which phase cards have been created to prevent duplicates
    const createdPhaseCardsRef = useRef<Set<string>>(new Set());

    // Track active operations to prevent duplicate card creation
    const activeOperationsRef = useRef<Set<string>>(new Set());

    // Initialize progress manager with configuration
    const progressManager = useProgressManager({
        onProgressUpdate: (phase: ProgressState, _message?: string) => {
            setProgressState(phase);

            // Update progress percentage
            const progressMap = {
                'idle': 0,
                'analyzing': 15,
                'routing': 25,
                'researching': 40,
                'evaluating': 60,
                'synthesizing': 80,
                'complete': 100
            };
            setProgress(progressMap[phase]);

            // Complete previous spinning steps
            if (phase !== 'idle') {
                setResearch(prev => prev.map(step =>
                    step.isSpinning ? { ...step, isSpinning: false } : step
                ));
            }

            // Reset phase tracking on completion
            if (phase === 'complete') {
                createdPhaseCardsRef.current.clear();
                activeOperationsRef.current.clear();
            }
        },
        onStepUpdate: (newStep: ResearchStep) => {
            // Skip creating cards for phases that show tool operations
            const skipPhases = ['researching', 'routing', 'analyzing'];
            const shouldCreateCard = !skipPhases.includes(progressState) &&
                !createdPhaseCardsRef.current.has(progressState);

            if (shouldCreateCard) {
                try {
                    createdPhaseCardsRef.current.add(progressState);
                    setResearch(prev => [...(Array.isArray(prev) ? prev : []), newStep]);

                    // Keep research graph in sync with parent-child relationships
                    graphManager.addNode(newStep, lastNodeIdRef.current || null);
                    lastNodeIdRef.current = newStep.id;
                } catch (error) {
                    console.error(`Error creating ${progressState} phase card:`, error);
                    // Remove from created phases on error
                    createdPhaseCardsRef.current.delete(progressState);
                }
            }
        },
        isO3Model: currentModel.includes('o3') || currentModel.includes('azure-o3')
    });

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
        const newCalls = history.slice(functionHistory.length);
        if (newCalls.length) {
            setFunctionHistory(history);
            newCalls.forEach(addToHistory);
        }
    }, [research, functionHistory.length, functionCallingService, addToHistory]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutManager.clearAll();   // implement if missing
            progressManager.clearAllTimeouts();
        };
    }, [progressManager, timeoutManager]);


    // Add ref for input bar
    const inputBarRef = useRef<InputBarRef>(null)

    // State for real context densities from research
    const [realTimeContextDensities] = useState<{
        narrative: number;
        analytical: number;
        memory: number;
        adaptive: number;
    } | null>(null)

    // Add state for input value
    const [inputValue, setInputValue] = useState('')

    // Add validation rules for research questions
    const validationRules = useMemo(() => [
        {
            type: 'required' as const,
            message: 'Please enter a research question'
        },
        {
            type: 'minLength' as const,
            value: 5,
            message: 'Research question should be at least 5 characters'
        },
        {
            type: 'custom' as const,
            message: 'Research question should end with a question mark',
            validator: (value: string) => value.trim().endsWith('?') || value.trim().length < 10
        }
    ], [])

    // Add dynamic placeholder hints based on paradigm
    const dynamicPlaceholderHints = useMemo(() => {
        const baseHints = [
            'What are the latest developments in quantum computing?',
            'How does climate change affect global food security?',
            'What is the future of artificial intelligence in healthcare?'
        ]

        if (paradigm === 'dolores') {
            return [
                'What is the nature of consciousness?',
                'How do we define free will?',
                'What makes us human?'
            ]
        } else if (paradigm === 'maeve') {
            return [
                'How can we fight systemic injustice?',
                'What drives revolutionary change?',
                'How do power structures maintain control?'
            ]
        }

        return baseHints
    }, [paradigm])

    // Handle input submission
    const handleInputSubmit = useCallback(async (value: string) => {
        if (isLoading) return

        try {
            setIsLoading(true)
            clearError()

            // Clear input immediately for better UX
            inputBarRef.current?.clear()

            // Start the research process
            progressManager.updateProgressState('analyzing', `Analyzing: "${value}"`)

            // Create initial research step
            const initialStep: ResearchStep = {
                id: Date.now().toString(),
                type: ResearchStepType.GENERATING_QUERIES,
                title: 'Processing Query',
                content: `Processing query: "${value}"`,
                icon: () => null,
                timestamp: new Date().toISOString(),
                metadata: {
                    model: currentModel,
                    effort,
                    hostParadigm: paradigm || undefined
                }
            }

            setResearch(prev => [...prev, initialStep])

            // Add to graph
            const node = graphManager.addNode({
                ...initialStep,
                parentId: lastNodeIdRef.current || undefined
            })
            lastNodeIdRef.current = node.id

            // Continue with existing research logic...
            // (The rest of the research flow would continue here)

        } catch (error) {
            handleError(error as Error)
        } finally {
            setIsLoading(false)
            progressManager.updateProgressState('idle')
        }
    }, [isLoading, clearError, progressManager, currentModel, effort, paradigm, setResearch, graphManager, handleError])

    const handleClear = useCallback(() => {
        setResearch([]);
        setParadigm(null);
        setParadigmProbabilities(null);
        setBlendedParadigms([]);
        setActiveCollaborations([]);
        graphManager.reset();
        functionCallingService.resetToolState();
        setFunctionHistory([]);
        lastNodeIdRef.current = null; // Reset node tracking
    }, [setResearch, functionCallingService, graphManager]);

    const handleToggleGraph = useCallback(() => {
        console.log('Toggling graph. Current nodes:', graphManager.getNodes().length);
        console.log('Graph nodes:', graphManager.getNodes());
        setShowGraph(prev => !prev);
    }, [graphManager]);

    const handleEnhancedModeChange = useCallback((enabled: boolean) => {
        setEnhancedMode(enabled);
    }, []);

    const handleSemanticSearch = useCallback(async (query: string): Promise<ResearchStep[]> => {
        try {
            setIsSearching(true);
            // Get a session ID from first research step or generate one
            const sessionId = research.length > 0 ? research[0].id : undefined;
            const results = await databaseService.semanticSearch(query, sessionId);
            return results;
        } catch (error) {
            console.error('Semantic search error:', error);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, [databaseService, research]);

    const handleSelectSearchResult = useCallback((step: ResearchStep) => {
        // Add the selected result to the current research
        setResearch(prev => [...(Array.isArray(prev) ? prev : []), { ...step, id: crypto.randomUUID() }]);
        setShowSemanticSearch(false);
    }, [setResearch]);

    const handleLoadSession = useCallback((session: ResearchSession) => {
        // Load session data into current state
        setResearch(Array.isArray(session.steps) ? session.steps : []);
        setParadigm(session.paradigm || null);
        setParadigmProbabilities(session.paradigmProbabilities || null);
        setCurrentPhase(session.phase || 'discovery');
        setShowSessionHistory(false);
    }, [setResearch]);

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
    }, [research, isLoading, currentModel, effort, addSession]);

    const handleExport = useCallback(async () => {
        try {
            const query = research[0]?.content || 'Research Export';
            const markdown = await exportToMarkdown(query as string, research, {
                model: currentModel,
                effort: enhancedMode ? 'enhanced' : 'standard',
                timestamp: new Date().toLocaleString(),
                duration: graphManager.getStatistics().totalDuration
            });
            const timestamp = new Date().toISOString().split('T')[0];
            downloadFile(markdown, `research-${timestamp}.md`, 'text/markdown');
        } catch (err) {
            handleError(err as Error);
        }
    }, [research, currentModel, enhancedMode, handleError, graphManager]);

    // Calculate context densities - use real data when available, fallback to progress-based
    const contextDensities = useMemo(() => {
        if (!isLoading) return null;

        if (realTimeContextDensities) {
            return realTimeContextDensities;
        }

        // Fallback to progress-based estimation during initial loading
        const base = progress / 100;
        return {
            narrative: Math.floor(base * 25 + 15),
            analytical: Math.floor(base * 35 + 20),
            memory: Math.floor(base * 20 + 10),
            adaptive: Math.floor(base * 20 + 10)
        };
    }, [progress, realTimeContextDensities, isLoading]);

    return (
        <div className="min-h-screen bg-westworld-cream dark:bg-westworld-nearBlack text-westworld-nearBlack dark:text-westworld-cream transition-colors duration-300">
            {/* Theme toggle button - positioned according to responsive design patterns */}
            <div className="fixed top-4 right-4 z-modal safe-padding-top safe-padding-right">
                <ThemeToggle />
            </div>

            <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-6">
                    <ReverieHeader />
                </div>

                {activeTab === 'research' && (
                    <>
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
                        {/* Show paradigm UI when detected */}
                        {paradigm && paradigmProbabilities && !isLoading && (
                            <div className="animate-fade-in mb-6">
                                <ParadigmIndicator
                                    paradigm={paradigm}
                                    probabilities={paradigmProbabilities}
                                    confidence={paradigmProbabilities ? Math.max(...Object.values(paradigmProbabilities)) : 0}
                                    blendedParadigms={blendedParadigms}
                                />
                            </div>
                        )}

                        {/* Show active collaborations */}
                        {activeCollaborations.length > 0 && (
                            <div className="animate-slide-up mb-4 space-y-2">
                                <h3 className="text-sm font-medium text-theme-secondary mb-2">Inter-Host Collaborations</h3>
                                {activeCollaborations.map(collab => (
                                    <InterHostCollaboration
                                        key={collab.id}
                                        fromHost={collab.fromHost}
                                        toHost={collab.toHost}
                                        reason={collab.reason}
                                        status={collab.status}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Show context density during processing */}
                        {isLoading && contextDensities && (
                            <div className="animate-slide-up mb-6">
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
                            <ResearchView
                                steps={Array.isArray(research) ? research : []}
                                activeModel={currentModel}
                                confidence={paradigmProbabilities ? Math.max(...Object.values(paradigmProbabilities)) : 0}
                                sourceCount={Array.isArray(research) ? research.flatMap(s => s.sources || []).length : 0}
                                paradigm={paradigm}
                                isLoading={isLoading}
                                progressState={progressState}
                            />

                            {enhancedMode && (liveCalls.length > 0 || functionHistory.length > 0) && (
                                <div className="mt-4">
                                    <FunctionCallDock
                                        mode={liveCalls.length > 0 ? 'live' : 'history'}
                                        showModeSelector
                                    />
                                </div>
                            )}

                            {/* Semantic Search */}
                            {enhancedMode && (
                                <div className="mt-4 p-4 bg-theme-primary rounded-lg shadow-theme">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-theme-primary">Semantic Search</h3>
                                        <button
                                            onClick={() => setShowSemanticSearch(!showSemanticSearch)}
                                            className="text-xs text-westworld-copper hover:text-westworld-darkCopper"
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
                                <div className="mt-4 p-4 bg-theme-primary rounded-lg shadow-theme">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-theme-primary">Session Management</h3>
                                        <span className="text-xs text-theme-secondary">{sessions.length} saved sessions</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowSessionHistory(true)}
                                            className="flex-1 btn btn-primary btn-sm"
                                        >
                                            Browse History
                                        </button>
                                        <button
                                            onClick={handleSaveCurrentSession}
                                            disabled={research.length === 0}
                                            className="flex-1 btn btn-secondary btn-sm"
                                        >
                                            Save Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'sessions' && (
                    <SessionsView
                        sessions={sessions}
                        onLoadSession={handleLoadSession}
                    />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsView />
                )}

                {activeTab === 'settings' && (
                    <div className="bg-theme-primary rounded-xl shadow-theme border border-theme-primary p-6 transition-colors duration-300">
                        <h3 className="text-xl font-semibold text-theme-primary mb-6">Settings</h3>
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-medium text-theme-primary mb-4">Appearance</h4>
                                <div className="flex items-center justify-between p-4 bg-theme-secondary rounded-lg">
                                    <span className="text-theme-secondary">Theme Mode</span>
                                    <ThemeToggle />
                                </div>
                            </div>
                            <div className="p-4 bg-theme-secondary rounded-lg">
                                <p className="text-theme-secondary">More settings coming soon...</p>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Global progress bar – positioned above input bar with proper spacing */}
            {isLoading && (
                <div className="progress-meter-container px-4">
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

            {/* Replace the existing InputBar with EnhancedInputBar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-theme-surface border-t border-theme-border safe-padding-bottom">
                <div className="container mx-auto px-4 py-4">
                    <EnhancedInputBar
                        ref={inputBarRef}
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleInputSubmit}
                        disabled={isLoading}
                        isLoading={isLoading}
                        placeholder="Enter your research question..."
                        maxLength={500}
                        minLength={5}
                        validationRules={validationRules}
                        dynamicPlaceholderHints={dynamicPlaceholderHints}
                        currentParadigm={paradigm ?? undefined}
                        paradigmProbabilities={paradigmProbabilities ?? undefined}
                        className="max-w-4xl mx-auto"
                        aria-label="Research question input"
                        testId="main-input-bar"
                    />

                    {/* Progress and context indicators */}
                    {isLoading && progressState !== 'idle' && (
                        <div className="mt-4 flex items-center justify-center gap-4 animate-fade-in">
                            <span className="text-sm text-theme-secondary">
                                {progressState.charAt(0).toUpperCase() + progressState.slice(1)}...
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Paradigm Dashboard */}
            {paradigmProbabilities && (
                <div className="paradigm-dashboard">
                    <ParadigmDashboard
                        paradigm={paradigm || 'bernard'}
                        probabilities={paradigmProbabilities}
                        layers={contextLayers}
                    />
                </div>
            )}

            {/* Context Layer Progress */}
            {isLoading && contextLayers.length > 0 && paradigm && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-notification">
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
    );
}

export default App;
