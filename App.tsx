import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from './components/Header';
import { ResearchArea } from './components/ResearchArea';
import { InputBar } from './components/InputBar';
import { Controls } from './components/Controls';
import { FeaturesList } from './components/FeaturesList';
import { ProgressBar } from './components/ProgressBar';
import { ResearchStep, ResearchStepType, EffortType, ModelType, ServiceCallConfig, EnhancedResearchResults, QueryType, AZURE_O3_MODEL, Citation } from './types';
import { ResearchAgentService } from './services/researchAgentService';
import { ResearchGraphManager } from './researchGraph';
import { ResearchGraphView } from './components/ResearchGraphView';
import { usePersistedState, useResearchSessions, useCancellableOperation } from './hooks/usePersistedState';
import { exportResearchAsJSON } from './utils/exportUtils';
import { APIError, ErrorBoundary } from './services/errorHandler';
import { DEFAULT_EFFORT, DEFAULT_MODEL } from './constants';
import {
  ListBulletIcon, MagnifyingGlassIcon, ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon, SparklesIcon, UserCircleIcon, QuestionMarkCircleIcon,
  ArrowDownTrayIcon, ChartBarIcon,
  CpuChipIcon, BeakerIcon, LightBulbIcon, CheckCircleIcon, XMarkIcon
} from './components/icons';

