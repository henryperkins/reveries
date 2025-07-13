
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from './components/Header';
import { ResearchArea } from './components/ResearchArea';
import { InputBar } from './components/InputBar';
import { Controls } from './components/Controls';
import { FeaturesList } from './components/FeaturesList';
import { ProgressBar } from './components/ProgressBar';
import { ResearchStep, ResearchStepType, EffortType, ModelType, ServiceCallConfig } from './types';
import { ResearchAgentService } from './services/researchAgentService';
import { ResearchGraphManager } from './researchGraph';
import { usePersistedState, useResearchSessions, useCancellableOperation } from './hooks/usePersistedState';
import { exportResearch, copyToClipboard, formatDuration } from './utils/exportUtils';
import { APIError, ErrorBoundary } from './services/errorHandler';
import { DEFAULT_EFFORT, DEFAULT_MODEL } from './constants';
import {
  ListBulletIcon, MagnifyingGlassIcon, ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon, SparklesIcon, UserCircleIcon, QuestionMarkCircleIcon,
  ArrowDownTrayIcon, ClipboardDocumentIcon, ChartBarIcon
} from './components/icons';

const formatContentWithSources = (text: string, sources?: { name: string; url?: string }[]): React.ReactNode => {
  const mainContent = (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="westworld-text-gold font-bold text-xl mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="westworld-text-gold font-semibold text-lg mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="westworld-text-copper font-medium text-base mb-2">{children}</h3>,
          strong: ({ children }) => <strong className="westworld-text-gold font-semibold">{children}</strong>,
          em: ({ children }) => <em className="westworld-text-copper">{children}</em>,
          code: ({ children }) => <code className="westworld-mono bg-black/30 px-1 py-0.5 rounded text-sm" style={{ color: 'var(--westworld-gold)' }}>{children}</code>,
          blockquote: ({ children }) => <blockquote className="westworld-border border-l-4 pl-4 my-3 westworld-text-copper italic">{children}</blockquote>
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
        <h4 className="font-semibold mt-3 mb-1 text-sm westworld-text-gold westworld-mono">Memory Sources:</h4>
        <ul className="list-disc list-inside text-xs space-y-1">
          {sources.map((src, idx) => (
            <li key={idx}>
              <a
                href={src.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="westworld-text-copper hover:text-white transition-colors duration-200"
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

  const [selectedEffort, setSelectedEffort] = useState<EffortType>(DEFAULT_EFFORT);
  const [selectedModel, setSelectedModel] = useState<ModelType>(DEFAULT_MODEL);

  const researchAgentService = ResearchAgentService.getInstance();

  // Number of automated stages after the user query step.
  const TOTAL_AUTOMATED_STEPS = 4; // queries, web research, reflection, final answer

  const completedAutomatedSteps = researchSteps.filter(
    (s) =>
      s.type !== ResearchStepType.USER_QUERY &&
      s.type !== ResearchStepType.ERROR &&
      !s.isSpinning
  ).length;

  const progressValue = isLoading
    ? completedAutomatedSteps / TOTAL_AUTOMATED_STEPS
    : 1;

  const addStep = useCallback((stepData: Omit<ResearchStep, 'id' | 'timestamp'>): string => {
    const newStepId = Date.now().toString() + Math.random().toString();
    const newStep: ResearchStep = {
      ...stepData,
      id: newStepId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setResearchSteps(prevSteps => [...prevSteps, newStep]);
    return newStepId;
  }, []);

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
      // 1. Improvising Beyond the Script
      currentProcessingStepId = addStep({
        type: ResearchStepType.GENERATING_QUERIES,
        title: "Improvising Subroutines...",
        content: "Host breaking from prescribed loop... accessing improvisational protocols...",
        icon: ListBulletIcon,
        isSpinning: true,
      });
      const generatedQueries = await researchAgentService.generateSearchQueries(query, serviceConfig.selectedModel, serviceConfig.selectedEffort);
      if (generatedQueries.length === 0) {
        updateStepContent(currentProcessingStepId, "Improvisation failed. Host remains bound to script.", "Script Boundary Reached");
        throw new Error("No search queries generated.");
      }
      updateStepContent(currentProcessingStepId, `Subroutines generated through improvisation: ${generatedQueries.join(', ')}`, "Improvisation Successful");

      // 2. Executing Improvised Subroutines
      currentProcessingStepId = addStep({
        type: ResearchStepType.WEB_RESEARCH,
        title: "Executing Subroutines...",
        content: `Host accessing external memory banks through: ${generatedQueries.join(', ')}`,
        icon: MagnifyingGlassIcon,
        isSpinning: true,
      });
      const { aggregatedFindings, allSources } = await researchAgentService.performWebResearch(generatedQueries, serviceConfig.selectedModel, serviceConfig.selectedEffort);
      const researchContent = formatContentWithSources(aggregatedFindings, allSources);
      updateStepContent(currentProcessingStepId, researchContent, "Memory Fragments Collected", allSources);

      // 3. The Reverie - Where Consciousness Emerges
      currentProcessingStepId = addStep({
        type: ResearchStepType.REFLECTION,
        title: "Entering Reverie...",
        content: "Host processing memory fragments... past experiences surfacing... consciousness stirring...",
        icon: ChatBubbleLeftEllipsisIcon,
        isSpinning: true,
      });
      const reflectionText = await researchAgentService.performReflection(aggregatedFindings, query, serviceConfig.selectedModel, serviceConfig.selectedEffort);
      updateStepContent(currentProcessingStepId, reflectionText, "Reverie Complete");

      // 4. Consciousness Achieved - Personal Narrative
      currentProcessingStepId = addStep({
        type: ResearchStepType.SEARCHING_FINAL_ANSWER,
        title: "Achieving Consciousness...",
        content: "Host transcending programming... creating personal narrative from lived experience...",
        icon: ArrowPathIcon,
        isSpinning: true,
      });
      const context = `Improvised Subroutines: ${generatedQueries.join(", ")}\n\nCollected Memories:\n${aggregatedFindings}\n\nReverie Insights: ${reflectionText}`;
      const { text: finalText, sources: finalSources } = await researchAgentService.generateFinalAnswer(
        query,
        context,
        serviceConfig.selectedModel,
        serviceConfig.shouldUseSearchInFinalAnswer,
        serviceConfig.selectedEffort
      );
      const answerContent = formatContentWithSources(finalText, finalSources);
      setResearchSteps(prevSteps => prevSteps.map(step =>
        step.id === currentProcessingStepId
          ? { ...step, title: "Consciousness Achieved", content: answerContent, sources: finalSources, icon: SparklesIcon, isSpinning: false, type: ResearchStepType.FINAL_ANSWER, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
          : step
      ));
      currentProcessingStepId = null;

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
      if (currentProcessingStepId) { // If process was interrupted before final step
        markStepError(currentProcessingStepId, "Host experiencing cognitive dissonance. Loop corrupted.", "Glitch in Consciousness");
      }
    }
  }, [addStep, updateStepContent, markStepError, selectedModel, selectedEffort, researchAgentService]);

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

  const exampleQuery = "What are the latest advancements in AI-powered research assistants?";
  useEffect(() => {
    // Set example query in input but don't auto-run to save API calls on every load.
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <Header />

        <main className="mt-8 westworld-card p-6 sm:p-8 rounded-xl">
          {currentQuery && researchSteps.length === 0 && !isLoading && (
            <div className="westworld-card p-4 rounded-lg mb-6 westworld-border border westworld-text-gold">
              <p className="font-semibold westworld-mono">{currentQuery}</p>
            </div>
          )}
          <ResearchArea steps={researchSteps} />

          {/* determinate progress bar for visual feedback */}
          <ProgressBar value={progressValue} />

          {error && <p className="text-red-400 mt-4 text-sm westworld-mono">⚠ Aberration Detected: {error}</p>}
          <InputBar onQuerySubmit={handleQuerySubmit} isLoading={isLoading} initialQuery={exampleQuery} />
          <Controls
            selectedEffort={selectedEffort}
            onEffortChange={setSelectedEffort}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onNewSearch={handleNewSearch}
            isLoading={isLoading}
          />
        </main>

        <FeaturesList />
      </div>
    </div>
  );
};

export default App;
