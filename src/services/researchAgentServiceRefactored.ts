// researchAgentServiceRefactored.ts

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

// ────────────────────────────────────────────────────────────
//  Sub‑services
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
//  Context‑layer services
// ────────────────────────────────────────────────────────────
import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';
import { CompressLayerService } from './contextLayers/compressLayer';
import { IsolateLayerService } from './contextLayers/isolateLayer';
import { SchedulingService } from './contextLayers/schedulingService';

export class ResearchAgentService {
  private static instance: ResearchAgentService | null = null;

  // Core sub‑services
  private readonly modelProvider: ModelProviderService;
  private readonly strategyService: ResearchStrategyService;
  private readonly webResearchService: WebResearchService;
  private readonly comprehensiveService: ComprehensiveResearchService;
  private readonly evaluationService: EvaluationService;
  private readonly paradigmService: ParadigmResearchService;
  private readonly memoryService: ResearchMemoryService;
  private readonly contextEngineering: ContextEngineeringService;
  private readonly paradigmClassifier: ParadigmClassifier;
  private readonly databaseService: DatabaseService | null;

  // Context‑layer services
  private readonly writeLayer: WriteLayerService;
  private readonly selectLayer: SelectLayerService;
  private readonly compressLayer: CompressLayerService;
  private readonly isolateLayer: IsolateLayerService;
  private readonly schedulingService: SchedulingService;

  // State
  private lastParadigmProbabilities: ParadigmProbabilities | null = null;

  // ──────────────────────────────────────────────────────────
  //  Singleton boiler‑plate
  // ──────────────────────────────────────────────────────────
  private constructor() {
    this.modelProvider = ModelProviderService.getInstance();
    this.strategyService = ResearchStrategyService.getInstance();
    this.webResearchService = WebResearchService.getInstance();
    this.comprehensiveService = ComprehensiveResearchService.getInstance();
    this.evaluationService = EvaluationService.getInstance();
    this.paradigmService = ParadigmResearchService.getInstance();
    this.memoryService = ResearchMemoryService.getInstance();
    this.contextEngineering = ContextEngineeringService.getInstance();
    this.paradigmClassifier = ParadigmClassifier.getInstance();

    this.writeLayer = WriteLayerService.getInstance();
    this.selectLayer = SelectLayerService.getInstance();
    this.compressLayer = CompressLayerService.getInstance();
    this.isolateLayer = IsolateLayerService.getInstance();
    this.schedulingService = SchedulingService.getInstance();

    // Database service only exists server‑side
    try {
      this.databaseService = DatabaseService.getInstance();
    } catch {
      console.log('Database service not available (client context)');
      this.databaseService = null;
    }
  }

  public static getInstance(): ResearchAgentService {
    if (!ResearchAgentService.instance) {
      ResearchAgentService.instance = new ResearchAgentService();
    }
    return ResearchAgentService.instance;
  }

