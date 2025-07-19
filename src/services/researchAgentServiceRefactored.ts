/**
 * Research Agent Service - Refactored
 * Main orchestrator/facade for all research operations
 */

import {
  ModelType,
  EffortType,
  // QueryType,
  // HostParadigm,
  Citation,
  ResearchResponse,
  ResearchModel,
  GENAI_MODEL_FLASH,
  ResearchStep,
  ResearchStepType,
  ResearchMetadata
} from '@/types';
import {
  EnhancedResearchResults,
  ResearchState,
  ParadigmProbabilities,
  ContextDensity,
  ResearchPhase,
  ContextLayer
} from './research/types';

// Import all sub-services
import { ModelProviderService } from './providers/ModelProviderService';
import { ResearchStrategyService } from './research/ResearchStrategyService';
import { WebResearchService } from './research/WebResearchService';
import { ComprehensiveResearchService } from './research/ComprehensiveResearchService';
import { EvaluationService } from './research/EvaluationService';
import { ParadigmResearchService } from './paradigm/ParadigmResearchService';
import { ResearchMemoryService } from './memory/ResearchMemoryService';
import { ResearchUtilities } from './utils/ResearchUtilities';
import { ContextEngineeringService } from './contextEngineeringService';
import { ParadigmClassifier } from './paradigmClassifier';
import { DatabaseService } from './databaseService';

// Import context layer services
import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';
import { CompressLayerService } from './contextLayers/compressLayer';
import { IsolateLayerService } from './contextLayers/isolateLayer';

export class ResearchAgentService {
  private static instance: ResearchAgentService | null = null;

  // Sub-services
  private modelProvider: ModelProviderService;
  private strategyService: ResearchStrategyService;
  private webResearchService: WebResearchService;
  private comprehensiveService: ComprehensiveResearchService;
  private evaluationService: EvaluationService;
  private paradigmService: ParadigmResearchService;
  private memoryService: ResearchMemoryService;
  private contextEngineering: ContextEngineeringService;
  // private functionCallingService: FunctionCallingService;
  // private researchToolsService: ResearchToolsService;
  private paradigmClassifier: ParadigmClassifier;
  private databaseService: DatabaseService | null = null;

  // Context layer services
  private writeLayer: WriteLayerService;
  private selectLayer: SelectLayerService;
  private compressLayer: CompressLayerService;
  private isolateLayer: IsolateLayerService;

  // State
  private lastParadigmProbabilities: ParadigmProbabilities | null = null;

  private constructor() {
    // Initialize all services
    this.modelProvider = ModelProviderService.getInstance();
    this.strategyService = ResearchStrategyService.getInstance();
    this.webResearchService = WebResearchService.getInstance();
    this.comprehensiveService = ComprehensiveResearchService.getInstance();
    this.evaluationService = EvaluationService.getInstance();
    this.paradigmService = ParadigmResearchService.getInstance();
    this.memoryService = ResearchMemoryService.getInstance();
    this.contextEngineering = ContextEngineeringService.getInstance();
    this.paradigmClassifier = ParadigmClassifier.getInstance();

    // Initialize context layer services
    this.writeLayer = WriteLayerService.getInstance();
    this.selectLayer = SelectLayerService.getInstance();
    this.compressLayer = CompressLayerService.getInstance();
    this.isolateLayer = IsolateLayerService.getInstance();

    // Initialize database service if available (server-side only)
    try {
      this.databaseService = DatabaseService.getInstance();
    } catch (error) {
      console.log('Database service not available (client-side context)');
      this.databaseService = null;
    }
  }

  public static getInstance(): ResearchAgentService {
    if (!ResearchAgentService.instance) {
      ResearchAgentService.instance = new ResearchAgentService();
    }
    return ResearchAgentService.instance;
  }

  /**
   * Main public API - Generate text using the specified model
   */
  async generateText(
    prompt: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<{ text: string; sources?: Citation[] }> {
    return this.modelProvider.generateText(prompt, model, effort, onProgress);
  }

  /**
   * Generate search queries
   */
  async generateSearchQueries(
    userQuery: string,
    model: ModelType,
    effort: EffortType
  ): Promise<string[]> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.generateSearchQueries(userQuery, model, effort, generateText);
  }

