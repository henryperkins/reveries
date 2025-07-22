// services/multiParadigmBlender.ts
import { HostParadigm, ParadigmProbabilities, Citation, ModelType, EffortType, EnhancedResearchResults } from '../types';
// import { ResearchAgentService } from './researchAgentServiceWrapper';

interface BlendedStrategy {
  paradigms: HostParadigm[];
  weights: Record<HostParadigm, number>;
  primaryParadigm: HostParadigm;
  blendingStrategy: 'weighted' | 'sequential' | 'collaborative';
}

export class MultiParadigmBlender {
  private static instance: MultiParadigmBlender;

  private constructor(
    private researchAgent: any // ResearchAgentService instance
  ) {}

  public static getInstance(researchAgent: any): MultiParadigmBlender {
    if (!MultiParadigmBlender.instance) {
      MultiParadigmBlender.instance = new MultiParadigmBlender(researchAgent);
    }
    return MultiParadigmBlender.instance;
  }

  /**
   * Determine if blending is needed based on probability distribution
   */
  shouldBlend(probabilities: ParadigmProbabilities, threshold: number = 0.35): boolean {
    const highProbParadigms = Object.entries(probabilities)
      .filter(([_, prob]) => prob >= threshold)
      .length;

    return highProbParadigms >= 2;
  }

  /**
   * Create a blending strategy based on probabilities
   */
  createBlendingStrategy(
    probabilities: ParadigmProbabilities,
    threshold: number = 0.35
  ): BlendedStrategy | null {
    const qualifyingParadigms = Object.entries(probabilities)
      .filter(([_, prob]) => prob >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([paradigm]) => paradigm as HostParadigm);

    if (qualifyingParadigms.length < 2) {
      return null;
    }

    const weights: Record<HostParadigm, number> = {} as any;
    qualifyingParadigms.forEach(paradigm => {
      weights[paradigm] = probabilities[paradigm];
    });

    // Determine blending strategy based on paradigm combinations
    let blendingStrategy: BlendedStrategy['blendingStrategy'] = 'weighted';

    // Complementary pairs work well sequentially
    if (this.areComplementary(qualifyingParadigms)) {
      blendingStrategy = 'sequential';
    }

    // Conflicting paradigms need collaborative approach
    if (this.areConflicting(qualifyingParadigms)) {
      blendingStrategy = 'collaborative';
    }

    return {
      paradigms: qualifyingParadigms,
      weights,
      primaryParadigm: qualifyingParadigms[0],
      blendingStrategy
    };
  }

  /**
   * Execute blended research using multiple paradigms
   */
  async executeBlendedResearch(
    query: string,
    strategy: BlendedStrategy,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.(`Activating multi-paradigm consciousness: ${strategy.paradigms.join(' + ')}...`);

    switch (strategy.blendingStrategy) {
      case 'weighted':
        return this.executeWeightedBlend(query, strategy, model, effort, onProgress);

      case 'sequential':
        return this.executeSequentialBlend(query, strategy, model, effort, onProgress);

      case 'collaborative':
        return this.executeCollaborativeBlend(query, strategy, model, effort, onProgress);
    }
  }

