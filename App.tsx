import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from './components/Header';
import { ResearchArea } from './components/ResearchArea';
import { InputBar } from './components/InputBar';
import { Controls } from './components/Controls';
import { FeaturesList } from './components/FeaturesList';
import { ProgressBar } from './components/ProgressBar';
import { ResearchStep, ResearchStepType, EffortType, ModelType, ServiceCallConfig, EnhancedResearchResults, QueryType, AZURE_O3_MODEL } from './types';
import { ResearchAgentService } from './services/researchAgentService';
import { ResearchGraphManager } from './researchGraph';
import { ResearchGraphView } from './components/ResearchGraphView';
import { usePersistedState, useResearchSessions, useCancellableOperation } from './hooks/usePersistedState';
import { exportResearch, copyToClipboard, formatDuration } from './utils/exportUtils';
import { APIError, ErrorBoundary } from './services/errorHandler';
import { DEFAULT_EFFORT, DEFAULT_MODEL } from './constants';
import {
  ListBulletIcon, MagnifyingGlassIcon, ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon, SparklesIcon, UserCircleIcon, QuestionMarkCircleIcon,
  ArrowDownTrayIcon, ClipboardDocumentIcon, ChartBarIcon,
  CpuChipIcon, BeakerIcon, LightBulbIcon, CheckCircleIcon
} from './components/icons';

const formatContentWithSources = (text: string, sources?: { name: string; url?: string }[]): React.ReactNode => {
  const mainContent = (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-westworld-gold font-bold text-xl mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-westworld-gold font-semibold text-lg mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-westworld-rust font-medium text-base mb-2">{children}</h3>,
          strong: ({ children }) => <strong className="text-westworld-gold font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-westworld-rust">{children}</em>,
          code: ({ children }) => <code className="westworld-mono bg-black/30 px-1 py-0.5 rounded-sm text-sm" style={{ color: 'var(--westworld-gold)' }}>{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-westworld-tan border-l-4 pl-4 my-3 text-westworld-rust italic">{children}</blockquote>
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );

  if (sources && sources.length > 0) {
    return (
      <>
        {mainContent}
        <h4 className="font-semibold mt-3 mb-1 text-sm text-westworld-gold font-westworld-mono">Memory Sources:</h4>
        <ul className="list-disc list-inside text-xs space-y-1">
          {sources.map((src, idx) => (
            <li key={idx}>
              <a
                href={src.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-westworld-rust hover:text-white transition-colors duration-200"
                title={src.url || src.name}
              >
                {src.name || src.url || 'Unknown Source'}
              </a>
            </li>
          ))}
        </ul>
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
  const totalSteps = enhancedMode ? 6 : 4; // More steps in enhanced mode
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

    // Add to graph
    const parentId = graphManagerRef.current.getGraph().currentPath.slice(-1)[0];
    graphManagerRef.current.addNode(newStep, parentId, {
      model: selectedModel,
      effort: selectedEffort
    });

    return newStepId;
  }, [selectedModel, selectedEffort]);

  const updateStepContent = useCallback((stepId: string, newContent: string | React.ReactNode, newTitle?: string, newSources?: { name: string; url?: string }[]) => {
    setResearchSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId ? { ...step, title: newTitle || step.title, content: newContent, sources: newSources || step.sources, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), isSpinning: false } : step
    ));
  }, []);

  const markStepError = useCallback((stepId: string, errorMessage: string, title?: string) => {
    setResearchSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId ? { ...step, title: title || "Error", content: errorMessage, icon: QuestionMarkCircleIcon, isSpinning: false, type: ResearchStepType.ERROR } : step
    ));
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

    const queryType = await researchAgentService.classifyQuery(query, serviceConfig.selectedModel, serviceConfig.selectedEffort, signal);

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
        addStep({
          type: ResearchStepType.ANALYTICS,
          title: "Host Diagnostics",
          content: `**Cognitive Analysis Complete**\n\n${metadata.map(m => `• ${m}`).join('\n')}`,
          icon: ChartBarIcon,
        });
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
      },
      signal
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
      },
      signal
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

    const research = await researchAgentService.performWebResearch(queries, serviceConfig.selectedModel, serviceConfig.selectedEffort, signal);
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

    exportResearch(exportData, `research-${Date.now()}.json`);
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

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <Header />

        <main className="mt-8 bg-westworld-beige p-6 sm:p-8 rounded-xl">
          {currentQuery && researchSteps.length === 0 && !isLoading && (
            <div className="bg-westworld-beige p-4 rounded-lg mb-6 border-westworld-tan border text-westworld-gold">
              <p className="font-semibold font-westworld-mono">{currentQuery}</p>
            </div>
          )}
          <ResearchArea steps={researchSteps} />

          {/* determinate progress bar for visual feedback */}
          <ProgressBar value={progressValue} />

          {error && <p className="text-red-400 mt-4 text-sm font-westworld-mono">⚠ Aberration Detected: {error}</p>}
          <InputBar onQuerySubmit={handleQuerySubmit} isLoading={isLoading} initialQuery={exampleQuery} />
          <Controls
            selectedEffort={selectedEffort}
            onEffortChange={setSelectedEffort}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onNewSearch={handleNewSearch}
            isLoading={isLoading}
          />

          {/* Enhanced controls with new features */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Controls
              selectedEffort={selectedEffort}
              onEffortChange={setSelectedEffort}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onNewSearch={handleNewSearch}
              isLoading={isLoading}
            />

            {/* Additional action buttons */}
            <button
              onClick={() => setShowGraph(true)}
              disabled={researchSteps.length === 0}
              className="px-4 py-2 bg-westworld-copper text-white rounded hover:bg-westworld-rust transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChartBarIcon className="w-5 h-5" />
              View Graph
            </button>

            <button
              onClick={handleExport}
              disabled={researchSteps.length === 0}
              className="px-4 py-2 bg-westworld-gold text-black rounded hover:bg-westworld-rust transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export
            </button>

            {isLoading && (
              <button
                onClick={cancelOperation}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <XMarkIcon className="w-5 h-5" />
                Cancel
              </button>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-2 text-xs text-westworld-rust">
            <span className="font-westworld-mono">Ctrl+Enter</span> to submit •
            <span className="font-westworld-mono"> Ctrl+G</span> to view graph •
            <span className="font-westworld-mono"> Esc</span> to cancel
          </div>
        </main>

        <FeaturesList />
      </div

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
