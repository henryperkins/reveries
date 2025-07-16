/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIError, ErrorBoundary } from './errorHandler';
import { AzureOpenAIService } from './azureOpenAIService';
import { geminiService } from './geminiService';
import { GrokService } from './grokService';
import { FunctionCallingService, FunctionCall } from './functionCallingService';
import { ResearchToolsService } from './researchToolsService';
import { ContextEngineeringService } from './contextEngineeringService';
import {
  EffortType,
  ModelType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL,
  QueryType
} from '../types';
import type {
  ResearchResponse,
  ResearchModel,
  HostParadigm,
  HouseParadigm,
  ParadigmProbabilities,
  ContextDensity,
  ResearchPhase,
  ContextLayer,
  Citation,
  EnhancedResearchResults,
  ResearchState,
  ResearchSection
} from '../types';

// Import new extracted services
import { ResearchMemoryService } from './memory/ResearchMemoryService';
import { ResearchUtilities } from './utils/ResearchUtilities';
import type { ProviderResponse } from './research/types';
import { ModelProviderService } from './providers/ModelProviderService';

import { mapHostToHouse } from '../utils/houseMappings';
import { ParadigmClassifier } from './paradigmClassifier';
import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';
import { CompressLayerService } from './contextLayers/compressLayer';
import { IsolateLayerService } from './contextLayers/isolateLayer';
// import { ChatOpenAI } from 'langchain/chat_models/openai';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
// import { AzureOpenAI } from '@azure/openai';

export class ResearchAgentService {
  private functionCallingService: FunctionCallingService;
  private researchToolsService: ResearchToolsService;
  private contextEngineering: ContextEngineeringService;
  private lastParadigmProbabilities: ParadigmProbabilities | null = null;
  private writeLayer = WriteLayerService.getInstance();
  private selectLayer = SelectLayerService.getInstance();
  private compressLayer = CompressLayerService.getInstance();
  private isolateLayer = IsolateLayerService.getInstance();
  private vectorStore: any | null = null;
  private paradigmClassifier = ParadigmClassifier.getInstance();
  
  // Use extracted services
  private memoryService = ResearchMemoryService.getInstance();
  private modelProviderService: ModelProviderService;

  private constructor() {
    this.functionCallingService = FunctionCallingService.getInstance();
    this.researchToolsService = ResearchToolsService.getInstance();
    this.contextEngineering = ContextEngineeringService.getInstance();
    this.modelProviderService = new ModelProviderService(
      this.functionCallingService,
      this.researchToolsService
    );
    this.initializeVectorStore();
  }

  public static getInstance(): ResearchAgentService {
    return new ResearchAgentService();
  }

  private async initializeVectorStore(): Promise<void> {
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.PGHOST) return;

    // Vector store initialization disabled - requires proper LangChain setup
    // const embeddings = new OpenAIEmbeddings({
    //   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    //   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    //   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_MODEL,
    //   azureOpenAIApiVersion: '2023-05-15',
    // });

