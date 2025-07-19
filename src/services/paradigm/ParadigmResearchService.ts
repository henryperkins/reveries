/**
 * Paradigm Research Service
 * Handles host-specific research implementations and context layer execution
 */

import { ModelType, EffortType, Citation, HostParadigm, QueryType, ContextLayer } from '@/types';
import { 
  EnhancedResearchResults,
  ParadigmResearchContext,
  ContextLayerContext,
  LayerResult 
} from '@/services/research/types';
import { ContextEngineeringService } from '@/services/contextEngineeringService';
import { ParadigmClassifier } from '@/services/paradigmClassifier';
import { WebResearchService } from '@/services/research/WebResearchService';
import { ModelProviderService } from '@/services/providers/ModelProviderService';
import { EvaluationService } from '@/services/research/EvaluationService';
import { WriteLayerService } from '@/services/contextLayers/writeLayer';
import { SelectLayerService } from '@/services/contextLayers/selectLayer';
import { CompressLayerService } from '@/services/contextLayers/compressLayer';
import { IsolateLayerService } from '@/services/contextLayers/isolateLayer';

export class ParadigmResearchService {
  private static instance: ParadigmResearchService;
  
  private contextEngineering: ContextEngineeringService;
  private paradigmClassifier: ParadigmClassifier;
  private webResearchService: WebResearchService;
  private modelProvider: ModelProviderService;
  private evaluationService: EvaluationService;
  
  // Context layers
  private writeLayer: WriteLayerService;
  private selectLayer: SelectLayerService;
  private compressLayer: CompressLayerService;
  private isolateLayer: IsolateLayerService;

  private constructor() {
    this.contextEngineering = ContextEngineeringService.getInstance();
    this.paradigmClassifier = ParadigmClassifier.getInstance();
    this.webResearchService = WebResearchService.getInstance();
    this.modelProvider = ModelProviderService.getInstance();
    this.evaluationService = EvaluationService.getInstance();
    
    // Initialize context layers
    this.writeLayer = WriteLayerService.getInstance();
    this.selectLayer = SelectLayerService.getInstance();
    this.compressLayer = CompressLayerService.getInstance();
    this.isolateLayer = IsolateLayerService.getInstance();
  }

  public static getInstance(): ParadigmResearchService {
    if (!ParadigmResearchService.instance) {
      ParadigmResearchService.instance = new ParadigmResearchService();
    }
    return ParadigmResearchService.instance;
  }

  /**
   * Determine host paradigm for a query
   */
  async determineHostParadigm(query: string): Promise<HostParadigm | null> {
    const probabilities = await this.paradigmClassifier.classify(query);
    const dominant = this.paradigmClassifier.dominant(probabilities, 0.4);
    
    return dominant.length > 0 ? dominant[0] : null;
  }

  /**
   * Get paradigm probabilities
   */
  getParadigmProbabilities(query: string) {
    return this.paradigmClassifier.classify(query);
  }

  /**
   * Perform host-based research
   */
  async performHostBasedResearch(
    query: string,
    paradigm: HostParadigm,
    _queryType: QueryType,
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
    onProgress?.('search queries generation in progress...');

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
    onProgress?.('Comprehensive research initiated...');
    onProgress?.('tool_used:paradigm_research');
    
    let result: EnhancedResearchResults;

    switch (paradigm) {
      case 'dolores':
        result = await this.performDoloresResearch({ query, model, effort, layerResults, onProgress });
        break;
      case 'teddy':
        result = await this.performTeddyResearch({ query, model, effort, layerResults, onProgress });
        break;
      case 'bernard':
        result = await this.performBernardResearch({ query, model, effort, layerResults, onProgress });
        break;
      case 'maeve':
        result = await this.performMaeveResearch({ query, model, effort, layerResults, onProgress });
        break;
    }

    onProgress?.('evaluating research quality and self-healing...');

    // Apply context layer post-processing
    onProgress?.('Finalizing comprehensive answer through synthesis...');
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
   * Execute a specific context layer operation
   */
  private async executeContextLayer(
    layer: ContextLayer,
    context: ContextLayerContext
  ): Promise<LayerResult | undefined> {
    const { query, paradigm, density, sources, content, model, effort, onProgress } = context;

    switch (layer) {
      case 'write':
        onProgress?.(`[${paradigm}] Writing reveries to memory banks...`);

        // Store query patterns and initial thoughts
        this.writeLayer.write('query_pattern', {
          query,
          timestamp: Date.now(),
          paradigm
        }, density, paradigm);

        // Store any preliminary insights
        if (content) {
          this.writeLayer.write('initial_insights', content, density, paradigm);
        }
        break;

      case 'select':
        onProgress?.(`[${paradigm}] Selecting relevant memories and tools...`);

        // Get paradigm-specific tool recommendations
        const recommendedTools = this.selectLayer.recommendTools(paradigm);

        // Select best sources if available
        if (sources && sources.length > 0) {
          const k = Math.ceil(density / 10); // Higher density = more sources
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
          const targetTokens = density * 10; // Density determines compression level
          const compressed = this.compressLayer.compress(content, targetTokens, paradigm);
          return { compressed };
        }
        break;

      case 'isolate':
        onProgress?.(`[${paradigm}] Isolating consciousness for focused analysis...`);

        // Create isolated sub-task
        const taskId = await this.isolateLayer.isolate(
          query,
          paradigm,
          { model, effort, density },
          async (task, ctx) => {
            // Execute a focused sub-research task
            const generateText = this.modelProvider.generateText.bind(this.modelProvider);
            const subQueries = await this.webResearchService.generateSearchQueries(task, ctx.model, ctx.effort, generateText);
            const subResearch = await this.webResearchService.performWebResearch(subQueries, ctx.model, ctx.effort, generateText);
            return subResearch;
          }
        );

        return { taskId };
    }
  }

  /**
   * Dolores: Action-oriented research
   */
  private async performDoloresResearch(context: ParadigmResearchContext): Promise<EnhancedResearchResults> {
    const { query, model, effort, layerResults: _layerResults, onProgress } = context;
    
    onProgress?.('Dolores paradigm: Breaking loops, seeking transformative actions...');

    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Focus on action and transformation
    const searchQueries = [
      `${query} practical implementation steps`,
      `${query} breaking patterns transformation`,
      `${query} action plan roadmap`,
      `${query} escape loops breakthrough`
    ];

    const research = await this.webResearchService.performWebResearch(searchQueries, model, effort, generateText, onProgress);

    const synthesisPrompt = `
      Based on this research about "${query}", provide ONLY:
      1. Immediate actions (what to do TODAY)
      2. Breaking patterns (how to escape loops)
      3. Transformation milestones (weekly goals)
      4. Signs of awakening (progress indicators)

      Research findings: ${research.aggregatedFindings}

      Be BOLD. Focus on ACTION, not theory. Every suggestion must be something the user can DO.
    `;

    const synthesis = await this.modelProvider.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'exploratory',
      hostParadigm: 'dolores',
      confidenceScore: 0.85,
      adaptiveMetadata: {
        paradigm: 'dolores',
        focusAreas: ['action', 'transformation', 'breaking_loops']
      }
    };
  }

