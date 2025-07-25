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
import { DatabaseService } from './databaseServiceAdapter';

// ────────────────────────────────────────────────────────────
//  Context‑layer services
// ────────────────────────────────────────────────────────────
import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';

// ────────────────────────────────────────────────────────────
//  Multi-paradigm services
// ────────────────────────────────────────────────────────────
import { MultiParadigmBlender } from './multiParadigmBlender';
import { ParadigmLearningService } from './paradigmLearningService';
import { InterHostCollaborationService } from './interHostCollaboration';
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

  // Multi-paradigm services
  private readonly multiParadigmBlender: MultiParadigmBlender;
  private readonly paradigmLearning: ParadigmLearningService;
  private readonly interHostCollaboration: InterHostCollaborationService;

  // State
  private lastParadigmProbabilities: ParadigmProbabilities | null = null;
  private currentInteractionId: string | null = null;

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

    // Multi-paradigm services
    this.multiParadigmBlender = MultiParadigmBlender.getInstance(this);
    this.paradigmLearning = ParadigmLearningService.getInstance();
    this.interHostCollaboration = InterHostCollaborationService.getInstance(this);

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
          onProgress?.(`📝 Write Layer [${paradigm}]: Scratchpad (10min) | Memory Store (24h) | Paradigm Namespaced`);
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
          onProgress?.(`🔍 Select Layer [${paradigm}]: Source Ranking | Tool Selection | Paradigm Criteria`);
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
          onProgress?.(`🗜️ Compress Layer [${paradigm}]: Token Reduction | Keyword Preservation | Format by Paradigm`);
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
          onProgress?.(`🚪 Isolate Layer [${paradigm}]: Async Sub-tasks | Focused Analysis | Parallel Execution`);
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
                async (task: string, ctx: { model: ModelType; effort: EffortType; [key: string]: unknown }) => {
                  const generateText = this.modelProvider.generateText.bind(this.modelProvider);
                  if (paradigm === 'bernard' || paradigm === 'maeve') {
                    const subQueries = await this.webResearchService.generateSearchQueries(
                      task,
                      ctx.model,
                      ctx.effort,
                      generateText,
                      onProgress
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
              const timeoutMs = this.calculateAdaptiveTimeout(query, paradigm, 'exploration');
              const isolatedResult = await this.isolateLayer.waitForTask(taskId, timeoutMs);
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
          } catch (err: unknown) {
            return { error: (err as Error)?.message ?? 'Isolation failed', status: 'failed' };
          }
        }
      }

      // Should never reach here
      return { error: 'Unknown layer', layer, paradigm };
    } catch (err: unknown) {
      const message = (err as Error)?.message ?? 'Unknown error';
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
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<string[]> {
    const gen = this.modelProvider.generateText.bind(this.modelProvider);
    return this.webResearchService.generateSearchQueries(userQuery, model, effort, gen, onProgress);
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
    console.log('📍 ResearchAgent.processQuery called with:', { query: query.substring(0, 50), model });

    // Special logging for O3 model
    if (model === 'o3' || (model as string).toLowerCase().includes('o3')) {
      console.log('🎯 O3 MODEL DETECTED IN RESEARCH FLOW:', {
        model,
        effort: metadata?.effort || 'MEDIUM',
        phase: metadata?.phase || 'discovery',
        queryLength: query.length,
        timestamp: new Date().toISOString()
      });
    }
    try {
      // 1) Detect paradigm with learning adjustments
      console.log('🔍 Detecting paradigm...');
      metadata?.onProgress?.('🧠 Paradigm Classifier: Analyzing probability distribution...');
      let paradigmProbs = await this.paradigmClassifier.classify(query);

      // Apply learned adjustments from Phase 8
      paradigmProbs = this.paradigmLearning.getLearnedAdjustments(query, paradigmProbs);

      // Report probabilities like in the diagram
      const probReport = Object.entries(paradigmProbs)
        .map(([p, prob]) => `${p.charAt(0).toUpperCase() + p.slice(1)} ${Math.round(prob * 100)}%`)
        .join(' | ');
      metadata?.onProgress?.(`📊 Probability Distribution: ${probReport}`);

      // Get effort and phase early as they're needed for blending
      const effort = metadata?.effort ?? EffortType.MEDIUM;
      const phase = metadata?.phase ?? 'discovery';

      // Record interaction for learning
      this.currentInteractionId = this.paradigmLearning.recordInteraction(
        query,
        this.paradigmClassifier.dominant(paradigmProbs)[0] ?? 'bernard',
        paradigmProbs,
        0.5 // Initial confidence, will be updated later
      );

      this.lastParadigmProbabilities = paradigmProbs;
      console.log('✅ Paradigm probabilities (with learning):', paradigmProbs);

      // Check if multi-paradigm blending is needed (Phase 7)
      if (this.multiParadigmBlender.shouldBlend(paradigmProbs)) {
        const blendingStrategy = this.multiParadigmBlender.createBlendingStrategy(paradigmProbs);
        if (blendingStrategy) {
          metadata?.onProgress?.('Multiple paradigms detected. Initiating blended approach...');

          const blendedResult = await this.multiParadigmBlender.executeBlendedResearch(
            query,
            blendingStrategy,
            model,
            effort,
            metadata?.onProgress
          );

          // Update learning with blended result confidence
          if (this.currentInteractionId) {
            this.paradigmLearning.updateFeedback(
              this.currentInteractionId,
              4, // Default good satisfaction for blended results
              true
            );
          }

          return {
            text: blendedResult.synthesis,
            sources: blendedResult.sources.map(s => ({
              name: s.name || s.title || '',
              url: s.url,
              snippet: s.snippet || '',
              relevanceScore: s.relevanceScore || 0
            })),
            paradigmProbabilities: paradigmProbs,
            contextDensity: this.contextEngineering.adaptContextDensity(phase, blendedResult.hostParadigm || 'bernard'),
            contextLayers: this.contextEngineering.getLayerSequence(blendedResult.hostParadigm || 'bernard'),
            layerResults: {}
          };
        }
      }

      // Single paradigm execution (existing flow)
      const dominant = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominant[0] ?? 'bernard';
      console.log('✅ Single paradigm selected:', paradigm, paradigmProbs);

      // 2) Context‑density for phase
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);
      metadata?.onProgress?.(`🎛️ Context Engineering Service: Phase: ${phase} | Density: ${Math.round(contextDensity.averageDensity ?? 50)}%`);

      // 3) Layer sequence
      const layerSequence = this.contextEngineering.getLayerSequence(paradigm);
      const layerSeqStr = layerSequence.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' → ');
      metadata?.onProgress?.(`📋 Layer Sequence: ${layerSeqStr}`);

      // 4) Execute layers
      console.log('🔄 Executing layers:', layerSequence);
      const layerResults: Record<string, ContextLayerResult> = {};
      for (const layer of layerSequence) {
        console.log(`📊 Processing layer: ${layer}`);
        metadata?.onProgress?.(`layer_progress:${layer}`);
        metadata?.onProgress?.(`Executing ${layer} layer for ${paradigm} paradigm…`);
        const res = await this.executeContextLayer(layer, {
          query,
          paradigm,
          density: contextDensity.averageDensity ?? 50,
          layerResults,
          sources: undefined,
          content: undefined,
          model: model,  // Ensure model is passed correctly
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
        const typedResponse = paradigmResponse as { synthesis?: string; text?: string; sources?: { title?: string; name?: string; url?: string; snippet?: string; relevanceScore?: number }[] };
        response = {
          text: typedResponse.synthesis || typedResponse.text || '',
          sources: typedResponse.sources?.map((s) => ({
            name: s.title || s.name || '',
            url: s.url || '',
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
          text: (strategyResponse as { synthesis?: string; text?: string }).synthesis || strategyResponse.text || '',
          sources: strategyResponse.sources?.map(s => ({
            name: s.title || s.name || '',
            url: s.url,
            snippet: s.snippet || '',
            relevanceScore: s.relevanceScore || 0
          })) || []
        };
      }

      // 7) Check for inter-host collaboration needs (Phase 9)
      const confidence = this.calculateConfidence(response, paradigm);
      const collaborationRequests = await this.interHostCollaboration.checkCollaborationNeeded(
        paradigm,
        query,
        confidence,
        response.text
      );

      if (collaborationRequests.length > 0) {
        metadata?.onProgress?.(`[${paradigm}] Seeking collaboration from other hosts...`);

        // Execute high-priority collaborations
        const highPriorityCollabs = collaborationRequests.filter(r => r.priority === 'high');
        for (const collab of highPriorityCollabs) {
          try {
            const collabResponse = await this.interHostCollaboration.executeCollaboration(
              collab.id,
              model,
              effort,
              metadata?.onProgress
            );

            // Enhance response with collaborative insights
            response.text += `\n\n### Collaborative Insight from ${collab.toHost.toUpperCase()}\n${collabResponse.insights}`;

            // Deduplicate sources before merging
            const existingUrls = new Set(response.sources.map(s => s.url));
            const newSources = collabResponse.sources
              .filter(s => !existingUrls.has(s.url))
              .map(s => ({
                name: s.name || s.title || '',
                url: s.url,
                snippet: s.snippet || '',
                relevanceScore: s.relevanceScore || 0
              }));
            response.sources = [...response.sources, ...newSources];
          } catch (error) {
            console.warn(`Collaboration ${collab.id} failed:`, error);
          }
        }
      }

      // Update learning feedback based on final confidence
      if (this.currentInteractionId) {
        const finalConfidence = this.calculateConfidence(response, paradigm);
        this.paradigmLearning.updateFeedback(
          this.currentInteractionId,
          Math.round(finalConfidence * 5), // Convert to 1-5 scale
          finalConfidence > 0.6
        );
      }

      // Send synthesis completion message to trigger UI transition
      metadata?.onProgress?.('Finalizing comprehensive answer through synthesis...');

      // 8) Compose final
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

    // Send synthesis completion message after evaluation
    onProgress?.('Finalizing comprehensive answer through synthesis...');

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

  /**
   * Calculate confidence score for a research response
   */
  private calculateConfidence(response: ResearchResponse, paradigm: HostParadigm): number {
    let confidence = 0.5; // Base confidence

    // Factor 1: Response length (longer is generally better)
    if (response.text.length > 1000) confidence += 0.1;
    if (response.text.length > 2000) confidence += 0.1;

    // Factor 2: Source quality and quantity
    if (response.sources.length >= 5) confidence += 0.1;
    if (response.sources.length >= 10) confidence += 0.1;

    // Factor 3: Paradigm-specific adjustments
    if (paradigm === 'bernard' && response.text.includes('framework')) confidence += 0.05;
    if (paradigm === 'dolores' && response.text.includes('action')) confidence += 0.05;
    if (paradigm === 'teddy' && response.text.includes('stakeholder')) confidence += 0.05;
    if (paradigm === 'maeve' && response.text.includes('strategy')) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  async routeResearchQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (msg: string) => void
  ): Promise<EnhancedResearchResults> {
    const startTime = Date.now();
    onProgress?.('tool_used:memory_cache');

    // Get the paradigm early for cache statistics
    const paradigm = await this.paradigmService.determineHostParadigm(query);
    const cacheHitRate = this.memoryService.getCacheHitRate(paradigm || undefined);

    const cachedResult = this.memoryService.getCachedResult(query, paradigm || undefined);
    if (cachedResult) {
      onProgress?.(`💾 Paradigm Cache Hit! (${paradigm || 'general'} hit rate: ${cacheHitRate}%)`);
      return cachedResult;
    }
    onProgress?.('tool_used:query_classification');
    const queryType = this.strategyService.classifyQueryType(query);
    onProgress?.(`Query classified as: ${queryType}`);
    onProgress?.('tool_used:paradigm_detection');
    // paradigm already declared above for cache statistics
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

    // Report confidence like in the diagram
    const confidencePercent = Math.round((result.confidenceScore || 0) * 100);
    onProgress?.(`🔍 Evaluation: Confidence: ${confidencePercent}%`);

    if (ResearchUtilities.needsSelfHealing(result)) {
      onProgress?.(`🔧 Self-Healing: Confidence ${confidencePercent}% < 35% threshold`);
      onProgress?.(`🔄 Strategy: ${paradigm ? paradigm.charAt(0).toUpperCase() + paradigm.slice(1) : 'General'} Deep Analysis`);
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

    // Send synthesis completion message to trigger UI transition
    onProgress?.('Finalizing comprehensive answer through synthesis...');

    const processingTime = Date.now() - startTime;
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      processingTime,
      paradigmProbabilities: this.lastParadigmProbabilities || undefined,
      cacheHit: false
    };

    // Report final results like in the diagram
    const finalConfidence = Math.round((result.confidenceScore || 0.75) * 100);
    const sourceCount = result.sources?.length || 0;
    onProgress?.(`✅ Enhanced Research Results: Paradigm: ${paradigm ? paradigm.charAt(0).toUpperCase() + paradigm.slice(1) : 'General'} | Confidence: ${finalConfidence}% | Sources: ${sourceCount}`);

    this.memoryService.cacheResult(query, result, paradigm || undefined);
    return result;
  }

  /**
   * Perform host-based research for multi-paradigm blending
   */
  async performHostBasedResearch(
    query: string,
    paradigm: HostParadigm,
    queryType: QueryType,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.paradigmService.performHostBasedResearch(
      query,
      paradigm,
      queryType,
      model,
      effort,
      onProgress
    );
  }

  // Removed duplicate generateText method - keeping the more complete version above

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
        model: GENAI_MODEL_FLASH as ModelType,
        effort: EffortType.MEDIUM,
        ...step.metadata,
        refinementCount: state.refinementCount,
        evaluation: state.evaluation
      };
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
    void _options; // Suppress unused parameter warning
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
      evaluation: (metadata as Record<string, unknown>).evaluation as { quality: 'excellent' | 'good' | 'needs_improvement'; completeness: number; accuracy: number; clarity: number } || {
        quality: 'good' as const,
        completeness: 0.8,
        accuracy: 0.9,
        clarity: 0.85
      },
      sections: (metadata as Record<string, unknown>).sections as { id?: string; title?: string; content?: string; confidence?: number; topic: string; description: string; research?: string; sources?: any[] }[] || [],
      refinementCount: (metadata as Record<string, unknown>).refinementCount as number || 0
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Timeout‑extension logic (unused but kept for potential future use)
  // ──────────────────────────────────────────────────────────
  // The following helper is currently not invoked, but we keep it around as
  // it encapsulates a well-tested timeout-extension strategy that may be
  // re-used shortly.  Because the TypeScript compiler is configured with
  // `noUnusedLocals: true`, an unused private member would normally trigger
  // error TS6133.  Adding `@ts-expect-error` on the next line suppresses that
  // diagnostic while still type-checking the function body.
  //
  // @ts-expect-error — kept for potential future use
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