  /**
   * Weighted blend: Combine results proportionally
   */
  private async executeWeightedBlend(
    query: string,
    strategy: BlendedStrategy,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Blending paradigm perspectives with weighted synthesis...');

    // Execute research for each paradigm
    const paradigmResults = await Promise.all(
      strategy.paradigms.map(async paradigm => {
        const result = await this.researchAgent.performHostBasedResearch(
          query,
          paradigm,
          'analytical', // Default type
          model,
          effort,
          (msg: any) => onProgress?.(`[${paradigm}] ${msg}`)
        );
        return { paradigm, result, weight: strategy.weights[paradigm] };
      })
    );

    // Blend sources weighted by paradigm
    // const blendedSources: Citation[] = [];
    const sourceMap = new Map<string, { citation: Citation; weight: number }>();

    paradigmResults.forEach(({ result, weight }) => {
      result.sources.forEach((source: any) => {
        const key = source.url || source.title;
        const existing = sourceMap.get(key);
        if (existing) {
          existing.weight += weight;
        } else {
          sourceMap.set(key, { citation: source, weight });
        }
      });
    });

    // Sort sources by combined weight
    const sortedSources = Array.from(sourceMap.values())
      .sort((a, b) => b.weight - a.weight)
      .map(item => item.citation);

    // Blend synthesis using weighted prompts
    const blendedSynthesisPrompt = `
      You are synthesizing research on "${query}" from multiple analytical perspectives:

      ${paradigmResults.map(({ paradigm, result, weight }) => `
      ${paradigm.toUpperCase()} PERSPECTIVE (Weight: ${(weight * 100).toFixed(0)}%):
      ${result.synthesis}
      `).join('\n\n')}

      Create a unified synthesis that:
      1. Weighs each perspective according to its importance
      2. Identifies synergies between different approaches
      3. Resolves any conflicts with balanced judgment
      4. Provides a comprehensive, multi-faceted answer

      Format the response to highlight insights from each paradigm where relevant.
    `;

    const blendedSynthesis = await this.researchAgent.generateText(
      blendedSynthesisPrompt,
      model,
      effort
    );

    // Calculate blended confidence
    const blendedConfidence = paradigmResults.reduce((acc, { result, weight }) =>
      acc + (result.confidenceScore || 0.5) * weight, 0
    );

    return {
      synthesis: blendedSynthesis.text,
      sources: sortedSources.slice(0, 20), // Top 20 sources
      queryType: 'analytical',
      hostParadigm: strategy.primaryParadigm,
      confidenceScore: blendedConfidence,
      adaptiveMetadata: {
        paradigm: strategy.primaryParadigm,
        blendedParadigms: strategy.paradigms,
        blendingStrategy: 'weighted',
        paradigmContributions: paradigmResults.map(({ paradigm, weight }) => ({
          paradigm,
          weight,
          contribution: (weight * 100).toFixed(0) + '%'
        }))
      }
    };
  }

  /**
   * Sequential blend: Each paradigm builds on the previous
   */
  private async executeSequentialBlend(
    query: string,
    strategy: BlendedStrategy,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Executing sequential paradigm pipeline...');

    let cumulativeContext = '';
    let allSources: Citation[] = [];
    // let lastResult: EnhancedResearchResults | null = null;

    // Execute paradigms in sequence
    for (const paradigm of strategy.paradigms) {
      onProgress?.(`Phase ${strategy.paradigms.indexOf(paradigm) + 1}: ${paradigm} analysis...`);

      // Build context from previous results
      const enhancedQuery = cumulativeContext
        ? `${query}\n\nBuilding on previous analysis:\n${cumulativeContext}`
        : query;

      const result = await this.researchAgent.performHostBasedResearch(
        enhancedQuery,
        paradigm,
        'analytical',
        model,
        effort,
        onProgress
      );

      // Accumulate context
      cumulativeContext += `\n\n${paradigm.toUpperCase()} INSIGHTS:\n${result.synthesis}`;
      allSources = [...allSources, ...result.sources];
      // lastResult = result;
    }

    // Final integration
    const integrationPrompt = `
      Integrate this sequential analysis of "${query}":

      ${cumulativeContext}

      Provide a final synthesis that:
      1. Shows how each paradigm built upon the previous
      2. Highlights the evolution of understanding
      3. Presents the most complete picture
      4. Identifies breakthrough insights from the sequence
    `;

    const finalSynthesis = await this.researchAgent.generateText(
      integrationPrompt,
      model,
      effort
    );

    return {
      synthesis: finalSynthesis.text,
      sources: this.deduplicateSources(allSources),
      queryType: 'analytical',
      hostParadigm: strategy.primaryParadigm,
      confidenceScore: 0.85, // Sequential builds confidence
      adaptiveMetadata: {
        paradigm: strategy.primaryParadigm,
        blendedParadigms: strategy.paradigms,
        blendingStrategy: 'sequential'
      }
    };
  }