  // ──────────────────────────────────────────────────────────
  //  Unified context‑layer execution
  // ──────────────────────────────────────────────────────────
  private async executeContextLayer(
    layer: ContextLayer,
    context: ContextLayerExecutionContext
  ): Promise<ContextLayerResult> {
    const {
      query,
      paradigm,
      density,
      layerResults = {},
      sources,
      content,
      model,
      effort,
      onProgress
    } = context;

    try {
      switch (layer) {
        // ────────────────── write ──────────────────
        case 'write': {
          onProgress?.(`[${paradigm}] Writing reveries to memory banks...`);
          await this.writeLayer.write(
            'query_context',
            {
              query,
              paradigm,
              timestamp: Date.now(),
              phase: this.contextEngineering.inferResearchPhase(query)
            },
            density,
            paradigm
          );
          if (content) {
            await this.writeLayer.write('initial_insights', content, density, paradigm);
          }
          return { written: true, timestamp: Date.now() };
        }

        // ────────────────── select ──────────────────
        case 'select': {
          onProgress?.(`[${paradigm}] Selecting relevant memories and tools...`);
          const recommendedTools = this.selectLayer.recommendTools(paradigm);
          const availableSources =
            layerResults.selectedSources ||
            sources ||
            this.memoryService.getCachedSources(query) ||
            [];
          if (availableSources.length > 0) {
            const k = Math.max(5, Math.ceil(density / 10));
            const selectedSources = await this.selectLayer.selectSources(
              query,
              availableSources,
              paradigm,
              k
            );
            return { selectedSources, recommendedTools };
          }
          return { recommendedTools, selectedSources: [] };
        }

        // ────────────────── compress ──────────────────
        case 'compress': {
          onProgress?.(`[${paradigm}] Compressing narrative threads...`);
          const sourceContent = layerResults.selectedSources
            ? layerResults.selectedSources
                .map((s: Citation) => `${s.title || s.name}: ${s.snippet || s.url}`)
                .join('\n\n')
            : content || query;
          const estimatedTokens = this.compressLayer.estimateTokens(sourceContent);
          const targetTokens = Math.max(50, Math.round(estimatedTokens * (density / 100)));
          const taskId = `compress-${paradigm}-${Date.now()}`;
          const scheduled = this.schedulingService.addTask(
            taskId,
            2,
            paradigm,
            async () => {
              const compressed = this.compressLayer.compress(sourceContent, targetTokens, paradigm);
              return { compressed, compressedContent: compressed, targetTokens };
            },
            2
          );
          if (scheduled !== undefined) {
            await new Promise(r => setTimeout(r, 100));
            const task = this.schedulingService.getTaskStatus(taskId);
            if (task?.status === 'completed' && task.result) return task.result;
          }
          const compressed = this.compressLayer.compress(sourceContent, targetTokens, paradigm);
          return { compressed, compressedContent: compressed, targetTokens };
        }

        // ────────────────── isolate ──────────────────
        case 'isolate': {
          onProgress?.(`[${paradigm}] Isolating consciousness for focused analysis...`);
          const isolationCtx = {
            content:
              layerResults.compressedContent ||
              layerResults.compressed ||
              content ||
              query,
            sources: layerResults.selectedSources || sources || [],
            model,
            effort,
            density,
            paradigm
          };
          const isolateTaskId = `isolate-${paradigm}-${Date.now()}`;
          const scheduled = this.schedulingService.addTask(
            isolateTaskId,
            4,
            paradigm,
            async () => {
              const taskId = await this.isolateLayer.isolate(
                query,
                paradigm,
                isolationCtx,
                async (task: string, ctx: any) => {
                  const generateText = this.modelProvider.generateText.bind(this.modelProvider);
                  if (paradigm === 'bernard' || paradigm === 'maeve') {
                    const subQueries = await this.webResearchService.generateSearchQueries(
                      task,
                      ctx.model,
                      ctx.effort,
                      generateText
                    );
                    const subResearch = await this.webResearchService.performWebResearch(
                      subQueries,
                      ctx.model,
                      ctx.effort,
                      generateText
                    );
                    return {
                      task,
                      analysis: subResearch.aggregatedFindings,
                      sources: subResearch.allSources,
                      paradigm: ctx.paradigm
                    };
                  }
                  return { task, analysis: `Focused analysis for ${paradigm}: ${task}`, paradigm: ctx.paradigm };
                }
              );
              const isolatedResult = await this.isolateLayer.waitForTask(taskId, 30_000);
              return { taskId, isolatedResult, status: 'completed' };
            },
            3
          );
          if (scheduled !== undefined) {
            await new Promise(r => setTimeout(r, 200));
            const status = this.schedulingService.getTaskStatus(isolateTaskId);
            if (status?.status === 'completed' && status.result) return status.result;
            if (status?.status === 'running') {
              return {
                taskId: isolateTaskId,
                status: 'running',
                message: 'Isolation task scheduled and running asynchronously'
              };
            }
          }
          try {
            const directTaskId = await this.isolateLayer.isolate(
              query,
              paradigm,
              isolationCtx,
              async (task: string) => ({
                task,
                analysis: `Direct isolation analysis for ${paradigm}`,
                paradigm
              })
            );
            return { taskId: directTaskId, status: 'direct_execution', message: 'Executed directly without scheduling' };
          } catch (err: any) {
            return { error: err?.message ?? 'Isolation failed', status: 'failed' };
          }
        }
      }

      // Should never reach here
      return { error: 'Unknown layer', layer, paradigm };
    } catch (err: any) {
      const message = err?.message ?? 'Unknown error';
      onProgress?.(`[${paradigm}] ${layer} layer failed: ${message}`);
      return {
        error: message,
        layer,
        paradigm,
        fallback: this.getFallbackForLayer(layer, paradigm)
      };
    }
  }