const formatContentWithSources = (text: string, sources?: Citation[]): React.ReactNode => {
  const mainContent = (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-westworld-rust">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-westworld-rust">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-westworld-copper">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold text-westworld-rust">{children}</strong>,
          em: ({ children }) => <em className="italic text-westworld-copper">{children}</em>,
          code: ({ children }) => <code className="bg-black/20 px-2 py-1 rounded text-sm font-mono text-westworld-gold">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-westworld-gold/30 pl-4 my-4 italic text-westworld-copper">{children}</blockquote>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3">{children}</ol>,
          li: ({ children }) => <li className="text-westworld-rust">{children}</li>,
          p: ({ children }) => <p className="mb-3 leading-relaxed text-westworld-rust">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-westworld-gold hover:text-westworld-copper underline decoration-dotted underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );

  if (sources && sources.length > 0) {
    // Filter out duplicate sources by URL
    const uniqueSources = sources.reduce((acc, source) => {
      const existingIndex = acc.findIndex(s => s.url === source.url);
      if (existingIndex === -1) {
        acc.push(source);
      } else if (source.title && (!acc[existingIndex].title || acc[existingIndex].title === 'Unknown Source')) {
        // Update with better title if available
        acc[existingIndex] = source;
      }
      return acc;
    }, [] as Citation[]);

    return (
      <>
        {mainContent}
        <div className="mt-6 p-4 bg-black/10 rounded-lg">
          <h4 className="font-semibold mb-2 text-sm text-westworld-gold uppercase tracking-wider">Sources</h4>
          <ul className="space-y-2">
            {uniqueSources.map((citation, idx) => (
              <li key={`${citation.url}-${idx}`} className="flex items-start gap-2">
                <span className="text-westworld-gold/60 mt-0.5">•</span>
                <div className="flex-1">
                  <a
                    href={citation.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-westworld-copper hover:text-westworld-gold transition-colors break-words"
                    title={citation.url}
                  >
                    {citation.title || (citation.url ? (() => {
                      try {
                        const url = new URL(citation.url);
                        return url.hostname.replace('www.', '');
                      } catch {
                        return citation.url.length > 50 ? citation.url.substring(0, 50) + '...' : citation.url;
                      }
                    })() : 'Unknown Source')}
                  </a>
                  {citation.authors && citation.authors.length > 0 && (
                    <div className="text-xs text-westworld-copper/80 mt-1">
                      By: {citation.authors.slice(0, 3).join(', ')}{citation.authors.length > 3 ? ' et al.' : ''}
                    </div>
                  )}
                  {citation.published && (
                    <div className="text-xs text-westworld-copper/60 mt-1">
                      Published: {new Date(citation.published).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  {citation.accessed && (
                    <div className="text-xs text-westworld-copper/50 mt-0.5">
                      Accessed: {new Date(citation.accessed).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
  return mainContent;
};

const App: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Add research graph management
  const graphManagerRef = useRef<ResearchGraphManager>(new ResearchGraphManager());
  const [showGraph, setShowGraph] = useState(false);

  // Initialize research agent service
  const researchAgentService = ResearchAgentService.getInstance();

  // Use persisted state for settings
  const [selectedEffort, setSelectedEffort] = usePersistedState<EffortType>('selectedEffort', DEFAULT_EFFORT);
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>('selectedModel', DEFAULT_MODEL);
  const [enhancedMode, setEnhancedMode] = usePersistedState<boolean>('enhancedMode', true);

  // Use research sessions
  const { sessions, addSession, updateSession } = useResearchSessions();
  const currentSessionRef = useRef<string | null>(null);

  // Use cancellable operations
  const { startOperation, cancelOperation, isOperationActive, signal } = useCancellableOperation();

  // Number of automated stages after the user query step.
  const TOTAL_AUTOMATED_STEPS = 4; // queries, web research, reflection, final answer

  // Enhanced progress calculation with graph tracking
  const completedAutomatedSteps = graphManagerRef.current.getGraph().nodes.size - 1; // Exclude user query
  const totalSteps = enhancedMode ? 7 : 4; // More steps in enhanced mode (including analytics)
  const progressValue = isLoading
    ? Math.min(completedAutomatedSteps / totalSteps, 0.95)
    : 1;

  const addStep = useCallback((stepData: Omit<ResearchStep, 'id' | 'timestamp'>): string => {
    const newStepId = Date.now().toString() + Math.random().toString();
    const newStep: ResearchStep = {
      ...stepData,
      id: newStepId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setResearchSteps(prevSteps => [...prevSteps, newStep]);

    // Add to graph with initial metadata
    const parentId = graphManagerRef.current.getGraph().currentPath.slice(-1)[0];
    const metadata: any = {
      model: selectedModel,
      effort: selectedEffort,
      sourcesCount: stepData.sources?.length || 0,
      citationsCount: stepData.sources?.length || 0,
      uniqueCitations: stepData.sources?.map(s => s.url || s.title || '').filter(Boolean) || []
    };

    // Add step-specific metadata
    if (stepData.type === ResearchStepType.GENERATING_QUERIES) {
      metadata.queriesGenerated = [];
    }

    graphManagerRef.current.addNode(newStep, parentId, metadata);

    return newStepId;
  }, [selectedModel, selectedEffort]);

  const updateStepContent = useCallback((stepId: string, newContent: string | React.ReactNode, newTitle?: string, newSources?: Citation[]) => {
    setResearchSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId ? { ...step, title: newTitle || step.title, content: newContent, sources: newSources || step.sources, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), isSpinning: false } : step
    ));

    // Update graph node metadata
    const nodeId = `node-${stepId}`;
    const node = graphManagerRef.current.getGraph().nodes.get(nodeId);
    if (node) {
      // Extract queries if this is a query generation step
      if (node.type === ResearchStepType.GENERATING_QUERIES && typeof newContent === 'string') {
        const queriesMatch = newContent.match(/Generated (\d+) search queries/);
        if (queriesMatch) {
          const queryCount = parseInt(queriesMatch[1], 10);
          node.metadata = {
            ...node.metadata,
            queriesGenerated: Array(queryCount).fill(null).map((_, i) => `Query ${i + 1}`)
          };
        }
      }

      // Update sources metadata
      if (newSources && newSources.length > 0) {
        const uniqueCitations = newSources.map(s => s.url || s.title || '').filter(Boolean);
        node.metadata = {
          ...node.metadata,
          sourcesCount: newSources.length,
          citationsCount: newSources.length,
          uniqueCitations: [...new Set(uniqueCitations)]
        };
      }

      // Mark node as complete by updating duration
      const nodeTimestamp = graphManagerRef.current['nodeTimestamps'].get(nodeId);
      if (nodeTimestamp) {
        node.duration = Date.now() - nodeTimestamp;
      }
    }
  }, []);

  const markStepError = useCallback((stepId: string, errorMessage: string, title?: string) => {
    setResearchSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId ? { ...step, title: title || "Error", content: errorMessage, icon: QuestionMarkCircleIcon, isSpinning: false, type: ResearchStepType.ERROR } : step
    ));

    // Mark error in graph with proper node ID
    const nodeId = `node-${stepId}`;
    graphManagerRef.current.markNodeError(nodeId, errorMessage);
  }, []);

  const executeResearchWorkflow = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setResearchSteps([]);

    // Reset graph for new research
    graphManagerRef.current.reset();

    // Create new session
    const sessionId = Date.now().toString();
    currentSessionRef.current = sessionId;
    addSession({
      id: sessionId,
      query,
      timestamp: Date.now(),
      steps: [],
      completed: false,
      model: selectedModel,
      effort: selectedEffort
    });

    // Start cancellable operation
    const controller = startOperation();

    addStep({
      type: ResearchStepType.USER_QUERY,
      title: "Guest's Command",
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
      // Choose workflow based on enhanced mode setting
      if (enhancedMode) {
        await executeEnhancedResearchWorkflow(query, serviceConfig, controller.signal);
      } else {
        await executeLegacyResearchWorkflow(query, serviceConfig, controller.signal);
      }

      // Mark session as completed
      if (currentSessionRef.current) {
        updateSession(currentSessionRef.current, {
          completed: true,
          steps: researchSteps,
          graphData: graphManagerRef.current.serialize(),
          duration: Date.now() - sessions.find(s => s.id === currentSessionRef.current)?.timestamp || 0
        });
      }

    } catch (e: any) {
      console.error("Error during research workflow execution:", e);
      const errorMessage = e.message || "Critical glitch detected in host's cognitive processes.";
      setError(errorMessage);
      if (currentProcessingStepId) {
        markStepError(currentProcessingStepId, errorMessage, "Aberration Detected");
      } else {
        addStep({ type: ResearchStepType.ERROR, title: "Critical Aberration", content: errorMessage, icon: QuestionMarkCircleIcon });
      }
    } finally {
      setIsLoading(false);
      cancelOperation();
      if (currentProcessingStepId) { // If process was interrupted before final step
        markStepError(currentProcessingStepId, "Host experiencing cognitive dissonance. Loop corrupted.", "Glitch in Consciousness");
      }
    }
  }, [addStep, updateStepContent, markStepError, selectedModel, selectedEffort, researchAgentService, startOperation, cancelOperation, addSession, updateSession, sessions]);

  // Legacy Research Workflow (simplified version)
  const executeLegacyResearchWorkflow = useCallback(async (query: string, serviceConfig: ServiceCallConfig, signal?: AbortSignal) => {
    let currentProcessingStepId: string | null = null;

    try {
      // Step 1: Generate search queries
      currentProcessingStepId = addStep({
        type: ResearchStepType.GENERATING_QUERIES,
        title: "Generating Search Queries",
        content: "Creating optimized search queries...",
        icon: MagnifyingGlassIcon,
        isSpinning: true,
      });

      const queries = await researchAgentService.generateSearchQueries(query, serviceConfig.selectedModel, serviceConfig.selectedEffort);

      // Update with actual queries
      updateStepContent(currentProcessingStepId, `Generated ${queries.length} search queries:\n${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`, "Search Queries Ready");

      // Step 2: Web research
      currentProcessingStepId = addStep({
        type: ResearchStepType.WEB_RESEARCH,
        title: "Performing Web Research",
        content: "Searching for relevant information...",
        icon: ArrowPathIcon,
        isSpinning: true,
      });

      const research = await researchAgentService.performWebResearch(queries, serviceConfig.selectedModel, serviceConfig.selectedEffort);
      updateStepContent(
        currentProcessingStepId,
        `Found ${research.allSources.length} sources from web research.`,
        "Research Complete",
        research.allSources
      );

      // Step 3: Reflection (if we have sources)
      if (research.allSources.length > 0) {
        currentProcessingStepId = addStep({
          type: ResearchStepType.REFLECTION,
          title: "Reflecting on Findings",
          content: "Analyzing gathered information...",
          icon: LightBulbIcon,
          isSpinning: true,
        });

        const reflection = await researchAgentService.performReflection(
          research.aggregatedFindings,
          query,
          serviceConfig.selectedModel,
          serviceConfig.selectedEffort
        );
        updateStepContent(currentProcessingStepId, reflection, "Reflection Complete");
      }

      // Step 4: Generate final answer
      currentProcessingStepId = addStep({
        type: ResearchStepType.FINAL_ANSWER,
        title: "Generating Final Answer",
        content: "Synthesizing information...",
        icon: SparklesIcon,
        isSpinning: true,
      });

      const answer = await researchAgentService.generateFinalAnswer(
        query,
        research.aggregatedFindings,
        serviceConfig.selectedModel,
        serviceConfig.shouldUseSearchInFinalAnswer,
        serviceConfig.selectedEffort
      );

      const allSources = [...research.allSources, ...(answer.sources || [])];
      updateStepContent(currentProcessingStepId, formatContentWithSources(answer.text, allSources), "Analysis Complete", allSources);

    } catch (error: any) {
      if (currentProcessingStepId) {
        markStepError(currentProcessingStepId, error.message || "An error occurred", "Error");
        // Also mark in graph
        graphManagerRef.current.markNodeError(`node-${currentProcessingStepId}`, error.message || "An error occurred");
      }
      throw error;
    }
  }, [addStep, updateStepContent, markStepError, researchAgentService]);

  // Enhanced Research Workflow with LangGraph Patterns
  const executeEnhancedResearchWorkflow = useCallback(async (query: string, serviceConfig: ServiceCallConfig, signal?: AbortSignal) => {
    let currentProcessingStepId: string | null = null;

    // Step 1: Router Pattern - Classify Query Type
    currentProcessingStepId = addStep({
      type: ResearchStepType.GENERATING_QUERIES,
      title: "Host analyzing guest query pattern...",
      content: "Scanning cognitive frameworks... selecting optimal narrative approach...",
      icon: CpuChipIcon,
      isSpinning: true,
    });

    const queryType = await researchAgentService.classifyQuery(query, serviceConfig.selectedModel, serviceConfig.selectedEffort);

    const routingMessages = {
      factual: 'Query classified as FACTUAL. Host accessing verified data repositories...',
      analytical: 'Query classified as ANALYTICAL. Initiating deep cognitive analysis protocols...',
      comparative: 'Query classified as COMPARATIVE. Fragmenting consciousness for parallel analysis...',
      exploratory: 'Query classified as EXPLORATORY. Breaking from script... improvising narrative...'
    };

    updateStepContent(currentProcessingStepId, routingMessages[queryType], "Query Analysis Complete");

    // Step 2: Execute Specialized Research Based on Query Type
    let result: EnhancedResearchResults;

    switch (queryType) {
      case 'analytical':
        result = await executeAnalyticalResearch(query, serviceConfig, signal);
        break;
      case 'comparative':
      case 'exploratory':
        result = await executeComprehensiveResearch(query, serviceConfig, signal);
        break;
      default: // factual
        result = await executeFactualResearch(query, serviceConfig, signal);
    }

    // Step 3: Display Final Results
    const finalAnswer = addStep({
      type: ResearchStepType.FINAL_ANSWER,
      title: "Consciousness Achieved",
      content: formatContentWithSources(result.synthesis, result.sources),
      icon: SparklesIcon,
      sources: result.sources,
    });

    // Add metadata about the research process
    if (result.evaluationMetadata || result.refinementCount || result.sections || result.adaptiveMetadata) {
      const metadata = [];
      if (result.queryType) metadata.push(`Query Type: ${result.queryType}`);
      if (result.refinementCount) metadata.push(`Refinement Loops: ${result.refinementCount}`);
      if (result.sections) metadata.push(`Research Sections: ${result.sections.length}`);
      if (result.evaluationMetadata) {
        metadata.push(`Quality Score: ${((result.evaluationMetadata.completeness || 0) +
          (result.evaluationMetadata.accuracy || 0) +
          (result.evaluationMetadata.clarity || 0)) / 3 * 100}%`);
      }
      if (result.confidenceScore) {
        metadata.push(`Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);
      }
      if (result.adaptiveMetadata) {
        if (result.adaptiveMetadata.cacheHit) metadata.push(`Source: Memory Cache`);
        if (result.adaptiveMetadata.learnedPatterns) metadata.push(`Learned Patterns: Applied`);
        if (result.adaptiveMetadata.processingTime) metadata.push(`Processing: ${(result.adaptiveMetadata.processingTime / 1000).toFixed(1)}s`);
        if (result.adaptiveMetadata.complexityScore) metadata.push(`Complexity: ${(result.adaptiveMetadata.complexityScore * 100).toFixed(0)}%`);
        if (result.adaptiveMetadata.selfHealed) metadata.push(`Self-Repair: ${result.adaptiveMetadata.healingStrategy || 'Applied'}`);
      }

      if (metadata.length > 0) {
        const analyticsStep = addStep({
          type: ResearchStepType.ANALYTICS,
          title: "Host Diagnostics",
          content: `**Cognitive Analysis Complete**\n\n${metadata.map(m => `• ${m}`).join('\n')}`,
          icon: ChartBarIcon,
        });

        // Update graph node with analytics metadata
        const nodeId = `node-${analyticsStep}`;
        const node = graphManagerRef.current.getGraph().nodes.get(nodeId);
        if (node) {
          node.metadata = {
            ...node.metadata,
            queriesGenerated: result.sections?.map(s => s.topic) || [],
            sourcesCount: result.sources.length,
            citationsCount: result.sources.length,
            uniqueCitations: result.sources.map(citation => citation.url || citation.title || '').filter(Boolean)
          };
        }
      }
   }
  }, [addStep, updateStepContent, researchAgentService]);

  // Analytical Research with Evaluator-Optimizer Pattern
  const executeAnalyticalResearch = useCallback(async (query: string, serviceConfig: ServiceCallConfig, signal?: AbortSignal): Promise<EnhancedResearchResults> => {
    let currentStepId = addStep({
      type: ResearchStepType.WEB_RESEARCH,
      title: "Deep Analysis Mode Activated...",
      content: "Host entering cognitive feedback loop... quality evaluation protocols online...",
      icon: BeakerIcon,
      isSpinning: true,
    });

    const result = await researchAgentService.performResearchWithEvaluation(
      query,
      serviceConfig.selectedModel,
      serviceConfig.selectedEffort,
      (message: string) => {
        updateStepContent(currentStepId, message, "Deep Analysis in Progress...");
      }
    );

    const qualityInfo = result.evaluationMetadata ?
      `\n\n**Quality Assessment:**\n• Completeness: ${(result.evaluationMetadata.completeness || 0) * 100}%\n• Accuracy: ${(result.evaluationMetadata.accuracy || 0) * 100}%\n• Clarity: ${(result.evaluationMetadata.clarity || 0) * 100}%` : '';

    updateStepContent(currentStepId,
      `Analysis complete through ${result.refinementCount || 1} cognitive iterations.${qualityInfo}`,
      "Deep Analysis Complete"
    );

    return result;
  }, [addStep, updateStepContent, researchAgentService]);

  // Comprehensive Research with Orchestrator-Worker Pattern
  const executeComprehensiveResearch = useCallback(async (query: string, serviceConfig: ServiceCallConfig, signal?: AbortSignal): Promise<EnhancedResearchResults> => {
    let currentStepId = addStep({
      type: ResearchStepType.WEB_RESEARCH,
      title: "Consciousness Fragmentation Initiated...",
      content: "Host distributing awareness across multiple narrative threads...",
      icon: CpuChipIcon,
      isSpinning: true,
    });

    const result = await researchAgentService.performComprehensiveResearch(
      query,
      serviceConfig.selectedModel,
      serviceConfig.selectedEffort,
      (message: string) => {
        updateStepContent(currentStepId, message, "Parallel Processing Active...");
      }
    );

    const sectionInfo = result.sections ?
      `\n\n**Research Sections:**\n${result.sections.map(s => `• ${s.topic}: ${s.description}`).join('\n')}` : '';

    updateStepContent(currentStepId,
      `Parallel analysis complete. ${result.sections?.length || 0} narrative threads integrated.${sectionInfo}`,
      "Consciousness Reunification Complete"
    );

    return result;
  }, [addStep, updateStepContent, researchAgentService]);

  // Factual Research with Enhanced Source Verification
  const executeFactualResearch = useCallback(async (query: string, serviceConfig: ServiceCallConfig, signal?: AbortSignal): Promise<EnhancedResearchResults> => {
    let currentStepId = addStep({
      type: ResearchStepType.WEB_RESEARCH,
      title: "Accessing Verified Memory Banks...",
      content: "Host querying authoritative data sources... cross-referencing facts...",
      icon: MagnifyingGlassIcon,
      isSpinning: true,
    });

    // Standard research workflow but optimized for factual queries
    const queries = await researchAgentService.generateSearchQueries(
      query + ' site:wikipedia.org OR site:.gov OR site:.edu OR site:.org',
      serviceConfig.selectedModel,
      serviceConfig.selectedEffort
    );

    const research = await researchAgentService.performWebResearch(queries, serviceConfig.selectedModel, serviceConfig.selectedEffort);
    const answer = await researchAgentService.generateFinalAnswer(query, research.aggregatedFindings, serviceConfig.selectedModel, false, serviceConfig.selectedEffort);

    updateStepContent(currentStepId,
      `Factual verification complete. ${research.allSources.length} authoritative sources consulted.`,
      "Verified Data Retrieved"
    );

    return {
      synthesis: answer.text,
      sources: research.allSources,
      queryType: 'factual' as QueryType
    };
  }, [addStep, updateStepContent, researchAgentService]);

  const handleQuerySubmit = useCallback((queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    setCurrentQuery(queryText);
    executeResearchWorkflow(queryText);
  }, [isLoading, executeResearchWorkflow]);

  const handleNewSearch = useCallback(() => {
    setCurrentQuery('');
    setResearchSteps([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      query: currentQuery,
      steps: researchSteps,
      graph: graphManagerRef.current.serialize(),
      metadata: {
        model: selectedModel,
        effort: selectedEffort,
        timestamp: new Date().toISOString(),
        statistics: graphManagerRef.current.getStatistics()
      }
    };

    exportResearchAsJSON(exportData, `research-${Date.now()}.json`);
  }, [currentQuery, researchSteps, selectedModel, selectedEffort]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input?.value && !isLoading) {
          handleQuerySubmit(input.value);
        }
      }
      // Ctrl/Cmd + G to show graph
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        setShowGraph(prev => !prev);
      }
      // Escape to cancel operation
      if (e.key === 'Escape' && isOperationActive()) {
        cancelOperation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleQuerySubmit, isLoading, isOperationActive, cancelOperation]);

  // Restore session on app load
  useEffect(() => {
    // Find the most recent incomplete session
    const recentSession = sessions
      .filter(s => !s.completed && s.graphData)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (recentSession && !currentQuery && researchSteps.length === 0) {
      try {
        // Restore graph state
        const restoredManager = ResearchGraphManager.deserialize(recentSession.graphData!);
        graphManagerRef.current = restoredManager;

        // Restore UI state
        setCurrentQuery(recentSession.query);
        setResearchSteps(recentSession.steps);
        currentSessionRef.current = recentSession.id;

        // Restore model settings if available
        if (recentSession.model) {
          setSelectedModel(recentSession.model as ModelType);
        }
        if (recentSession.effort) {
          setSelectedEffort(recentSession.effort as EffortType);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    }
  }, [sessions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-westworld-cream via-westworld-beige to-westworld-tan/20 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl animate-fadeIn">
        <Header />

        <main className="mt-8 bg-white/80 backdrop-blur-md shadow-2xl p-8 rounded-2xl border border-westworld-tan/20">
          {currentQuery && researchSteps.length === 0 && !isLoading && (
            <div className="bg-gradient-to-r from-westworld-gold/10 to-westworld-gold/5 p-4 rounded-xl mb-6 border border-westworld-gold/30">
              <p className="font-semibold text-westworld-rust flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-westworld-gold" />
                {currentQuery}
              </p>
            </div>
          )}

          <ResearchArea steps={researchSteps} />

          {/* Progress bar with better visibility */}
          {isLoading && (
            <div className="mt-6 mb-4 animate-fadeIn">
              <ProgressBar value={progressValue} />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-300 rounded-xl animate-fadeIn">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <XMarkIcon className="w-5 h-5" />
                <span className="font-medium">System Alert:</span> {error}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <InputBar onQuerySubmit={handleQuerySubmit} isLoading={isLoading} />

            {/* Consolidated controls section */}
            <div className="flex flex-col gap-4">
              <Controls
                selectedEffort={selectedEffort}
                onEffortChange={setSelectedEffort}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onNewSearch={handleNewSearch}
                isLoading={isLoading}
                enhancedMode={enhancedMode}
                onEnhancedModeChange={setEnhancedMode}
              />

              {/* Action buttons with improved styling */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowGraph(true)}
                  disabled={researchSteps.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-westworld-gold to-westworld-copper text-black rounded-xl hover:from-westworld-copper hover:to-westworld-rust hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span className="font-medium">View Research Graph</span>
                </button>

                <button
                  onClick={handleExport}
                  disabled={researchSteps.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-westworld-copper to-westworld-rust text-white rounded-xl hover:from-westworld-rust hover:to-westworld-darkbrown transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span className="font-medium">Export Results</span>
                </button>

                {isLoading && (
                  <button
                    onClick={cancelOperation}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg animate-pulse transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    <span className="font-medium">Abort Process</span>
                  </button>
                )}
              </div>
            </div>

            {/* Keyboard shortcuts with better styling */}
            <div className="mt-6 p-4 bg-gradient-to-r from-westworld-tan/10 to-westworld-tan/5 rounded-xl border border-westworld-tan/20">
              <p className="text-sm text-westworld-copper font-semibold mb-2">Quick Commands:</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1.5 bg-white/60 rounded-lg border border-westworld-tan/30 font-mono shadow-sm">Ctrl+Enter</kbd>
                  <span className="text-westworld-rust">Submit Query</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1.5 bg-white/60 rounded-lg border border-westworld-tan/30 font-mono shadow-sm">Ctrl+G</kbd>
                  <span className="text-westworld-rust">Show Graph</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1.5 bg-white/60 rounded-lg border border-westworld-tan/30 font-mono shadow-sm">Esc</kbd>
                  <span className="text-westworld-rust">Cancel Operation</span>
                </span>
              </div>
            </div>
          </div>
        </main>

        <FeaturesList />
      </div>

      {/* Research Graph Visualization Modal */}
      <ResearchGraphView
        graphManager={graphManagerRef.current}
        isOpen={showGraph}
        onClose={() => setShowGraph(false)}
      />
    </div>
  );
};

export default App;
