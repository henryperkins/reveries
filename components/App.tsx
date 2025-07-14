import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/solid';

import { ResearchAgentService } from '../services/researchAgentService';
import { APIError } from '../services/errorHandler';
import { ServiceCallConfig, ModelType, EffortType, ResearchStep, ResearchStepType, ResearchMetadata } from '../types';
import { FunctionCallVisualizer } from './FunctionCallVisualizer';
import { usePersistedState, useResearchSessions } from './hooks/usePersistedState';
import { ToolUsageIndicator } from './ToolUsageIndicator';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { RateLimiter } from '../services/rateLimiter';
import { exportToJSON, exportToMarkdown, exportToCSV, downloadFile } from '../utils/exportUtils';

const DEFAULT_MODEL: ModelType = 'gemini-2.5-flash';
const DEFAULT_EFFORT: EffortType = EffortType.MEDIUM;

const App: React.FC = () => {
    const [currentQuery, setCurrentQuery] = useState<string>('');
    const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, handleError, clearError] = useErrorHandling();
    const [showGraph, setShowGraph] = useState<boolean>(false);
    const [showFunctionCalls, setShowFunctionCalls] = useState<boolean>(false);
    const [lastFunctionCallHistory, setLastFunctionCallHistory] = useState<FunctionCallHistory[]>([]);
    const [rateLimitStats, setRateLimitStats] = useState<any>(null);

    const [selectedEffort, setSelectedEffort] = usePersistedState<EffortType>('effort', DEFAULT_EFFORT);
    const [selectedModel, setSelectedModel] = usePersistedState<ModelType>('model', DEFAULT_MODEL);

    const graphManagerRef = useRef<ResearchGraphManager>(new ResearchGraphManager());
    const { sessions, addSession, updateSession } = useResearchSessions();
    const currentSessionIdRef = useRef<string | null>(null);

    const researchAgentService = ResearchAgentService.getInstance();

    const addStep = useCallback((stepData: Omit<ResearchStep, 'id' | 'timestamp'>, metadata?: ResearchMetadata): string => {
        const newStepId = Date.now().toString() + Math.random().toString();
        const newStep: ResearchStep = {
            ...stepData,
            id: newStepId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setResearchSteps(prevSteps => [...prevSteps, newStep]);

        // Add to graph with metadata
        const parentId = graphManagerRef.current.getGraph().currentPath.slice(-1)[0];
        graphManagerRef.current.addNode(newStep, parentId, {
            ...metadata,
            model: selectedModel,
            effort: selectedEffort
        });

        return newStepId;
    }, [selectedModel, selectedEffort]);

    const updateStepContent = useCallback((
        stepId: string,
        newContent: string | React.ReactNode,
        newTitle?: string,
        newSources?: { name: string; url?: string }[],
        additionalMetadata?: Partial<ResearchMetadata>
    ) => {
        setResearchSteps(prevSteps => prevSteps.map(step =>
            step.id === stepId ? {
                ...step,
                title: newTitle || step.title,
                content: newContent,
                sources: newSources || step.sources,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isSpinning: false
            } : step
        ));

        // Update graph node with additional metadata
        const nodeId = `node-${stepId}`;
        const node = graphManagerRef.current.getGraph().nodes.get(nodeId);
        if (node) {
            node.metadata = {
                ...node.metadata,
                ...additionalMetadata,
                sourcesCount: newSources?.length || 0
            };
        }
    }, []);

    const markStepError = useCallback((stepId: string, errorMessage: string, title?: string) => {
        setResearchSteps(prevSteps => prevSteps.map(step =>
            step.id === stepId ? {
                ...step,
                title: title || "Error",
                content: errorMessage,
                icon: QuestionMarkCircleIcon,
                isSpinning: false,
                type: ResearchStepType.ERROR
            } : step
        ));

        // Mark error in graph
        graphManagerRef.current.markNodeError(`node-${stepId}`, errorMessage);
    }, []);

    const executeResearchWorkflow = useCallback(async (query: string) => {
        setIsLoading(true);
        clearError();
        setResearchSteps([]);

        // Reset graph for new research
        graphManagerRef.current.reset();

        // Create new session
        const sessionId = `session-${Date.now()}`;
        currentSessionIdRef.current = sessionId;
        addSession({
            id: sessionId,
            query,
            timestamp: Date.now(),
            steps: [],
            completed: false
        });

        addStep({
            type: ResearchStepType.USER_QUERY,
            title: "Guest's Query",
            content: query,
            icon: UserCircleIcon,
        });

        const serviceConfig: ServiceCallConfig = {
            selectedModel,
            selectedEffort,
            shouldUseSearchInFinalAnswer: query.toLowerCase().includes("latest") ||
                query.toLowerCase().includes("recent") ||
                query.toLowerCase().includes("current events") ||
                query.toLowerCase().includes("who won"),
        };

        let currentProcessingStepId: string | null = null;

        try {
            // Use enhanced router with function calling
            const result = await researchAgentService.routeResearchQuery(
                query,
                selectedModel,
                selectedEffort,
                (message) => {
                    // Update current step with progress message
                    if (currentProcessingStepId) {
                        updateStepContent(currentProcessingStepId, message);
                    }
                },
                true, // Enable function calling
                true  // Enable research tools
            );

            // Create final result step with all metadata
            const finalStepId = addStep({
                type: ResearchStepType.SYNTHESIS,
                title: "Research Complete",
                content: result.synthesis,
                sources: result.sources,
            }, {
                queryType: result.queryType,
                hostParadigm: result.hostParadigm,
                confidenceScore: result.confidenceScore,
                pyramidLayer: result.adaptiveMetadata?.pyramidLayer,
                contextDensity: result.adaptiveMetadata?.contextDensity,
                phase: result.adaptiveMetadata?.phase,
                processingTime: result.adaptiveMetadata?.processingTime,
                toolsUsed: result.toolsUsed,
                recommendedTools: result.adaptiveMetadata?.recommendedTools,
                functionCalls: result.functionCallHistory,
                evaluationMetadata: result.evaluationMetadata,
                sections: result.sections,
                searchQueries: result.queries
            });

            // Store function call history if available
            if (result.functionCallHistory) {
                setLastFunctionCallHistory(result.functionCallHistory);
                setShowFunctionCalls(true);
            }

            // After successful completion
            const exportData = graphManagerRef.current.getExportData(query, sessionId);
            updateSession(sessionId, {
                steps: researchSteps,
                graphData: graphManagerRef.current.serialize(),
                exportData,
                completed: true
            });

            // Get rate limit stats for display
            const stats = RateLimiter.getInstance().getUsageStats();
            setRateLimitStats(stats);

        } catch (e: any) {
            console.error("Error during research workflow execution:", e);
            let errorMessage = "An unexpected error occurred during the research process.";

            if (e instanceof APIError) {
                errorMessage = e.message;

                // Show retry option for retryable errors
                if (e.retryable) {
                    errorMessage += " Click 'Submit' to retry.";
                }
            }

            handleError(errorMessage);

            if (currentProcessingStepId) {
                markStepError(currentProcessingStepId, errorMessage, "Aberration in Loop");
            } else {
                addStep({
                    type: ResearchStepType.ERROR,
                    title: "Critical Aberration",
                    content: errorMessage,
                    icon: QuestionMarkCircleIcon
                });
            }

            // Update session with error state
            updateSession(sessionId, {
                steps: researchSteps,
                graphData: graphManagerRef.current.serialize(),
                completed: false
            });
        } finally {
            setIsLoading(false);
        }
    }, [addStep, updateStepContent, markStepError, selectedModel, selectedEffort, researchAgentService, addSession, updateSession, researchSteps, handleError, clearError]);

    const handleQuerySubmit = useCallback((query: string) => {
        // Ignore empty queries
        if (!query.trim()) return;

        // Add user query step
        const userQueryId = addStep({
            type: ResearchStepType.USER_QUERY,
            title: "Guest's Query",
            content: query,
            icon: UserCircleIcon,
        });

        executeResearchWorkflow(query);
    }, [addStep, executeResearchWorkflow]);

    // Add keyboard shortcut
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLoading) {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input && input.value.trim()) {
                    handleQuerySubmit(input.value);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isLoading, handleQuerySubmit]);

    const handleExport = useCallback((format: 'json' | 'markdown' | 'csv') => {
        const exportData = graphManagerRef.current.getExportData(
            currentQuery,
            currentSessionIdRef.current || undefined
        );

        let content: string;
        let filename: string;
        let mimeType: string;

        switch (format) {
            case 'json':
                content = exportToJSON(exportData);
                filename = `research-${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'markdown':
                content = exportToMarkdown(exportData);
                filename = `research-${Date.now()}.md`;
                mimeType = 'text/markdown';
                break;
            case 'csv':
                content = exportToCSV(exportData);
                filename = `research-${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
        }

        downloadFile(content, filename, mimeType);
    }, [currentQuery]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#1a1a2e] text-cyan-100 flex flex-col">
            <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-4">Reveries Research Assistant</h1>

                <div className="mb-4">
                    <textarea
                        value={currentQuery}
                        onChange={(e) => setCurrentQuery(e.target.value)}
                        className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                        placeholder="Ask me anything about Westworld..."
                    />
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => handleQuerySubmit(currentQuery)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 hover:bg-blue-700"
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8H4zm16 0a8 8 0 01-8 8v-8h8z"
                                    />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Submit'
                        )}
                    </button>
                </div>

                {error && (
                    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50 ${
                      error.type === 'error' ? 'bg-red-900' :
                      error.type === 'warning' ? 'bg-yellow-900' : 'bg-blue-900'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-white">{error.message}</p>
                          {error.action && (
                            <button
                              onClick={error.action.handler}
                              className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
                            >
                              {error.action.label}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={clearError}
                          className="ml-4 text-white/60 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                )}

                {/* Rate Limit Status (optional) */}
                {rateLimitStats && (
                    <div className="fixed bottom-4 right-4 bg-gray-900/80 p-3 rounded text-xs">
                      <div>Token capacity: {Math.round(rateLimitStats.tokenCapacityPercent)}%</div>
                      <div>Requests last minute: {rateLimitStats.requestsLastMinute}</div>
                    </div>
                )}

                {/* Add Graph Statistics */}
                {
                    researchSteps.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-700 rounded-lg" >
                            <h3 className="text-sm font-semibold text-slate-300 mb-2" > Research Statistics </h3>
                            < div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs" >
                                {(() => {
                                    const stats = graphManagerRef.current.getStatistics();
                                    return (
                                        <>
                                            <div>
                                                <span className="text-slate-400" > Total Steps: </span>
                                                < span className="text-slate-200 ml-1" > {stats.totalNodes} </span>
                                            </div>
                                            < div >
                                                <span className="text-slate-400" > Success Rate: </span>
                                                < span className="text-slate-200 ml-1" > {(stats.successRate * 100).toFixed(0)
                                                }% </span>
                                            </div>
                                            < div >
                                                <span className="text-slate-400" > Sources Found: </span>
                                                < span className="text-slate-200 ml-1" > {stats.sourcesCollected} </span>
                                            </div>
                                            < div >
                                                <span className="text-slate-400" > Duration: </span>
                                                < span className="text-slate-200 ml-1" > {(stats.totalDuration / 1000).toFixed(1)} s </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
        )}

                            {/* Add toggle for function calls */}
                            {lastFunctionCallHistory.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowFunctionCalls(!showFunctionCalls)}
                                        className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                                    >
                                        {showFunctionCalls ? 'Hide' : 'Show'} Function Calls
                                    </button>
                                </div>
                            )}

                            {/* Function call visualizer */}
                            {showFunctionCalls && lastFunctionCallHistory.length > 0 && (
                                <FunctionCallVisualizer history={lastFunctionCallHistory} />
                            )}

                            <div className="mt-4">
                                <h2 className="text-lg font-semibold mb-2">Research Steps</h2>
                                <div className="space-y-4">
                                    {researchSteps.map(step => (
                                        <div
                                            key={step.id}
                                            className={`p-4 rounded-lg shadow-md transition-all ${step.type === ResearchStepType.ERROR
                                                    ? 'bg-red-100 border-l-4 border-red-500'
                                                    : 'bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center mb-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full mr-2 ${step.type === ResearchStepType.ERROR
                                                            ? 'bg-red-500'
                                                            : 'bg-blue-500'
                                                        }`}
                                                />
                                                <span className="text-sm text-slate-500">{step.timestamp}</span>
                                            </div>
                                            <h3 className="text-md font-semibold mb-1">{step.title}</h3>
                                            <div className="text-slate-700">
                                                {typeof step.content === 'string' ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        className="prose max-w-none"
                                                    >
                                                        {step.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    step.content
                                                )}
                                            </div>
                                            {step.sources && step.sources.length > 0 && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-slate-500">Sources:</span>
                                                    <ul className="list-disc list-inside text-slate-700 text-sm">
                                                        {step.sources.map((source, index) => (
                                                            <li key={index}>
                                                                <a
                                                                    href={source.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {source.name}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Add tool usage indicator */}
                                            {step.metadata?.toolsUsed && (
                                                <ToolUsageIndicator
                                                    toolsUsed={step.metadata.toolsUsed}
                                                    recommendedTools={step.metadata.recommendedTools}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add export buttons */}
                            {researchSteps.length > 0 && (
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleExport('json')}
                                        className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm"
                                    >
                                        Export JSON
                                    </button>
                                    <button
                                        onClick={() => handleExport('markdown')}
                                        className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm"
                                    >
                                        Export Markdown
                                    </button>
                                    <button
                                        onClick={() => handleExport('csv')}
                                        className="px-3 py-1 bg-slate-600 hover:bg-slate-