  /**
   * Perform web research
   */
  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType
  ): Promise<{ aggregatedFindings: string; allSources: Citation[] }> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.performWebResearch(queries, model, effort, generateText);
  }

  /**
   * Generate final answer
   */
  async generateFinalAnswer(
    userQuery: string,
    context: string,
    model: ModelType,
    _useSearch: boolean,
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.generateFinalAnswer(userQuery, context, model, effort, generateText);
  }

  /**
   * Perform reflection
   */
  async performReflection(
    findings: string,
    userQuery: string,
    model: ModelType,
    effort: EffortType
  ): Promise<string> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.performReflection(findings, userQuery, model, effort, generateText);
  }

  /**
   * Main query processing pipeline
   */
  async processQuery(
    query: string,
    model: ResearchModel = GENAI_MODEL_FLASH,
    metadata?: { phase?: ResearchPhase; onProgress?: (message: string) => void }
  ): Promise<ResearchResponse & {
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    contextLayers?: ContextLayer[];
  }> {
    try {
      // Detect paradigm
      const paradigmProbs = await this.paradigmClassifier.classify(query);
      const dominantParadigms = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominantParadigms[0] || 'bernard';

      // Store for later use
      this.lastParadigmProbabilities = paradigmProbs;

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Create enhanced onProgress that tracks layers
      const enhancedOnProgress = (message: string) => {
        metadata?.onProgress?.(message);

        // Emit layer-specific progress
        if (message.includes('Writing') || message.includes('memory')) {
          metadata?.onProgress?.('layer_progress:write');
        } else if (message.includes('Selecting') || message.includes('sources')) {
          metadata?.onProgress?.('layer_progress:select');
        } else if (message.includes('Compressing') || message.includes('synthesis')) {
          metadata?.onProgress?.('layer_progress:compress');
        } else if (message.includes('Isolating') || message.includes('analysis')) {
          metadata?.onProgress?.('layer_progress:isolate');
        }
      };

      // Execute context layers explicitly for better progress tracking
      let layerResults: any = {};

      for (const layer of contextLayers) {
        metadata?.onProgress?.(`layer_progress:${layer}`);
        metadata?.onProgress?.(`Executing ${layer} layer for ${paradigm} paradigm...`);

        try {
          switch (layer) {
            case 'write':
              this.writeLayer.write('query_context', { query, paradigm, phase }, contextDensity.averageDensity || 50, paradigm);
              layerResults.writeLayer = 'completed';
              break;

            case 'select':
              // Get some initial sources for selection (from memory or previous research)
              const cachedSources = this.memoryService.getCachedSources(query) || [];
              const selectedSources = await this.selectLayer.selectSources(query, cachedSources, paradigm, 5);
              layerResults.selectedSources = selectedSources;
              break;

            case 'compress':
              if (layerResults.selectedSources && layerResults.selectedSources.length > 0) {
                metadata?.onProgress?.('Compressing research for synthesis phase');
                const sourcesText = layerResults.selectedSources.map((s: any) => s.snippet || s.title || '').join(' ');
                const compressed = this.compressLayer.compress(sourcesText, Math.round(contextDensity.averageDensity || 50), paradigm);
                layerResults.compressedContent = compressed;
                metadata?.onProgress?.('Research compression complete, moving to quality evaluation');
              }
              break;

            case 'isolate':
              // Isolate execution context for analysis-heavy paradigms
              const isolationResult = await this.isolateLayer.isolate(query, paradigm, {
                content: layerResults.compressedContent || query,
                sources: layerResults.selectedSources || []
              }, async (task: string, context: any) => {
                // Simple analysis function for the isolation layer
                return `Analyzed task: ${task} with context: ${JSON.stringify(context, null, 2)}`;
              });
              layerResults.isolatedAnalysis = isolationResult;
              break;
          }
        } catch (error) {
          console.warn(`Layer ${layer} execution failed:`, error);
          // Continue with other layers even if one fails
        }

        // Brief delay for UX
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Route query using research strategy with timeout protection
      const researchPromise = this.routeResearchQuery(query, model, EffortType.MEDIUM, enhancedOnProgress);
      const timeoutPromise = new Promise<EnhancedResearchResults>((_, reject) => {
        setTimeout(() => {
          enhancedOnProgress('Research taking longer than expected, finalizing results...');
          reject(new Error('Research timeout'));
        }, 60000); // 60-second timeout
      });

      // Race the research against the timeout
      let result: EnhancedResearchResults;
      try {
        result = await Promise.race([researchPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Research timed out, proceeding with partial results');
        // Attempt to get partial results by setting progress to next phase
        enhancedOnProgress('quality evaluation of partial results');
        // Return minimal result structure to prevent UI hanging
        result = {
          synthesis: 'Research operation timed out. Please try again with a more specific query.',
          sources: [],
          queryType: 'unknown',
          confidenceScore: 0.1
        };
      }

      // Create response in the expected format
      const response: ResearchResponse = {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };

      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity: {
          phase: phase,
          density: contextDensity.averageDensity || 0.5
        },
        contextLayers
      };
    } catch (error) {
      console.error('Error processing query:', error);
      // Propagate error so that the UI shows proper feedback instead of silently failing
      throw error;
    }
  }

  /**
   * Route research query based on type and paradigm
   */
  async routeResearchQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const startTime = Date.now();

    // Check cache first
    onProgress?.('tool_used:memory_cache');
    const cachedResult = this.memoryService.getCachedResult(query);
    if (cachedResult) {
      onProgress?.('Found cached research result.');
      return cachedResult;
    }

    // Classify query
    onProgress?.('tool_used:query_classification');
    const queryType = this.strategyService.classifyQueryType(query);
    onProgress?.(`Query classified as: ${queryType}`);

    // Determine paradigm
    onProgress?.('tool_used:paradigm_detection');
    const paradigm = await this.paradigmService.determineHostParadigm(query);

    let result: EnhancedResearchResults;

    // Route based on paradigm and query type
    if (paradigm) {
      onProgress?.(`Routing to ${paradigm} paradigm research...`);
      onProgress?.('tool_used:paradigm_research');
      result = await this.paradigmService.performHostBasedResearch(
        query,
        paradigm,
        queryType,
        model,
        effort,
        onProgress
      );
    } else {
      // Fall back to query type routing
      onProgress?.(`Routing to ${queryType} research strategy...`);
      onProgress?.('tool_used:strategy_routing');

      const response = await this.strategyService.handleQuery(
        query,
        queryType,
        model,
        effort,
        this.performComprehensiveResearch.bind(this),
        this.performResearchWithEvaluation.bind(this),
        onProgress
      );

      // Convert response to EnhancedResearchResults
      result = {
        synthesis: response.text,
        sources: response.sources.map(s => ({
          url: s.url,
          title: s.name,
          snippet: s.snippet,
          relevanceScore: s.relevanceScore,
          accessed: new Date().toISOString()
        })),
        queryType,
        confidenceScore: 0.75
      };
    }

    // Add explicit progress message to trigger 60% update in UI
    onProgress?.('Evaluating research quality and self-healing if needed');

    // Calculate confidence score
    result.confidenceScore = ResearchUtilities.calculateConfidenceScore(result);

    // Attempt self-healing if needed
    if (ResearchUtilities.needsSelfHealing(result)) {
      // Ensure we provide the correct dependencies for self-healing
      const webResearchFunction = async (queries: string[], model: ModelType, effort: EffortType) => {
        return this.performWebResearch(queries, model, effort);
      };

      const generateTextFunction = async (prompt: string, model: ModelType, effort: EffortType) => {
        return this.generateText(prompt, model, effort);
      };

      result = await this.evaluationService.attemptSelfHealing(
        query,
        result,
        model,
        effort,
        onProgress,
        webResearchFunction,
        generateTextFunction
      );
    }

    // Add metadata
    const processingTime = Date.now() - startTime;
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      processingTime,
      paradigmProbabilities: this.lastParadigmProbabilities || undefined,
      cacheHit: false
    };

    // Cache the result
    this.memoryService.cacheResult(query, result, paradigm || undefined);

    return result;
  }

  /**
   * Perform comprehensive research
   */
  async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('tool_used:comprehensive_research');
    const result = await this.comprehensiveService.performComprehensiveResearch(
      query,
      model,
      effort,
      onProgress
    );
    
    // Signal completion and transition to quality evaluation phase
    onProgress?.('Comprehensive research completed, evaluating quality');
    
    return result;
  }

  /**
   * Perform research with evaluation
   */
  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    // First run comprehensive research
    const result = await this.performComprehensiveResearch(
      query,
      model,
      effort,
      onProgress
    );

    // Evaluate the synthesis quality
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    const evaluation = await this.evaluationService.evaluateResearch(
      {
        query,
        synthesis: result.synthesis,
        searchResults: result.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort,
      generateText
    );

    // Attach evaluation metadata
    result.evaluationMetadata = evaluation;
    return result;
  }

  /**
   * Evaluate research quality
   */
  async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ): Promise<any> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);
    return this.evaluationService.evaluateResearch(state, model, effort, generateText);
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelType[] {
    return this.modelProvider.getAvailableModels();
  }

  /**
   * Semantic search using vector store
   */
  async semanticSearch(query: string, sessionId?: string): Promise<ResearchState[]> {
    if (!this.databaseService) {
      console.warn('Database service not available for semantic search');
      return [];
    }

    try {
      // Search for similar research steps
      const similarSteps = await this.databaseService.semanticSearch(query, sessionId, 10);

      // Convert ResearchStep objects to ResearchState objects
      return similarSteps.map(step => this.convertStepToState(step));
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Store research state in vector store
   */
  async storeResearchState(
    state: ResearchState,
    sessionId: string,
    parentId?: string
  ): Promise<void> {
    if (!this.databaseService) {
      console.warn('Database service not available for storing research state');
      return;
    }

    try {
      // Convert ResearchState to ResearchStep for storage
      const step = this.convertStateToStep(state);

      // Store additional metadata separately
      const enhancedMetadata = {
        ...step.metadata,
        refinementCount: state.refinementCount,
        evaluation: state.evaluation,
        model: GENAI_MODEL_FLASH as ModelType,
        effort: EffortType.MEDIUM
      } as any;

      // Update step with enhanced metadata
      step.metadata = enhancedMetadata;

      // Save to database with AI enhancements (embeddings)
      await this.databaseService.saveResearchStepWithAI(sessionId, step, parentId);
    } catch (error) {
      console.error('Store research state error:', error);
      throw error;
    }
  }

  /**
   * Generate with Azure OpenAI
   */
  async generateWithAzureOpenAI(
    prompt: string,
    _options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{ text: string; sources?: Citation[] }> {
    // Delegate to model provider
    return this.modelProvider.generateText(
      prompt,
      'azure-o3' as ModelType,
      EffortType.MEDIUM
    );
  }

  /**
   * Get memory statistics
   */
  getMemoryStatistics() {
    return this.memoryService.getStatistics();
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.memoryService.clearAll();
  }

  /**
   * Convert ResearchStep to ResearchState
   */
  private convertStepToState(step: ResearchStep): ResearchState {
    const metadata = step.metadata || {};

    return {
      query: step.title || '',
      searchResults: step.sources || [],
      synthesis: typeof step.content === 'string' ? step.content : '',
      evaluation: (metadata as any).evaluation || {
        quality: 'good',
        completeness: 0.8,
        accuracy: 0.9,
        clarity: 0.85
      },
      sections: (metadata as any).sections || [],
      refinementCount: (metadata as any).refinementCount || 0
    };
  }

  /**
   * Convert ResearchState to ResearchStep
   */
  private convertStateToStep(state: ResearchState): ResearchStep {
    // Determine step type based on state characteristics
    const stepType = this.determineStepType(state);

    return {
      id: crypto.randomUUID(),
      type: stepType,
      title: state.query,
      content: state.synthesis,
      icon: 'DocumentMagnifyingGlassIcon' as any, // Default icon
      timestamp: new Date().toISOString(),
      sources: state.searchResults,
      metadata: {
        model: GENAI_MODEL_FLASH as ModelType,
        effort: EffortType.MEDIUM,
        paradigmProbabilities: this.lastParadigmProbabilities || undefined
      } as ResearchMetadata
    };
  }

  /**
   * Determine ResearchStepType based on ResearchState
   */
  private determineStepType(state: ResearchState): ResearchStepType {
    // If it has been refined, it's iterative
    if (state.refinementCount > 0) {
      return ResearchStepType.REFLECTION;
    }

    // If it has multiple sections, it's comprehensive
    if (state.sections && state.sections.length > 3) {
      return ResearchStepType.FINAL_ANSWER;
    }

    // If evaluation shows high quality, it's detailed
    if (state.evaluation.quality === 'excellent') {
      return ResearchStepType.SEARCHING_FINAL_ANSWER;
    }

    // Default to search
    return ResearchStepType.WEB_RESEARCH;
  }
}
