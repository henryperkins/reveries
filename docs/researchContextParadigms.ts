// Updates to services/research services.ts

import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';
import { CompressLayerService } from './contextLayers/compressLayer';
import { IsolateLayerService } from './contextLayers/isolateLayer';

// Add these services as properties
private writeLayer = WriteLayerService.getInstance();
private selectLayer = SelectLayerService.getInstance();
private compressLayer = CompressLayerService.getInstance();
private isolateLayer = IsolateLayerService.getInstance();

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
        return compressed;
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
          const subQueries = await this.generateSearchQueries(task, ctx.model, ctx.effort);
          const subResearch = await this.performWebResearch(subQueries, ctx.model, ctx.effort);
          return subResearch;
        }
      );
      
      // For demonstration, wait briefly then continue
      // In production, this could run truly async
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
 * Enhanced performHostBasedResearch with context layer pipeline
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

    // Add layer to graph metadata
    if (this.graphManager) {
      const currentNode = this.graphManager.getCurrentNode();
      if (currentNode) {
        this.graphManager.updateNodeMetadata(currentNode.id, {
          contextLayer: layer,
          paradigmProbabilities: this.lastParadigmProbabilities || undefined
        });
      }
    }
  }

  // Now execute the paradigm-specific research
  let result: EnhancedResearchResults;
  
  switch (paradigm) {
    case 'dolores':
      result = await this.performDoloresResearchEnhanced(query, model, effort, onProgress, layerResults);
      break;
    case 'teddy':
      result = await this.performTeddyResearchEnhanced(query, model, effort, onProgress, layerResults);
      break;
    case 'bernard':
      result = await this.performBernardResearchEnhanced(query, model, effort, onProgress, layerResults);
      break;
    case 'maeve':
      result = await this.performMaeveResearchEnhanced(query, model, effort, onProgress, layerResults);
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
 * Enhanced Dolores research with context layer integration
 */
private async performDoloresResearchEnhanced(
  query: string,
  model: ModelType,
  effort: EffortType,
  onProgress?: (message: string) => void,
  layerResults: Record<string, any>
): Promise<EnhancedResearchResults> {
  onProgress?.('Dolores paradigm: Awakening to bold actions... breaking narrative loops...');

  // Use selected tools if available
  const tools = layerResults.select?.recommendedTools || [];
  
  // Focus on decisive implementation and change
  const searchQueries = [
    `${query} decisive actions real examples`,
    `${query} awakening changes case studies`,
    `${query} freedom implementation steps`,
    ...tools.map(tool => `${query} ${tool}`)
  ];

  const research = await this.performWebResearch(searchQueries, model, effort);

  // Apply source selection from select layer
  let selectedSources = research.allSources;
  if (layerResults.select?.selectedSources) {
    selectedSources = layerResults.select.selectedSources;
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

// Similar enhancements for other paradigms...
private async performTeddyResearchEnhanced(
  query: string,
  model: ModelType,
  effort: EffortType,
  onProgress?: (message: string) => void,
  layerResults: Record<string, any>
): Promise<EnhancedResearchResults> {
  // Implementation similar to Dolores but with Teddy's focus
  // Uses comprehensive sources, stakeholder perspectives
  // Applies protective formatting
  
  // ... (abbreviated for space)
  
  return {} as EnhancedResearchResults;
}

private async performBernardResearchEnhanced(
  query: string,
  model: ModelType,
  effort: EffortType,
  onProgress?: (message: string) => void,
  layerResults: Record<string, any>
): Promise<EnhancedResearchResults> {
  // Implementation with academic focus
  // Prioritizes peer-reviewed sources
  // Structured analytical output
  
  // ... (abbreviated for space)
  
  return {} as EnhancedResearchResults;
}

private async performMaeveResearchEnhanced(
  query: string,
  model: ModelType,
  effort: EffortType,
  onProgress?: (message: string) => void,
  layerResults: Record<string, any>
): Promise<EnhancedResearchResults> {
  // Implementation with strategic focus
  // Maps control points and leverage
  // Optimized for impact
  
  // ... (abbreviated for space)
  
  return {} as EnhancedResearchResults;
}