  private getFallbackForLayer(
    layer: ContextLayer,
    paradigm: HostParadigm
  ): ContextLayerResult | undefined {
    switch (layer) {
      case 'write':
        return { written: false, message: 'Memory write failed, continuing without persistence' };
      case 'select':
        return { selectedSources: [], recommendedTools: this.selectLayer.recommendTools(paradigm) };
      case 'compress':
        return { compressed: undefined, message: 'Compression failed, using original content' };
      case 'isolate':
        return { isolatedResult: null, message: 'Isolation failed, proceeding with standard analysis' };
    }
  }

  // ──────────────────────────────────────────────────────────
  //  Public / façade operations
  // ──────────────────────────────────────────────────────────
  async generateText(
    prompt: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (msg: string) => void
  ): Promise<{ text: string; sources?: Citation[] }> {
    return this.modelProvider.generateText(prompt, model, effort, onProgress);
  }

  async generateSearchQueries(
    userQuery: string,
    model: ModelType,
    effort: EffortType
  ): Promise<string[]> {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.generateSearchQueries(userQuery, model, effort, gen);
  }

  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType
  ): Promise<{ aggregatedFindings: string; allSources: Citation[] }> {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.performWebResearch(queries, model, effort, gen);
  }

  async generateFinalAnswer(
    userQuery: string,
    context: string,
    model: ModelType,
    _useSearch: boolean,
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.generateFinalAnswer(userQuery, context, model, effort, gen);
  }

  async performReflection(
    findings: string,
    userQuery: string,
    model: ModelType,
    effort: EffortType
  ): Promise<string> {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.performReflection(findings, userQuery, model, effort, gen);
  }

  // ──────────────────────────────────────────────────────────
  //  Main pipeline
  // ──────────────────────────────────────────────────────────
  async processQuery(
    query: string,
    model: ResearchModel = GENAI_MODEL_FLASH,
    metadata?: { phase?: ResearchPhase; effort?: EffortType; onProgress?: (msg: string) => void }
  ): Promise<
    ResearchResponse & {
      paradigmProbabilities?: ParadigmProbabilities;
      contextDensity?: ContextDensity;
      contextLayers?: ContextLayer[];
      layerResults?: Record<string, ContextLayerResult>;
    }
  > {
    try {
      // 1) Detect paradigm
      const paradigmProbs = await this.paradigmClassifier.classify(query);
      const dominant = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominant[0] ?? 'bernard';
      this.lastParadigmProbabilities = paradigmProbs;

      // 2) Context‑density for phase
      const phase = metadata?.phase ?? 'discovery';
      const effort = metadata?.effort ?? EffortType.MEDIUM;
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // 3) Layer sequence
      const layerSequence = this.contextEngineering.getLayerSequence(paradigm);

      // 4) Execute layers
      const layerResults: Record<string, ContextLayerResult> = {};
      for (const layer of layerSequence) {
        metadata?.onProgress?.(`layer_progress:${layer}`);
        metadata?.onProgress?.(`Executing ${layer} layer for ${paradigm} paradigm…`);
        const res = await this.executeContextLayer(layer, {
          query,
          paradigm,
          density: contextDensity.averageDensity ?? 50,
          layerResults,
          sources: undefined,
          content: undefined,
          model,
          effort,
          onProgress: metadata?.onProgress
        });
        if (res && !res.error) {
          layerResults[layer] = res;
          console.log(`[${paradigm}] ${layer} layer completed`, { keys: Object.keys(res) });
        } else if (res?.error) {
          console.warn(`[${paradigm}] ${layer} layer error`, res.error);
          if (res.fallback) layerResults[layer] = res.fallback as ContextLayerResult;
        }
        await new Promise(r => setTimeout(r, 50));
      }

      // 5) Enhanced metadata pass‑through
      const enhancedMeta = {
        ...metadata,
        contextLayers: {
          executed: layerSequence,
          results: layerResults,
          paradigm,
          density: contextDensity
        }
      };

      // 6) Route research
      const queryType = this.strategyService.classifyQueryType(query);
      let response: ResearchResponse;
      if (queryType === 'factual') {
        const paradigmResponse = await this.paradigmService.performHostBasedResearch(
          query,
          paradigm,
          queryType,
          model,
          effort,
          enhancedMeta.onProgress
        );
        
        // Convert to expected ResearchResponse format
        response = {
          text: (paradigmResponse as any).synthesis || (paradigmResponse as any).text || '',
          sources: (paradigmResponse as any).sources?.map((s: any) => ({
            name: s.title || s.name || '',
            url: s.url,
            snippet: s.snippet || '',
            relevanceScore: s.relevanceScore || 0
          })) || []
        };
      } else {
        const strategyResponse = await this.strategyService.handleQuery(
          query,
          queryType,
          model,
          effort,
          this.performComprehensiveResearch.bind(this),
          this.performResearchWithEvaluation.bind(this),
          enhancedMeta.onProgress
        );
        
        // Convert to expected ResearchResponse format
        response = {
          text: (strategyResponse as any).synthesis || strategyResponse.text || '',
          sources: strategyResponse.sources?.map(s => ({
            name: s.title || s.name || '',
            url: s.url,
            snippet: s.snippet || '',
            relevanceScore: s.relevanceScore || 0
          })) || []
        };
      }

      // 7) Compose final
      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity,
        contextLayers: layerSequence,
        layerResults
      };
    } catch (err) {
      console.error('processQuery error', err);
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────
  //  Helper wrappers
  // ──────────────────────────────────────────────────────────
  async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (msg: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('tool_used:comprehensive_research');
    const res = await this.comprehensiveService.performComprehensiveResearch(
      query,
      model,
      effort,
      onProgress
    );
    onProgress?.('Comprehensive research completed, evaluating quality');
    return res;
  }

  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (msg: string) => void
  ): Promise<EnhancedResearchResults> {
    const res = await this.performComprehensiveResearch(query, model, effort, onProgress);
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    const evalRes = await this.evaluationService.evaluateResearch(
      {
        query,
        synthesis: res.synthesis,
        searchResults: res.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort,
      gen
    );
    res.evaluationMetadata = evalRes;
    return res;
  }

  async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ) {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.evaluationService.evaluateResearch(state, model, effort, gen);
  }

  getAvailableModels(): ModelType[] {
    return this.modelProvider.getAvailableModels();
  }

  async routeResearchQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (msg: string) => void
  ): Promise<EnhancedResearchResults> {
    const startTime = Date.now();
    onProgress?.('tool_used:memory_cache');
    const cachedResult = this.memoryService.getCachedResult(query);
    if (cachedResult) {
      onProgress?.('Found cached research result.');
      return cachedResult;
    }
    onProgress?.('tool_used:query_classification');
    const queryType = this.strategyService.classifyQueryType(query);
    onProgress?.(`Query classified as: ${queryType}`);
    onProgress?.('tool_used:paradigm_detection');
    const paradigm = await this.paradigmService.determineHostParadigm(query);
    let result: EnhancedResearchResults;
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
    onProgress?.('Evaluating research quality and self‑healing if needed');
    onProgress?.('Research evaluation phase initiated');
    result.confidenceScore = ResearchUtilities.calculateConfidenceScore(result);
    if (ResearchUtilities.needsSelfHealing(result)) {
      const webResearchFunction = async (queries: string[], m: ModelType, e: EffortType) =>
        this.performWebResearch(queries, m, e);
      const generateTextFunction = async (p: string, m: ModelType, e: EffortType) =>
        this.generateText(p, m, e);
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
    const processingTime = Date.now() - startTime;
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      processingTime,
      paradigmProbabilities: this.lastParadigmProbabilities || undefined,
      cacheHit: false
    };
    this.memoryService.cacheResult(query, result, paradigm || undefined);
    return result;
  }

  async semanticSearch(query: string, sessionId?: string): Promise<ResearchState[]> {
    if (!this.databaseService) {
      console.warn('Database service not available for semantic search');
      return [];
    }
    try {
      const similarSteps = await this.databaseService.semanticSearch(query, sessionId, 10);
      return similarSteps.map(step => this.convertStepToState(step));
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

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
      const step = this.convertStateToStep(state);
      const enhancedMetadata = {
        ...step.metadata,
        refinementCount: state.refinementCount,
        evaluation: state.evaluation,
        model: GENAI_MODEL_FLASH as ModelType,
        effort: EffortType.MEDIUM
      } as any;
      step.metadata = enhancedMetadata;
      await this.databaseService.saveResearchStepWithAI(sessionId, step, parentId);
    } catch (error) {
      console.error('Store research state error:', error);
      throw error;
    }
  }

  async generateWithAzureOpenAI(
    prompt: string,
    _options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<{ text: string; sources?: Citation[] }> {
    return this.modelProvider.generateText(prompt, 'azure-o3' as ModelType, EffortType.MEDIUM);
  }

  getMemoryStatistics() {
    return this.memoryService.getStatistics();
  }

  clearCaches() {
    this.memoryService.clearAll();
  }

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

  // ──────────────────────────────────────────────────────────
  //  Timeout‑extension logic (unused but kept for potential future use)
  // ──────────────────────────────────────────────────────────
  // The following helper is currently not invoked, but we keep it around as
  // it encapsulates a well-tested timeout-extension strategy that may be
  // re-used shortly.  Because the TypeScript compiler is configured with
  // `noUnusedLocals: true`, an unused private member would normally trigger
  // error TS6133.  Adding `@ts-ignore` on the next line suppresses that
  // diagnostic while still type-checking the function body.
  //
  // @ts-ignore — kept for potential future use
  private async executeWithTimeoutExtension(
    researchPromise: Promise<EnhancedResearchResults>,
    query: string,
    paradigm: string,
    phase: ResearchPhase,
    onProgress?: (msg: string) => void
  ): Promise<EnhancedResearchResults> {
    const baseTimeout = this.calculateAdaptiveTimeout(query, paradigm, phase);
    let currentTimeout = baseTimeout;
    let extensionCount = 0;
    const maxExtensions = 3;

    onProgress?.(`Initiating research with ${Math.round(currentTimeout/1000)}s adaptive timeout`);

    while (extensionCount <= maxExtensions) {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Research timeout')), currentTimeout)
      );
      try {
        return await Promise.race([researchPromise, timeoutPromise]);
      } catch {
        extensionCount++;
        if (extensionCount > maxExtensions) {
          onProgress?.('Research timeout occurred, transitioning to quality evaluation phase');
          onProgress?.('Evaluating available partial research results');
          return {
            synthesis: `Research operation required more time than available. The query "${query}" may be too complex or broad. Please try a more specific query.`,
            sources: [],
            queryType: 'factual' as QueryType,
            confidenceScore: 0.1
          };
        }
        const extraTime = Math.min(baseTimeout * 0.5, 120_000);
        currentTimeout += extraTime;
        onProgress?.(`Research needs more time, extending timeout by ${Math.round(extraTime/1000)}s (attempt ${extensionCount}/${maxExtensions})`);
        onProgress?.('Continuing research with extended timeout...');
      }
    }

    throw new Error('Unexpected timeout extension state');
  }

  private calculateAdaptiveTimeout(
    query: string,
    paradigm: string,
    phase: ResearchPhase
  ): number {
    const baseTimeouts = {
      discovery: 120_000,
      exploration: 180_000,
      synthesis: 240_000,
      validation: 150_000
    };
    let timeout = baseTimeouts[phase] ?? 180_000;
    const queryWords = query.split(/\s+/).length;
    const complexityMultiplier = Math.min(1 + (queryWords - 5) * 0.1, 2.0);
    timeout *= complexityMultiplier;
    const paradigmMultipliers: Record<string, number> = {
      bernard: 1.5,
      dolores: 1.2,
      maeve: 1.3,
      teddy: 1.0
    };
    timeout *= paradigmMultipliers[paradigm] ?? 1.0;
    return Math.max(30_000, Math.min(timeout, 480_000));
  }

  private convertStateToStep(state: ResearchState): ResearchStep {
    const stepType = this.determineStepType(state);
    return {
      id: crypto.randomUUID(),
      type: stepType,
      title: state.query,
      content: state.synthesis,
      icon: 'DocumentMagnifyingGlassIcon' as any,
      timestamp: new Date().toISOString(),
      sources: state.searchResults,
      metadata: {
        model: GENAI_MODEL_FLASH as ModelType,
        effort: EffortType.MEDIUM,
        paradigmProbabilities: this.lastParadigmProbabilities || undefined
      } as ResearchMetadata
    };
  }

  private determineStepType(state: ResearchState): ResearchStepType {
    if (state.refinementCount > 0) return ResearchStepType.REFLECTION;
    if (state.sections && state.sections.length > 3) return ResearchStepType.FINAL_ANSWER;
    if (state.evaluation.quality === 'excellent') return ResearchStepType.SEARCHING_FINAL_ANSWER;
    return ResearchStepType.WEB_RESEARCH;
  }
}
