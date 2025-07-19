/**
 * Research Agent Service - Refactored
 * Main orchestrator/facade for all research operations
 */

import {
  ModelType,
  EffortType,
  QueryType,
  HostParadigm,
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
import {
  ContextLayerExecutionContext,
  ContextLayerResult
} from './contextLayers/types';

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
import { SchedulingService } from './contextLayers/schedulingService';

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
  private schedulingService: SchedulingService;

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
    this.schedulingService = SchedulingService.getInstance();

    // Initialize database service if available (server-side only)
    try {
      this.databaseService = DatabaseService.getInstance();
    } catch (error) {
      console.log('Database service not available (client-side context)');
      this.databaseService = null;
    }
  }

  /**
   * Execute a specific context layer operation with proper data flow
   */
  private async executeContextLayer(
    layer: ContextLayer,
    context: ContextLayerExecutionContext
  ): Promise<ContextLayerResult> {
    const { query, paradigm, density, layerResults = {}, sources, content, model, effort, onProgress } = context;

    try {
      switch (layer) {
        case 'write': {
          onProgress?.(`[${paradigm}] Writing reveries to memory banks...`);
          this.writeLayer.write('query_context', {
            query,
            paradigm,
            timestamp: Date.now(),
            phase: this.contextEngineering.inferResearchPhase(query)
          }, density, paradigm);

          if (content) {
            this.writeLayer.write('initial_insights', content, density, paradigm);
          }

          return { written: true, timestamp: Date.now() };
        }
        case 'select': {
          onProgress?.(`[${paradigm}] Selecting relevant memories and tools...`);
          const recommendedTools = this.selectLayer.recommendTools(paradigm);
          const availableSources = layerResults.selectedSources || sources || this.memoryService.getCachedSources(query) || [];
          if (availableSources.length > 0) {
            const k = Math.max(5, Math.ceil(density / 10));
            const selectedSources = await this.selectLayer.selectSources(query, availableSources, paradigm, k);
            return { selectedSources, recommendedTools };
          }
          return { recommendedTools, selectedSources: [] };
        }
        case 'compress': {
          onProgress?.(`[${paradigm}] Compressing narrative threads...`);
          const sourceContent = layerResults.selectedSources
            ? layerResults.selectedSources.map((s: Citation) => `${s.title || s.name}: ${s.snippet || s.url}`).join('\n\n')
            : content || query;
          const estimatedTokens = this.compressLayer.estimateTokens(sourceContent);
          const targetTokens = Math.max(
            50,
            Math.round(estimatedTokens * (density / 100))
          );
          const compressTaskId = `compress-${paradigm}-${Date.now()}`;
          this.schedulingService.addTask(
            compressTaskId,
            2,
            paradigm,
            async () => {
              const compressed = this.compressLayer.compress(sourceContent, targetTokens, paradigm);
              return { compressed, compressedContent: compressed, targetTokens };
            },
            2
          );
          await new Promise(resolve => setTimeout(resolve, 100));
          const task = this.schedulingService.getTaskStatus(compressTaskId);
          if (task?.status === 'completed' && task.result) {
            return task.result;
          }
          const compressed = this.compressLayer.compress(sourceContent, targetTokens, paradigm);
          return { compressed, compressedContent: compressed, targetTokens };
        }
        case 'isolate': {
          onProgress?.(`[${paradigm}] Isolating consciousness for focused analysis...`);
          const isolationContext = {
            content: layerResults.compressedContent || layerResults.compressed || content || query,
            sources: layerResults.selectedSources || sources || [],
            model,
            effort,
            density,
            paradigm
          };
          const isolateTaskId = `isolate-${paradigm}-${Date.now()}`;
          this.schedulingService.addTask(
            isolateTaskId,
            4,
            paradigm,
            async () => {
              const taskId = await this.isolateLayer.isolate(
                query,
                paradigm,
                isolationContext,
                async (task: string, ctx: Record<string, unknown>) => {
                  const generateText = this.modelProvider.generateText.bind(this.modelProvider);
                  if (paradigm === 'bernard' || paradigm === 'maeve') {
                    const subQueries = await this.webResearchService.generateSearchQueries(task, ctx.model as ModelType, ctx.effort as EffortType, generateText);
                    const subResearch = await this.webResearchService.performWebResearch(subQueries, ctx.model as ModelType, ctx.effort as EffortType, generateText);
                    return {
                      task,
                      analysis: subResearch.aggregatedFindings,
                      sources: subResearch.allSources,
                      paradigm: ctx.paradigm
                    };
                  }
                  return {
                    task,
                    analysis: `Focused analysis for ${paradigm}: ${task}`,
                    paradigm: ctx.paradigm
                  };
                }
              );
              const isolatedResult = await this.isolateLayer.waitForTask(taskId, 30000);
              return { taskId, isolatedResult, status: 'completed' };
            },
            3
          );
          await new Promise(resolve => setTimeout(resolve, 200));
          const scheduledTask = this.schedulingService.getTaskStatus(isolateTaskId);
          if (scheduledTask?.status === 'completed' && scheduledTask.result) {
            return scheduledTask.result;
          } else if (scheduledTask?.status === 'running') {
            return {
              taskId: isolateTaskId,
              status: 'running',
              message: 'Isolation task scheduled and running asynchronously'
            };
          }
          try {
            const directResult = await this.isolateLayer.isolate(
              query,
              paradigm,
              isolationContext,
              async (task: string) => ({
                task,
                analysis: `Direct isolation analysis for ${paradigm}`,
                paradigm
              })
            );
            return {
              taskId: directResult,
              status: 'direct_execution',
              message: 'Executed directly without scheduling'
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : 'Isolation failed',
              status: 'failed'
            };
          }
        }
        default:
          return { error: "Unknown context layer", layer, paradigm };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(`[${paradigm}] ${layer} layer failed: ${errorMessage}`);
      return {
        error: errorMessage,
        layer,
        paradigm,
        fallback: this.getFallbackForLayer(layer, paradigm)
      };
    }
  }

  /**
   * Get fallback behavior for failed layers
   */
  private getFallbackForLayer(layer: ContextLayer, paradigm: HostParadigm): any {
    switch (layer) {
      case 'write':
        return { written: false, reason: 'Memory write failed, continuing without persistence' };
      case 'select':
        return {
          selectedSources: [],
          recommendedTools: this.selectLayer.recommendTools(paradigm)
        };
      case 'compress':
        return { compressed: null, reason: 'Compression failed, using original content' };
      case 'isolate':
        return {
          isolatedResult: null,
          reason: 'Isolation failed, proceeding with standard analysis'
        };
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

      // Process through context layers using paradigm-specific sequence
      const contextLayers = this.contextEngineering.getLayerSequence(paradigm);

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

      // Execute context layers with proper data flow
      const layerResults: Record<string, ContextLayerResult> = {};

      for (const layer of contextLayers) {
        metadata?.onProgress?.(`layer_progress:${layer}`);
        metadata?.onProgress?.(`Executing ${layer} layer for ${paradigm} paradigm...`);

        const layerResult = await this.executeContextLayer(layer, {
          query,
          paradigm,
          density: contextDensity.averageDensity || 50,
          layerResults,
          sources: undefined,
          content: undefined,
          model: model.model,
          effort: model.effort,
          onProgress: metadata?.onProgress,
        });

        if (layerResult && !layerResult.error) {
          layerResults[layer] = layerResult;
          console.log(`[${paradigm}] ${layer} layer completed:`, {
            hasResult: !!layerResult,
            resultKeys: Object.keys(layerResult),
          });
        } else if (layerResult?.error) {
          console.warn(`[${paradigm}] ${layer} layer error:`, layerResult.error);
          if (layerResult.fallback) {
            layerResults[layer] = layerResult.fallback;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Add layer results to metadata
      const enhancedMetadata: any = {
        phase: metadata?.phase,
        onProgress: metadata?.onProgress,
        contextLayers: {
          executed: contextLayers,
          results: layerResults,
          paradigm,
          density: contextDensity,
        },
      };

      // Route query based on type
      let response: ResearchResponse;

      // When calling research methods, pass the enhanced metadata
      const queryType = this.strategyService.classifyQueryType(query);
      if (queryType === "factual") {
        response = await this.paradigmService.performHostBasedResearch(
          query,
          paradigm,
          queryType,
          model.model,
          model.effort,
          enhancedMetadata.onProgress
        );
      } else {
        response = await this.strategyService.handleQuery(
          query,
          queryType,
          model.model,
          model.effort,
          this.performComprehensiveResearch.bind(this),
          this.performResearchWithEvaluation.bind(this),
          enhancedMetadata.onProgress
        );
      }

      // Include context layer info in final response
      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity,
        contextLayers,
        layerResults,
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

    // CRITICAL: Add explicit progress message to trigger 60% update in UI
    onProgress?.('Evaluating research quality and self-healing if needed');
    onProgress?.('Research evaluation phase initiated');

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
   * Execute research with timeout extension mechanism
   */
  private async executeWithTimeoutExtension(
    researchPromise: Promise<EnhancedResearchResults>,
    query: string,
    paradigm: string,
    phase: ResearchPhase,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const baseTimeout = this.calculateAdaptiveTimeout(query, paradigm, phase);
    let currentTimeout = baseTimeout;
    let extensionCount = 0;
    const maxExtensions = 3;

    onProgress?.(`Initiating research with ${Math.round(currentTimeout/1000)}s adaptive timeout`);

    while (extensionCount <= maxExtensions) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Research timeout'));
        }, currentTimeout);
      });

      try {
        const result = await Promise.race([researchPromise, timeoutPromise]);
        return result; // Success - return the result
      } catch (error) {
        extensionCount++;

        if (extensionCount > maxExtensions) {
          console.warn(`Research timed out after ${maxExtensions} extensions, proceeding with partial results`);
          // CRITICAL FIX: Ensure progress advances past 40% by sending evaluation signal
          onProgress?.('Research timeout occurred, transitioning to quality evaluation phase');
          onProgress?.('Evaluating available partial research results');
          // Return minimal result structure to prevent UI hanging
          return {
            synthesis: `Research operation required more time than available. The query "${query}" may be too complex or broad. Please try a more specific query.`,
            sources: [],
            queryType: 'factual' as QueryType,
            confidenceScore: 0.1
          };
        }

        // Extend timeout for complex operations
        const extraTime = Math.min(baseTimeout * 0.5, 120000); // add 50% (≤2 min)
        currentTimeout += extraTime;

        onProgress?.(`Research needs more time, extending timeout by ${Math.round(extraTime/1000)}s (attempt ${extensionCount}/${maxExtensions})`);
        onProgress?.('Continuing research with extended timeout...');

        // Continue the loop with extended timeout
      }
    }

    // Should never reach here due to the logic above, but TypeScript safety
    throw new Error('Unexpected timeout extension state');
  }

  /**
   * Calculate adaptive timeout based on query complexity and paradigm
   */
  private calculateAdaptiveTimeout(query: string, paradigm: string, phase: ResearchPhase): number {
    // Base timeout for different phases
    const baseTimeouts = {
      discovery: 120000,    // 2 minutes
      exploration: 180000,  // 3 minutes
      synthesis: 240000,    // 4 minutes
      validation: 150000    // 2.5 minutes
    };

    let timeout = baseTimeouts[phase] || 180000;

    // Adjust based on query complexity
    const queryWords = query.split(/\s+/).length;
    const complexityMultiplier = Math.min(1 + (queryWords - 5) * 0.1, 2.0); // Max 2x for very complex queries
    timeout *= complexityMultiplier;

    // Adjust based on paradigm requirements
    const paradigmMultipliers = {
      bernard: 1.5,  // Analytical paradigm needs more time
      dolores: 1.2,  // Self-aware paradigm moderately complex
      maeve: 1.3,    // Strategic paradigm needs coordination time
      teddy: 1.0     // Narrative paradigm is straightforward
    };

    timeout *= paradigmMultipliers[paradigm as keyof typeof paradigmMultipliers] || 1.0;

    // Ensure reasonable bounds (30s minimum, 8 minutes maximum)
    return Math.max(30000, Math.min(timeout, 480000));
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