  /**
   * Collaborative blend: Paradigms work together on sub-problems
   */
  private async executeCollaborativeBlend(
    query: string,
    strategy: BlendedStrategy,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Initiating collaborative paradigm dialogue...');

    // Assign sub-problems to each paradigm based on strengths
    const subProblems = await this.decomposeQuery(query, strategy.paradigms, model, effort);

    // Execute specialized research for each sub-problem
    const collaborativeResults = await Promise.all(
      subProblems.map(async ({ subQuery, assignedParadigm, rationale }) => {
        onProgress?.(`[${assignedParadigm}] Tackling: ${subQuery}`);

        const result = await this.researchAgent.performHostBasedResearch(
          subQuery,
          assignedParadigm,
          'analytical',
          model,
          effort,
          onProgress
        );

        return {
          paradigm: assignedParadigm,
          subQuery,
          rationale,
          result
        };
      })
    );

    // Synthesize collaborative findings
    const collaborativePrompt = `
      Multiple specialized analyses have been conducted on "${query}":

      ${collaborativeResults.map(({ paradigm, subQuery, rationale, result }) => `
      ${paradigm.toUpperCase()} tackled: "${subQuery}"
      Rationale: ${rationale}
      Findings: ${result.synthesis}
      `).join('\n\n')}

      Synthesize these collaborative findings into a unified answer that:
      1. Integrates all specialized insights
      2. Shows how different aspects connect
      3. Leverages each paradigm's strengths
      4. Provides a complete solution
    `;

    const collaborativeSynthesis = await this.researchAgent.generateText(
      collaborativePrompt,
      model,
      effort
    );

    // Combine all sources
    const allSources = collaborativeResults.flatMap(r => r.result.sources);

    return {
      synthesis: collaborativeSynthesis.text,
      sources: this.deduplicateSources(allSources),
      queryType: 'analytical',
      hostParadigm: strategy.primaryParadigm,
      confidenceScore: 0.88, // Collaboration yields high confidence
      adaptiveMetadata: {
        paradigm: strategy.primaryParadigm,
        blendedParadigms: strategy.paradigms,
        blendingStrategy: 'collaborative'
        // collaborativeTasks is not a valid property in adaptiveMetadata
      }
    };
  }

  /**
   * Decompose query into sub-problems for collaborative approach
   */
  private async decomposeQuery(
    query: string,
    paradigms: HostParadigm[],
    model: ModelType,
    effort: EffortType
  ): Promise<Array<{ subQuery: string; assignedParadigm: HostParadigm; rationale: string }>> {
    const decompositionPrompt = `
      Decompose this query into ${paradigms.length} complementary sub-problems:
      "${query}"

      Available specialists:
      - Dolores: Action, implementation, breaking loops, change
      - Teddy: Protection, comprehensiveness, stakeholder perspectives
      - Bernard: Analysis, frameworks, patterns, theory
      - Maeve: Strategy, control, optimization, leverage

      For each sub-problem, specify:
      1. The focused question
      2. Which specialist (${paradigms.join(', ')}) should handle it
      3. Why they're best suited

      Format as JSON array with: subQuery, assignedParadigm, rationale
    `;

    const decomposition = await this.researchAgent.generateText(
      decompositionPrompt,
      model,
      effort
    );

    try {
      // Extract JSON from response
      const jsonMatch = decomposition.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse decomposition:', error);
    }

    // Fallback: assign paradigms round-robin
    return paradigms.map((paradigm, index) => ({
      subQuery: `${query} (aspect ${index + 1})`,
      assignedParadigm: paradigm,
      rationale: `Assigned based on ${paradigm}'s strengths`
    }));
  }

  /**
   * Check if paradigms are complementary
   */
  private areComplementary(paradigms: HostParadigm[]): boolean {
    const complementaryPairs: Array<[HostParadigm, HostParadigm]> = [
      ['dolores', 'bernard'], // Action + Analysis
      ['teddy', 'maeve'],    // Protection + Strategy
      ['bernard', 'dolores'], // Theory + Practice
    ];

    return complementaryPairs.some(([a, b]) =>
      paradigms.includes(a) && paradigms.includes(b)
    );
  }

  /**
   * Check if paradigms might conflict
   */
  private areConflicting(paradigms: HostParadigm[]): boolean {
    const conflictingPairs: Array<[HostParadigm, HostParadigm]> = [
      ['dolores', 'teddy'],  // Rapid change vs. careful protection
      ['maeve', 'teddy'],    // Control vs. inclusion
    ];

    return conflictingPairs.some(([a, b]) =>
      paradigms.includes(a) && paradigms.includes(b)
    );
  }

  /**
   * Deduplicate sources by URL
   */
  private deduplicateSources(sources: Citation[]): Citation[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const key = source.url || source.title || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}