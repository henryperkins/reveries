import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAIEnhancedPersistence } from '../hooks/useAIEnhancedPersistence';
import { ResearchGraphManager } from '../managers/ResearchGraphManager';
import { ResearchStep } from '../types/ResearchStep';
import { AIInsights } from './AIInsights';
import { SemanticSearch } from './SemanticSearch';
import { ResearchAgentService } from '../services/researchAgentService';
import { Header, Controls, InputBar, ResearchArea, ProgressBar, ResearchGraphView, ErrorDisplay, ParadigmIndicator, ContextDensityBar } from '@/components';

const App: React.FC = () => {
  const sessionId = useMemo(() => `session-${Date.now()}`, []);
  const {
    persistenceState,
    aiState,
    saveResearchStepWithAI,
    saveResearchGraph,
    loadResearchData,
    semanticSearch,
    generateInsights,
  } = useAIEnhancedPersistence(sessionId);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [similarNodes, setSimilarNodes] = useState<
    { node: ResearchNode; similarity: number }[]
  >([]);
  const [research, setResearch] = useState<ResearchStep[]>([]);
  const [paradigm, setParadigm] = useState<string | null>(null);
  const [paradigmProbabilities, setParadigmProbabilities] = useState<Record<string, number> | null>(null);
  const [contextDensities, setContextDensities] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [effort, setEffort] = useState<any>(null);
  const [enhancedMode, setEnhancedMode] = useState(false);

  const graphManagerRef = useRef<ResearchGraphManager | null>(null);

  const forceGraphUpdate = () => {
    // Function to force update the graph, implementation depends on your graph library
  };

  const handleFindSimilar = useCallback(async (nodeId: string) => {
    const similar = await graphManagerRef.current?.findSimilarNodes(nodeId);
    setSimilarNodes(similar || []);
  }, []);

  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setProgress(0);
    clearError();

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
      };

      setResearch(prev => [...prev, initialStep]);

      // Add to graph
      const rootNode = graphManagerRef.current?.addNode(initialStep);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Process with research agent
      const result = await ResearchAgentService.generateText(input, currentModel, effort);

      clearInterval(progressInterval);
      setProgress(100);

      // Update step with result
      const completedStep: ResearchStep = {
        ...initialStep,
        content: result.text,
        sources: result.sources || []
      };

      // Complete the node in graph
      graphManagerRef.current?.completeNode(rootNode.id);

      setResearch(prev =>
        prev.map(step => step.id === initialStep.id ? completedStep : step)
      );

      // Update node metadata with processing info
      graphManagerRef.current?.updateNodeMetadata(rootNode.id, {
        model: currentModel,
        effort: effort,
        sourcesCount: result.sources?.length || 0
      });

      // Simulate paradigm detection based on query type
      if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('explain')) {
        setParadigm('bernard');
        setParadigmProbabilities({ dolores: 0.15, teddy: 0.20, bernard: 0.45, maeve: 0.20 });
      } else if (input.toLowerCase().includes('protect') || input.toLowerCase().includes('safe')) {
        setParadigm('teddy');
        setParadigmProbabilities({ dolores: 0.10, teddy: 0.50, bernard: 0.25, maeve: 0.15 });
      } else {
        setParadigm('dolores');
        setParadigmProbabilities({ dolores: 0.40, teddy: 0.20, bernard: 0.25, maeve: 0.15 });
      }

    } catch (err) {
      handleError(err as Error);
      // Mark node as errored if it exists
      if (graphManagerRef.current?.getNodes().length > 0) {
        const nodes = graphManagerRef.current.getNodes();
        const lastNode = nodes[nodes.length - 1];
        graphManagerRef.current.markNodeError(lastNode.id, (err as Error).message);
      }
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, [isLoading, currentModel, effort, clearError, handleError, graphManagerRef]);

  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all research? This action cannot be undone.')) {
      setResearch([]);
      setParadigm(null);
      setParadigmProbabilities(null);
      graphManagerRef.current?.reset();
    }
  }, [setResearch, graphManagerRef]);

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      const savedData = await loadResearchData();
      if (savedData?.graph) {
        // Restore graph state
        graphManagerRef.current = new ResearchGraphManager();
        savedData.graph.nodes.forEach((node: any) => {
          graphManagerRef.current.addNode(node, node.parentId, node.metadata);
        });
        forceGraphUpdate();
      }
    };
    loadSavedData();
  }, [loadResearchData]);

  // Save graph on changes
  useEffect(() => {
    if (graphManagerRef.current?.getNodes().size > 0) {
      saveResearchGraph(graphManagerRef.current);
    }
  }, [research, saveResearchGraph]);

  // Update handleAddStep to use AI-enhanced save
  const handleAddStep = useCallback(async (
    step: ResearchStep,
    parentId?: string
  ) => {
    // Save with AI enhancement
    await saveResearchStepWithAI(step, parentId);
  }, [saveResearchStepWithAI]);

  // Handle semantic search result selection
  const handleSearchResultSelect = useCallback((step: ResearchStep) => {
    // Navigate to or highlight the selected step
    setSelectedNode(step.id);
  }, []);

  const handleToggleGraph = useCallback(() => {
    setShowGraph(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    // Implement export functionality
  }, []);

  const handleEnhancedModeChange = useCallback(() => {
    setEnhancedMode(prev => !prev);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
  }, []);

  return (
    <div className="app min-h-screen bg-gradient-to-br from-westworld-cream to-westworld-beige text-westworld-black">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Controls
            onStart={() => {/* Research is triggered by InputBar */}}
            onClear={handleClear}
            onToggleGraph={handleToggleGraph}
            onExport={handleExport}
            onEnhancedModeChange={handleEnhancedModeChange}
            isLoading={isLoading}
            isEmpty={research.length === 0}
            enhancedMode={enhancedMode}
            onModelChange={(model) => setCurrentModel(model as typeof GENAI_MODEL_FLASH)}
            selectedModel={currentModel}
          />
        </div>

        {error && (
          <div className="mb-6 animate-slideUp">
            <ErrorDisplay error={error.message} onDismiss={clearError} />
          </div>
        )}

        <ResearchGraphView
          graphManager={graphManagerRef.current}
          isOpen={showGraph}
          onClose={handleToggleGraph}
        />

        <div className="space-y-6">
          {/* Show paradigm UI when detected */}
          {paradigm && paradigmProbabilities && !isLoading && (
            <div className="animate-fadeIn">
              <ParadigmIndicator
                paradigm={paradigm}
                probabilities={paradigmProbabilities}
                confidence={Math.max(...Object.values(paradigmProbabilities))}
              />
            </div>
          )}

          {/* Show context density during processing */}
          {isLoading && contextDensities && (
            <div className="animate-slideUp">
              <ContextDensityBar
                densities={contextDensities}
                dominantHouse="ravenclaw"
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
          <div className="mt-6">
            <ProgressBar
              progress={progress}
              label="Processing research..."
              color="primary"
              animate={true}
            />
          </div>
        )}

        <div className="mt-8 sticky bottom-0 pb-4 bg-gradient-to-t from-westworld-beige to-transparent pt-4">
          <InputBar
            onSubmit={handleSubmit}
            placeholder="Enter your research question..."
            disabled={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
