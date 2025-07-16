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
  GENAI_MODEL_FLASH
} from '../types';
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
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    return this.modelProvider.generateText(prompt, model, effort);
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
    metadata?: { phase?: ResearchPhase }
  ): Promise<ResearchResponse & {
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    contextLayers?: ContextLayer[];
  }> {
    try {
      // Detect paradigm
      const paradigmProbs = this.paradigmClassifier.classify(query);
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

      // Route query using research strategy
      const result = await this.routeResearchQuery(query, model, EffortType.MEDIUM);

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
      return {
        text: 'An error occurred while processing your query.',
        sources: [],
        paradigmProbabilities: { dolores: 0.25, teddy: 0.25, bernard: 0.25, maeve: 0.25 }
      };
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
    const cachedResult = this.memoryService.getCachedResult(query);
    if (cachedResult) {
      onProgress?.('Found cached research result.');
      return cachedResult;
    }

    // Classify query
    const queryType = this.strategyService.classifyQueryType(query);
    onProgress?.(`Query classified as: ${queryType}`);

    // Determine paradigm
    const paradigm = await this.paradigmService.determineHostParadigm(query);

    let result: EnhancedResearchResults;

    // Route based on paradigm and query type
    if (paradigm) {
      onProgress?.(`Routing to ${paradigm} paradigm research...`);
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

      const response = await this.strategyService.handleQuery(
        query,
        queryType,
        model,
        effort,
        this.performComprehensiveResearch.bind(this),
        this.performResearchWithEvaluation.bind(this)
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

    // Calculate confidence score
    result.confidenceScore = ResearchUtilities.calculateConfidenceScore(result);

    // Attempt self-healing if needed
    if (ResearchUtilities.needsSelfHealing(result)) {
      result = await this.evaluationService.attemptSelfHealing(
        query,
        result,
        model,
        effort,
        onProgress,
        this.performWebResearch.bind(this),
        this.generateText.bind(this)
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
    return this.comprehensiveService.performComprehensiveResearch(
      query,
      model,
      effort,
      onProgress
    );
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
   * Semantic search (placeholder)
   */
  async semanticSearch(_query: string, _sessionId?: string): Promise<ResearchState[]> {
    // TODO: Implement when vector store is available
    return [];
  }

  /**
   * Store research state (placeholder)
   */
  async storeResearchState(
    _step: ResearchState,
    _sessionId: string,
    _parentId?: string
  ): Promise<void> {
    // TODO: Implement when vector store is available
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
}