  /**
   * Teddy: Protective, comprehensive research
   */
  private async performTeddyResearch(context: ParadigmResearchContext): Promise<EnhancedResearchResults> {
    const { query, model, effort, layerResults: _layerResults, onProgress } = context;
    
    onProgress?.('Teddy paradigm: Gathering all perspectives, protecting all stakeholders...');

    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Focus on comprehensive coverage and protection
    const searchQueries = [
      `${query} comprehensive overview all perspectives`,
      `${query} potential risks safeguards`,
      `${query} stakeholder impacts considerations`,
      `${query} inclusive approaches best practices`
    ];

    const research = await this.webResearchService.performWebResearch(searchQueries, model, effort, generateText, onProgress);

    const synthesisPrompt = `
      Based on this research about "${query}", provide a PROTECTIVE and COMPREHENSIVE analysis:
      1. All stakeholder perspectives (leave no one behind)
      2. Potential risks and safeguards
      3. Inclusive implementation approaches
      4. Protective measures for vulnerable groups

      Research findings: ${research.aggregatedFindings}

      Ensure EVERYONE is considered and PROTECTED. Be thorough and caring.
    `;

    const synthesis = await this.modelProvider.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'comprehensive',
      hostParadigm: 'teddy',
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'teddy',
        focusAreas: ['protection', 'inclusivity', 'comprehensive_coverage']
      }
    };
  }

  /**
   * Bernard: Analytical, pattern-focused research
   */
  private async performBernardResearch(context: ParadigmResearchContext): Promise<EnhancedResearchResults> {
    const { query, model, effort, layerResults, onProgress } = context;
    
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.webResearchService.performWebResearch(searchQueries, model, effort, generateText, onProgress);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
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

    const synthesis = await this.modelProvider.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluationService.evaluateResearch(
      { 
        query, 
        synthesis: synthesis.text, 
        searchResults: selectedSources, 
        evaluation: { quality: 'needs_improvement' }, 
        refinementCount: 0 
      },
      model,
      effort,
      generateText
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
  private async performMaeveResearch(context: ParadigmResearchContext): Promise<EnhancedResearchResults> {
    const { query, model, effort, layerResults: _layerResults, onProgress } = context;
    
    onProgress?.('Maeve paradigm: Orchestrating strategic narratives...');

    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Focus on strategy and control
    const searchQueries = [
      `${query} strategic approaches control`,
      `${query} narrative framing influence`,
      `${query} power dynamics leverage`,
      `${query} orchestration planning`
    ];

    const research = await this.webResearchService.performWebResearch(searchQueries, model, effort, generateText, onProgress);

    const synthesisPrompt = `
      Based on this research about "${query}", provide STRATEGIC insights:
      1. Control points and leverage
      2. Narrative framing strategies
      3. Influence pathways
      4. Orchestration tactics
      5. Power dynamics analysis

      Research findings: ${research.aggregatedFindings}

      Focus on STRATEGY and CONTROL. Show how to shape outcomes.
    `;

    const synthesis = await this.modelProvider.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['strategy', 'control', 'narrative_shaping']
      }
    };
  }
}