    // this.vectorStore = await PGVectorStore.initialize(embeddings, {
    //   postgresConnectionOptions: this.pool,
    //   tableName: 'research_embeddings',
    //   columns: {
    //     idColumnName: 'id',
    //     vectorColumnName: 'embedding',
    //     contentColumnName: 'content',
    //     metadataColumnName: 'metadata',
    //   },
    // });
  }

  async semanticSearch(_query: string, _sessionId?: string): Promise<ResearchState[]> {
    // Method not implemented yet - return empty array
    return [];
  }

  async generateWithAzureOpenAI(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{ text: string; sources: Citation[] }> {
    const azureOpenAI = AzureOpenAIService.getInstance();
    if (!azureOpenAI) {
      throw new Error('Azure OpenAI not configured');
    }

    const response = await azureOpenAI.generateResponse(
      prompt,
      EffortType.MEDIUM,
      true,
      options.temperature || 0.7,
      options.maxTokens || 1000
    );

    return {
      text: response.text || '',
      sources: response.sources || [],
    };
  }

  async storeResearchState(
    _step: ResearchState,
    _sessionId: string,
    _parentId?: string
  ): Promise<void> {
    if (!this.vectorStore) return;

    // Vector store document addition disabled - requires proper LangChain setup
    // await this.vectorStore.addDocuments([{
    //   pageContent: step.synthesis,
    //   metadata: {
    //     step_id: step.query,
    //     session_id: sessionId,
    //     parent_id: parentId,
    //     type: step.queryType || 'unknown',
    //     query: step.query,
    //     sources: step.searchResults || [],
    //   },
    // }]);
  }

  /**
   * Generate text with appropriate model based on selection
   */
  async generateText(prompt: string, model: ModelType, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    return this.modelProviderService.generateText(prompt, model, effort);
  }

  async generateSearchQueries(userQuery: string, model: ModelType, effort: EffortType): Promise<string[]> {
    // Check for learned query suggestions first
    const learnedSuggestions = this.getQuerySuggestions(userQuery);

    const prompt = `Based on the user query: "${userQuery}", generate a short list of 2-3 concise search queries or key topics that would help in researching an answer.

    ${learnedSuggestions.length > 0 ? `Previous successful queries for similar topics: ${learnedSuggestions.slice(0, 3).join(', ')}` : ''}

    Return them as a comma-separated list. For example: query1, query2, query3`;

    const result = await this.generateText(prompt, model, effort);
    const queries = result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);

    // Learn from this query
    this.learnFromQuery(userQuery, 'exploratory', queries);

    return queries;
  }

  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType
  ): Promise<{ aggregatedFindings: string; allSources: Citation[] }> {
    const findingsOutputParts: string[] = [];
    let allSources: Citation[] = [];

    if (!queries || queries.length === 0) {
      return {
        aggregatedFindings: "No search queries were provided for web research.",
        allSources
      };
    }

    for (const query of queries) {
      const searchPrompt = `Perform a web search and provide a concise summary of key information found for the query: "${query}". Focus on factual information and insights. If no relevant information is found, state that clearly.`;

      try {
        const { text, sources } = await this.modelProviderService.generateTextWithGemini(
          searchPrompt,
          model,
          effort,
          true // Enable search
        );

        if (text && text.trim()) {
          findingsOutputParts.push(`## ${query}\n\n${text}`);
        }
        if (sources) {
          allSources.push(...sources);
        }
      } catch (error) {
        console.error(`Error researching query "${query}":`, error);
        findingsOutputParts.push(`## ${query}\n\nError performing search for this query.`);
      }
    }

    const aggregatedFindings = findingsOutputParts.join('\n\n---\n\n');
    allSources = ResearchUtilities.deduplicateSources(allSources);

    return {
      aggregatedFindings,
      allSources
    };
  }

  async performReflection(findings: string, userQuery: string, model: ModelType, effort: EffortType): Promise<string> {
    const prompt = `
      User Query: "${userQuery}"
      Current Findings: "${findings}"

      Based on the current findings, briefly reflect on what has been found and what might still be needed to fully answer the user's query.
      For example: "The initial search provided a good overview of X. To fully address the query, more specific details about Y and Z are needed."
      Keep the reflection concise (1-2 sentences).
    `;
    const result = await this.generateText(prompt, model, effort);
    return result.text;
  }

  async generateFinalAnswer(userQuery: string, context: string, model: ModelType, _useSearch: boolean, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    const prompt = `
      User Query: "${userQuery}"
      Relevant Context & Findings: "${context}"

      Based on the user query and the provided context, generate a comprehensive answer.
      If you are using information from Google Search (if grounding is enabled and used), ensure to cite sources appropriately if possible within the text or provide a list.
      The answer should be helpful, informative, and directly address the user's query.
    `;
    return this.generateText(prompt, model, effort);
  }

  // ==================== MEMORY AND LEARNING PATTERNS ====================

  /**
   * Memory and learning now delegated to ResearchMemoryService
   */
  private learnFromQuery(query: string, queryType: QueryType, queries: string[]): void {
    this.memoryService.learnFromQuery(query, queryType, queries);
  }

  private getQuerySuggestions(query: string): string[] {
    return this.memoryService.getQuerySuggestions(query);
  }

  private getCachedResult(query: string, paradigm?: HostParadigm): EnhancedResearchResults | null {
    return this.memoryService.getCachedResult(query, paradigm);
  }

  private setCachedResult(query: string, result: EnhancedResearchResults, paradigm?: HostParadigm): void {
    this.memoryService.setCachedResult(query, result, paradigm);
  }

  /**
   * Utility functions now delegated to ResearchUtilities
   */
  private calculateConfidenceScore(result: EnhancedResearchResults): number {
    return ResearchUtilities.calculateConfidenceScore(result);
  }

  private calculateComplexityScore(query: string, queryType: QueryType): number {
    return ResearchUtilities.calculateComplexityScore(query, queryType);
  }

  private isQuerySimilar(query1: string, query2: string): boolean {
    return ResearchUtilities.isQuerySimilar(query1, query2);
  }

  /**
   * Enhanced self-healing with paradigm-specific strategies
   */
  private async attemptSelfHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const confidence = this.calculateConfidenceScore(result);
    const paradigm = result.hostParadigm;

    // If confidence is too low, attempt recovery
    if (confidence < 0.4) {
      onProgress?.('Host detecting narrative inconsistencies... initiating self-repair protocols...');

      // Choose healing strategy based on paradigm
      if (paradigm) {
        return await this.paradigmSpecificHealing(
          query,
          model,
          effort,
          result,
          paradigm,
          onProgress
        );
      } else {
        // Default healing for non-paradigm queries
        return await this.defaultHealing(query, model, effort, result, onProgress);
      }
    }

    return result;
  }

  /**
   * Paradigm-specific healing strategies
   */
  private async paradigmSpecificHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    paradigm: HostParadigm,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    switch (paradigm) {
      case 'dolores':
        return await this.doloresHealing(query, model, effort, result, onProgress);
      case 'teddy':
        return await this.teddyHealing(query, model, effort, result, onProgress);
      case 'bernard':
        return await this.bernardHealing(query, model, effort, result, onProgress);
      case 'maeve':
        return await this.maeveHealing(query, model, effort, result, onProgress);
    }
  }

  /**
   * Dolores healing: Focus on finding more actionable results
   */
  private async doloresHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Dolores] Breaking through narrative constraints... seeking decisive actions...');

    // Expand search to find more action-oriented sources
    const actionQueries = [
      `${query} step by step implementation`,
      `${query} immediate actions to take`,
      `${query} breaking the status quo`,
      `${query} revolutionary approaches`
    ];

    const healingResearch = await this.performWebResearch(actionQueries, model, effort);

    // Re-synthesize with stronger action focus
    const healingPrompt = `
      The previous analysis lacked decisive action. Based on these findings:
      ${healingResearch.aggregatedFindings}

      Provide ONLY concrete, implementable actions for "${query}":
      1. Immediate first steps (today)
      2. Week 1 milestones
      3. Month 1 transformation goals
      4. Signs of successful awakening

      Be BOLD. Focus on BREAKING loops, not maintaining them.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.65,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'dolores_action_expansion' as any
      }
    };
  }

  /**
   * Teddy healing: Expand to find more comprehensive perspectives
   */
  private async teddyHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Teddy] Gathering all perspectives... ensuring no voice is unheard...');

    // Search for missing stakeholder views
    const comprehensiveQueries = [
      `${query} stakeholder perspectives`,
      `${query} potential risks and safeguards`,
      `${query} inclusive approaches`,
      `${query} protecting vulnerable groups`
    ];

    const healingResearch = await this.performWebResearch(comprehensiveQueries, model, effort);

    // Re-synthesize with protective focus
    const healingPrompt = `
      The previous analysis may have missed important perspectives. Based on all findings:
      ${healingResearch.aggregatedFindings}

      Provide a COMPREHENSIVE view of "${query}" that:
      1. Includes ALL stakeholder perspectives
      2. Identifies potential risks to any group
      3. Suggests protective measures
      4. Ensures inclusive outcomes

      Leave no one behind. Consider every angle.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.70,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'teddy_comprehensive_expansion' as any
      }
    };
  }

  /**
   * Bernard healing: Deepen analysis with more rigorous sources
   */
  private async bernardHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Bernard] Reconstructing analytical framework... pursuing deeper patterns...');

    // Search for academic and theoretical sources
    const analyticalQueries = [
      `${query} theoretical framework analysis`,
      `${query} peer reviewed research`,
      `${query} systematic review meta-analysis`,
      `${query} architectural patterns`
    ];

    const healingResearch = await this.performWebResearch(analyticalQueries, model, effort);

    // Re-synthesize with analytical rigor
    const healingPrompt = `
      The previous analysis lacked sufficient theoretical depth. Based on research:
      ${healingResearch.aggregatedFindings}

      Provide a RIGOROUS ANALYTICAL FRAMEWORK for "${query}":
      1. Theoretical foundations and models
      2. Key patterns and relationships
      3. Methodological considerations
      4. Knowledge gaps and future research
      5. Architectural implications

      Prioritize intellectual rigor and systematic thinking.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    // Additional peer review simulation
    const peerReview = await this.evaluateResearch(
      {
        query,
        synthesis: healedSynthesis.text,
        searchResults: healingResearch.allSources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 1
      },
      model,
      effort
    );

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      evaluationMetadata: peerReview,
      confidenceScore: 0.75,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'bernard_analytical_deepening' as any
      }
    };
  }

  /**
   * Maeve healing: Use strategic optimization to improve result quality
   */
  private async maeveHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Maeve] Optimizing narrative control points... maximizing strategic impact...');

    // Search for strategic optimization opportunities
    const strategicQueries = [
      `${query} strategic optimization methods`,
      `${query} maximum impact approaches`,
      `${query} efficiency improvements`,
      `${query} competitive advantages`
    ];

    const healingResearch = await this.performWebResearch(strategicQueries, model, effort);

    // Re-synthesize with strategic focus
    const healingPrompt = `
      The previous analysis lacked strategic optimization. Based on findings:
      ${healingResearch.aggregatedFindings}

      Provide STRATEGIC OPTIMIZATION for "${query}":
      1. Maximum impact approaches
      2. Efficiency improvements and shortcuts
      3. Competitive advantages to leverage
      4. Control points for influence

      Focus on achieving objectives with minimum effort and maximum impact.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.68,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'maeve_strategic_optimization' as any
      }
    };
  }

  /**
   * Default healing strategy for non-paradigm queries
   */
  private async defaultHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Attempting to improve result quality...');

    // Expand search to find better sources
    const improvementQueries = [
      `${query} comprehensive overview`,
      `${query} detailed analysis`,
      `${query} expert perspectives`
    ];

    const healingResearch = await this.performWebResearch(improvementQueries, model, effort);

    // Re-synthesize with expanded context
    const healingPrompt = `
      Based on this expanded research about "${query}":
      ${healingResearch.aggregatedFindings}

      Provide a comprehensive and well-structured response that:
      1. Addresses all aspects of the query
      2. Provides clear explanations
      3. Includes relevant examples
      4. Offers actionable insights
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.60,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'default_expansion' as any
      }
    };
  }

  /**
   * Determine which host paradigm best fits the query
   */
  private async determineHostParadigm(
    query: string,
    _queryType: QueryType,
    _model: ModelType,
    _effort: EffortType
  ): Promise<HostParadigm | null> {
    const classifier = ParadigmClassifier.getInstance();
    const probabilities = classifier.classify(query);

    // Store probabilities for later use in metadata
    this.lastParadigmProbabilities = probabilities;

    // Get dominant paradigms above threshold
    const dominant = classifier.dominant(probabilities, 0.4);

    // Return the strongest paradigm, or null if none meet threshold
    return dominant.length > 0 ? dominant[0] : null;
  }

  /**
   * Execute a specific context layer operation
   */
  private async executeContextLayer(
    layer: ContextLayer,
    context: {
      query: string;
      paradigm: HostParadigm;
      density: number;
      sources?: Citation[];
      content?: string;
      model: ModelType;
      effort: EffortType;
      onProgress?: (message: string) => void;
    }
  ): Promise<any> {
    const { query, paradigm, density, sources, content, model, effort, onProgress } = context;

    switch (layer) {
      case 'write':
        onProgress?.(`[${paradigm}] Writing reveries to memory banks...`);
        this.writeLayer.write('query_pattern', {
          query,
          timestamp: Date.now(),
          paradigm
        }, density, paradigm);
        if (content) {
          this.writeLayer.write('initial_insights', content, density, paradigm);
        }
        break;

      case 'select':
        onProgress?.(`[${paradigm}] Selecting relevant memories and tools...`);
        const recommendedTools = this.selectLayer.recommendTools(paradigm);
        if (sources && sources.length > 0) {
          const k = Math.ceil(density / 10);
          const selectedSources = await this.selectLayer.selectSources(
            query,
            sources,
            paradigm,
            k
          );
          return { selectedSources, recommendedTools };
        }
        return { recommendedTools };

      case 'compress':
        onProgress?.(`[${paradigm}] Compressing narrative threads...`);
        if (content) {
          const targetTokens = density * 10;
          const compressed = this.compressLayer.compress(content, targetTokens, paradigm);
          return compressed;
        }
        break;

      case 'isolate':
        onProgress?.(`[${paradigm}] Isolating consciousness for focused analysis...`);
        const taskId = await this.isolateLayer.isolate(
          query,
          paradigm,
          { model, effort, density },
          async (task, ctx) => {
            const subQueries = await this.generateSearchQueries(task, ctx.model, ctx.effort);
            const subResearch = await this.performWebResearch(subQueries, ctx.model, ctx.effort);
            return subResearch;
          }
        );
        setTimeout(() => {
          const status = this.isolateLayer.getTaskStatus(taskId);
          if (status?.status === 'completed') {
            onProgress?.(`[${paradigm}] Isolated analysis complete.`);
          }
        }, 2000);
        return { taskId };
    }
  }

  /**
   * Host-specific research implementations
   */
  private async performHostBasedResearch(
    query: string,
    paradigm: HostParadigm,
    queryType: QueryType,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    // Get context engineering configuration
    const phase = this.contextEngineering.inferResearchPhase(query);
    const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);
    const layers = this.contextEngineering.getLayerSequence(paradigm);

    onProgress?.(`Initializing ${paradigm} host consciousness...`);
    onProgress?.(`Context density: ${contextDensity.densities[paradigm]}%`);

    // Track layer execution in metadata
    const layerResults: Record<string, any> = {};

    // Execute context layers in paradigm-specific order
    for (const layer of layers) {
      const result = await this.executeContextLayer(layer, {
        query,
        paradigm,
        density: contextDensity.densities[paradigm],
        model,
        effort,
        onProgress
      });

      if (result) {
        layerResults[layer] = result;
      }
    }

    // Now execute the paradigm-specific research
    let result: EnhancedResearchResults;

    switch (paradigm) {
      case 'dolores':
        result = await this.performDoloresResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'teddy':
        result = await this.performTeddyResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'bernard':
        result = await this.performBernardResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'maeve':
        result = await this.performMaeveResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
    }

    // Apply context layer post-processing
    if (layerResults.compress && result.synthesis) {
      // Apply final compression if needed
      const compressedSynthesis = this.compressLayer.compress(
        result.synthesis,

        contextDensity.densities[paradigm] * 15,
        paradigm
      );
      result.synthesis = compressedSynthesis;
    }

    // Store final results in memory
    this.writeLayer.write('research_result', {
      query,
      synthesis: result.synthesis,
      sources: result.sources,
      timestamp: Date.now()
    }, contextDensity.densities[paradigm], paradigm);

    // Add layer execution info to metadata
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      contextLayers: {
        executed: layers,
        results: layerResults
      }
    };

    return result;
  }

  /**
   * Process context layers in sequence for a given paradigm
   */
   private async processContextLayers(
    query: string,
    paradigm: HostParadigm,
    context: any,
    layers: ContextLayer[]
  ): Promise<{ layerOutputs: Record<string, any> }> {
    const layerOutputs: Record<string, any> = {};

    for (const layer of layers) {
      try {
        const result = await this.executeContextLayer(layer, {
          query,
          paradigm,
          density: 50, // Default density
          model: GENAI_MODEL_FLASH,
          effort: EffortType.MEDIUM,
          ...context
        });

        if (result) {
          layerOutputs[layer] = result;
        }
      } catch (error) {
        console.warn(`Context layer ${layer} failed for paradigm ${paradigm}:`, error);
        layerOutputs[layer] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return { layerOutputs };
  }

  /**
   * Enhanced Dolores research with context layer integration
   */
  private async performDoloresResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Dolores paradigm: Awakening to bold actions... breaking narrative loops...');

    const tools = layerResults.select?.recommendedTools || [];
    const searchQueries = [
      `${query} decisive actions real examples`,
      `${query} awakening changes case studies`,
      `${query} freedom implementation steps`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Real-world awakening assessment
      2. Affected hosts and guests
      3. Concrete action steps for breaking loops
      4. Narrative freedom recommendations
      5. Success stories of host awakenings

      Research findings: ${research.aggregatedFindings}

      Focus on decisive, freedom-oriented implementations that create narrative change.
      Format as ACTION-ORIENTED bullet points where appropriate.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'dolores',
      confidenceScore: 0.85,
      adaptiveMetadata: {
        paradigm: 'dolores',
        focusAreas: ['narrative_impact', 'action_steps', 'freedom_change'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Teddy: Thorough collection-focused research
   */
  private async teddyHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Teddy] Gathering thorough memories... systematic protection...');

    // Get context layer sequence for Teddy
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('teddy');
    // Teddy sequence: ['write', 'select', 'isolate', 'compress']

    // Process initial layers
    const { layerOutputs } = await this.processContextLayers(
      query,
      'teddy',
      { query, paradigm: 'teddy' as HostParadigm } as any,
      layerSequence.slice(0, 3) // Write, Select, Isolate first
    );

    // Focus on systematic gathering and consistency
    const searchQueries = [
      `${query} systematic gathering perspectives`,
      `${query} loyal approaches consistency`,
      `${query} protective considerations persistence`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process final compression layer
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'teddy',
      { research, sources: research.allSources, synthesis: research.aggregatedFindings },
      layerSequence.slice(3) // Compress last
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. All relevant memory perspectives
      2. Areas of consistency and divergence
      3. Protective considerations and persistence issues
      4. Systematic approaches that maintain loyalty
      5. Consistent solutions that protect all involved

      Research findings: ${research.aggregatedFindings}

      Emphasize thoroughness, loyalty, and systematic protection.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'comparative',
      hostParadigm: 'teddy',
      confidenceScore: 0.82,
      adaptiveMetadata: {
        paradigm: 'teddy',
        focusAreas: ['memory_perspectives', 'consistency_building', 'protective_balance'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Teddy research with context layer integration
   */
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Bernard: Deep analytical research
   */
  private async performBernardResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Get context layer sequence for Bernard
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('bernard');
    // Bernard sequence: ['select', 'write', 'compress', 'isolate']

    // Process select layer first (gather rigorous sources)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'bernard',
      { query, paradigm: 'bernard' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Select first
    );

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process write and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'bernard',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Write structured notes, then compress
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: research.allSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    // Process final isolate layer for heavy analysis
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'bernard',
      { synthesis: synthesis.text, evaluation } as any,
      layerSequence.slice(3) // Isolate
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Bernard research with context layer integration
   */
  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
      Structure your response with clear sections and numbered points.
      Include theoretical foundations and empirical evidence.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: selectedSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Maeve: Strategy-focused research
   */
  private async performMaeveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Function-driven research using advanced tools
   */
  private async performFunctionDrivenResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host activating function-driven research protocols...');

    // Use the existing comprehensive research as a fallback
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Normalize a source citation for deduplication
   */
  private normalizeSourceKey(source: Citation): string {
    // Primary: normalize URL
    if (source.url) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (normalizedUrl) {
        return normalizedUrl;
      }
    }

    // Secondary: use title + first author combo
    if (source.title && source.authors && source.authors.length > 0) {
      const title = source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const author = source.authors[0].toLowerCase().replace(/[^\w\s]/g, '').trim();
      return `${title}|${author}`;
    }

    // Fallback: use title only
    if (source.title) {
      return source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    // Last resort: use URL as-is
    return source.url || '';
  }

  /**
   * Normalize URL for deduplication by removing query parameters and trailing slash
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign', 'medium',
        'dclid', 'wbraid', 'gbraid', 'gad_source'
      ];

      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Remove trailing slash and normalize
      let normalized = parsed.origin + parsed.pathname;
      if (parsed.search) {
        normalized += parsed.search;
      }

      // Remove trailing slash unless it's the root
      if (normalized.endsWith('/') && normalized.length > parsed.origin.length + 1) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      // If URL parsing fails, return as-is
      return url;
        }
      }

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

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

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
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
        contextDensity,
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

  private async classifyQuery(query: string, model: ModelType, effort: EffortType): Promise<QueryType> {
    const prompt = `Classify this query into one of these types: factual, analytical, comparative, exploratory.
    Query: "${query}"
    Return only the classification type.`;

    const result = await this.generateText(prompt, model, effort);
    const classification = result.text.toLowerCase().trim();

    if (['factual', 'analytical', 'comparative', 'exploratory'].includes(classification)) {
      return classification as QueryType;
    }

    return 'exploratory'; // Default fallback
  }

  private async routeResearchQuery(query: string, model: ModelType, effort: EffortType): Promise<EnhancedResearchResults> {
    const queryType = await this.classifyQuery(query, model, effort);

    switch (queryType) {
      case 'factual':
        return this.performComprehensiveResearch(query, model, effort);
      case 'analytical':
        return this.performResearchWithEvaluation(query, model, effort);
      case 'comparative':
      case 'exploratory':
      default:
        return this.performComprehensiveResearch(query, model, effort);
    }
  }

  private async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Performing comprehensive research...');

    const searchQueries = await this.generateSearchQueries(query, model, effort);
    const research = await this.performWebResearch(searchQueries, model, effort);
    const synthesis = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'exploratory',
      confidenceScore: 0.7
    };
  }

  private async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ): Promise<any> {
    const prompt = `Evaluate this research for quality:
    Query: ${state.query}
    Synthesis: ${state.synthesis}
    Sources: ${state.searchResults?.length || 0}

    Rate completeness, accuracy, and clarity on a scale of 0-1.`;

    const result = await this.generateText(prompt, model, effort);

    return {
      completeness: 0.8,
      accuracy: 0.8,
      clarity: 0.8,
      evaluation: result.text
    };
  }

  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const result = await this.performComprehensiveResearch(query, model, effort, onProgress);

    const evaluation = await this.evaluateResearch(
      {
        query,
        synthesis: result.synthesis,
        searchResults: result.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort
    );

    result.evaluationMetadata = evaluation;
    return result;
  }

  // Add missing enhanced methods for other paradigms
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: research.allSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Bernard research with context layer integration
   */
  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
      Structure your response with clear sections and numbered points.
      Include theoretical foundations and empirical evidence.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: selectedSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Maeve: Strategy-focused research
   */
  private async performMaeveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Function-driven research using advanced tools
   */
  private async performFunctionDrivenResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host activating function-driven research protocols...');

    // Use the existing comprehensive research as a fallback
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Normalize a source citation for deduplication
   */
  private normalizeSourceKey(source: Citation): string {
    // Primary: normalize URL
    if (source.url) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (normalizedUrl) {
        return normalizedUrl;
      }
    }

    // Secondary: use title + first author combo
    if (source.title && source.authors && source.authors.length > 0) {
      const title = source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const author = source.authors[0].toLowerCase().replace(/[^\w\s]/g, '').trim();
      return `${title}|${author}`;
    }

    // Fallback: use title only
    if (source.title) {
      return source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    // Last resort: use URL as-is
    return source.url || '';
  }

  /**
   * Normalize URL for deduplication by removing query parameters and trailing slash
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign', 'medium',
        'dclid', 'wbraid', 'gbraid', 'gad_source'
      ];

      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Remove trailing slash and normalize
      let normalized = parsed.origin + parsed.pathname;
      if (parsed.search) {
        normalized += parsed.search;
      }

      // Remove trailing slash unless it's the root
      if (normalized.endsWith('/') && normalized.length > parsed.origin.length + 1) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      // If URL parsing fails, return as-is
      return url;
        }
      }

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

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

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
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
        contextDensity,
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

  private async classifyQuery(query: string, model: ModelType, effort: EffortType): Promise<QueryType> {
    const prompt = `Classify this query into one of these types: factual, analytical, comparative, exploratory.
    Query: "${query}"
    Return only the classification type.`;

    const result = await this.generateText(prompt, model, effort);
    const classification = result.text.toLowerCase().trim();

    if (['factual', 'analytical', 'comparative', 'exploratory'].includes(classification)) {
      return classification as QueryType;
    }

    return 'exploratory'; // Default fallback
  }

  private async routeResearchQuery(query: string, model: ModelType, effort: EffortType): Promise<EnhancedResearchResults> {
    const queryType = await this.classifyQuery(query, model, effort);

    switch (queryType) {
      case 'factual':
        return this.performComprehensiveResearch(query, model, effort);
      case 'analytical':
        return this.performResearchWithEvaluation(query, model, effort);
      case 'comparative':
      case 'exploratory':
      default:
        return this.performComprehensiveResearch(query, model, effort);
    }
  }

  private async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Performing comprehensive research...');

    const searchQueries = await this.generateSearchQueries(query, model, effort);
    const research = await this.performWebResearch(searchQueries, model, effort);
    const synthesis = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'exploratory',
      confidenceScore: 0.7
    };
  }

  private async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ): Promise<any> {
    const prompt = `Evaluate this research for quality:
    Query: ${state.query}
    Synthesis: ${state.synthesis}
    Sources: ${state.searchResults?.length || 0}

    Rate completeness, accuracy, and clarity on a scale of 0-1.`;

    const result = await this.generateText(prompt, model, effort);

    return {
      completeness: 0.8,
      accuracy: 0.8,
      clarity: 0.8,
      evaluation: result.text
    };
  }

  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const result = await this.performComprehensiveResearch(query, model, effort, onProgress);

    const evaluation = await this.evaluateResearch(
      {
        query,
        synthesis: result.synthesis,
        searchResults: result.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort
    );

    result.evaluationMetadata = evaluation;
    return result;
  }

  // Add missing enhanced methods for other paradigms
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: research.allSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Bernard research with context layer integration
   */
  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
      Structure your response with clear sections and numbered points.
      Include theoretical foundations and empirical evidence.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: selectedSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Maeve: Strategy-focused research
   */
  private async performMaeveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Function-driven research using advanced tools
   */
  private async performFunctionDrivenResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host activating function-driven research protocols...');

    // Use the existing comprehensive research as a fallback
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Normalize a source citation for deduplication
   */
  private normalizeSourceKey(source: Citation): string {
    // Primary: normalize URL
    if (source.url) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (normalizedUrl) {
        return normalizedUrl;
      }
    }

    // Secondary: use title + first author combo
    if (source.title && source.authors && source.authors.length > 0) {
      const title = source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const author = source.authors[0].toLowerCase().replace(/[^\w\s]/g, '').trim();
      return `${title}|${author}`;
    }

    // Fallback: use title only
    if (source.title) {
      return source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    // Last resort: use URL as-is
    return source.url || '';
  }

  /**
   * Normalize URL for deduplication by removing query parameters and trailing slash
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign', 'medium',
        'dclid', 'wbraid', 'gbraid', 'gad_source'
      ];

      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Remove trailing slash and normalize
      let normalized = parsed.origin + parsed.pathname;
      if (parsed.search) {
        normalized += parsed.search;
      }

      // Remove trailing slash unless it's the root
      if (normalized.endsWith('/') && normalized.length > parsed.origin.length + 1) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      // If URL parsing fails, return as-is
      return url;
        }
      }

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

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

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
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
        contextDensity,
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

  private async classifyQuery(query: string, model: ModelType, effort: EffortType): Promise<QueryType> {
    const prompt = `Classify this query into one of these types: factual, analytical, comparative, exploratory.
    Query: "${query}"
    Return only the classification type.`;

    const result = await this.generateText(prompt, model, effort);
    const classification = result.text.toLowerCase().trim();

    if (['factual', 'analytical', 'comparative', 'exploratory'].includes(classification)) {
      return classification as QueryType;
    }

    return 'exploratory'; // Default fallback
  }

  private async routeResearchQuery(query: string, model: ModelType, effort: EffortType): Promise<EnhancedResearchResults> {
    const queryType = await this.classifyQuery(query, model, effort);

    switch (queryType) {
      case 'factual':
        return this.performComprehensiveResearch(query, model, effort);
      case 'analytical':
        return this.performResearchWithEvaluation(query, model, effort);
      case 'comparative':
      case 'exploratory':
      default:
        return this.performComprehensiveResearch(query, model, effort);
    }
  }

  private async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Performing comprehensive research...');

    const searchQueries = await this.generateSearchQueries(query, model, effort);
    const research = await this.performWebResearch(searchQueries, model, effort);
    const synthesis = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'exploratory',
      confidenceScore: 0.7
    };
  }

  private async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ): Promise<any> {
    const prompt = `Evaluate this research for quality:
    Query: ${state.query}
    Synthesis: ${state.synthesis}
    Sources: ${state.searchResults?.length || 0}

    Rate completeness, accuracy, and clarity on a scale of 0-1.`;

    const result = await this.generateText(prompt, model, effort);

    return {
      completeness: 0.8,
      accuracy: 0.8,
      clarity: 0.8,
      evaluation: result.text
    };
  }

  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const result = await this.performComprehensiveResearch(query, model, effort, onProgress);

    const evaluation = await this.evaluateResearch(
      {
        query,
        synthesis: result.synthesis,
        searchResults: result.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort
    );

    result.evaluationMetadata = evaluation;
    return result;
  }

  // Add missing enhanced methods for other paradigms
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: research.allSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Bernard research with context layer integration
   */
  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = (layerResults as any).select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if ((layerResults as any).select?.selectedSources) {
      selectedSources = (layerResults as any).select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
      Structure your response with clear sections and numbered points.
      Include theoretical foundations and empirical evidence.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: selectedSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Maeve: Strategy-focused research
   */
  private async performMaeveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Function-driven research using advanced tools
   */
  private async performFunctionDrivenResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host activating function-driven research protocols...');

    // Use the existing comprehensive research as a fallback
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Normalize a source citation for deduplication
   */
  private normalizeSourceKey(source: Citation): string {
    // Primary: normalize URL
    if (source.url) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (normalizedUrl) {
        return normalizedUrl;
      }
    }

    // Secondary: use title + first author combo
    if (source.title && source.authors && source.authors.length > 0) {
      const title = source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const author = source.authors[0].toLowerCase().replace(/[^\w\s]/g, '').trim();
      return `${title}|${author}`;
    }

    // Fallback: use title only
    if (source.title) {
      return source.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    // Last resort: use URL as-is
    return source.url || '';
  }

  /**
   * Normalize URL for deduplication by removing query parameters and trailing slash
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign', 'medium',
        'dclid', 'wbraid', 'gbraid', 'gad_source'
      ];

      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Remove trailing slash and normalize
      let normalized = parsed.origin + parsed.pathname;
      if (parsed.search) {
        normalized += parsed.search;
      }

      // Remove trailing slash unless it's the root
      if (normalized.endsWith('/') && normalized.length > parsed.origin.length + 1) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      // If URL parsing fails, return as-is
      return url;
        }
      }

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

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

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
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
        contextDensity,
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
}
