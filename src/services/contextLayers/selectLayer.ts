import { HostParadigm, Citation } from '@/types';

interface SelectionStrategy {
  paradigm: HostParadigm;
  toolPriorities: string[];
  sourcePriorities: string[];
  selectionCriteria: (source: Citation) => number;
}

interface RetrievalResult {
  source: Citation;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  relevanceReason: string;
}

export class SelectLayerService {
  private static instance: SelectLayerService;

  private strategies: Record<HostParadigm, SelectionStrategy> = {
    dolores: {
      paradigm: 'dolores',
      toolPriorities: ['action_planner', 'implementation_guide', 'change_tracker'],
      sourcePriorities: ['case studies', 'success stories', 'implementation'],
      selectionCriteria: (source) => {
        const actionWords = ['implement', 'action', 'change', 'transform', 'achieve'];
        const score = actionWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    },
    teddy: {
      paradigm: 'teddy',
      toolPriorities: ['stakeholder_mapper', 'risk_assessor', 'consensus_builder'],
      sourcePriorities: ['comprehensive', 'balanced', 'stakeholder', 'safety'],
      selectionCriteria: (source) => {
        const protectiveWords = ['comprehensive', 'thorough', 'safety', 'all', 'complete'];
        const score = protectiveWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    },
    bernard: {
      paradigm: 'bernard',
      toolPriorities: ['academic_search', 'pattern_analyzer', 'framework_builder'],
      sourcePriorities: ['peer-reviewed', 'academic', 'theoretical', 'framework'],
      selectionCriteria: (source) => {
        const analyticalWords = ['analysis', 'framework', 'theory', 'model', 'pattern'];
        const score = analyticalWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        // Boost for academic sources
        if (source.url?.includes('.edu') || source.url?.includes('scholar')) {
          return score + 2;
        }
        return score;
      }
    },
    maeve: {
      paradigm: 'maeve',
      toolPriorities: ['competitor_analyzer', 'influence_mapper', 'optimization_engine'],
      sourcePriorities: ['strategic', 'competitive', 'leverage', 'control'],
      selectionCriteria: (source) => {
        const strategicWords = ['strategy', 'competitive', 'leverage', 'control', 'optimize'];
        const score = strategicWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    }
  };

  private constructor() {}

  public static getInstance(): SelectLayerService {
    if (!SelectLayerService.instance) {
      SelectLayerService.instance = new SelectLayerService();
    }
    return SelectLayerService.instance;
  }

  /**
   * Simplified select method - requires query and sources for proper source selection
   * Use selectSources() directly for full functionality
   */
  async select(
    paradigm: HostParadigm,
    k: number = 5,
    query?: string,
    sources?: Citation[]
  ): Promise<{
    recommendedTools: string[];
    selectedSources: Citation[];
  }> {
    const recommendedTools = this.recommendTools(paradigm);
    
    // If query and sources provided, actually select sources
    if (query && sources && sources.length > 0) {
      const selectedSources = await this.selectSources(query, sources, paradigm, k);
      return { recommendedTools, selectedSources };
    }
    
    // Otherwise return empty sources with warning
    console.warn('SelectLayer.select() called without query/sources - returning empty selectedSources. Use selectSources() directly for proper source selection.');
    return {
      recommendedTools,
      selectedSources: []
    };
  }

  async selectSources(
    query: string,
    sources: Citation[],
    paradigm: HostParadigm,
    k: number
  ): Promise<Citation[]> {
    // ACE-Graph hybrid retrieval: combine semantic and keyword scoring
    const hybridResults = this.hybridRetrieve(query, sources, paradigm);

    // Apply paradigm-specific reranking
    const rerankedResults = this.rerank(hybridResults);

    // Return top k sources
    return rerankedResults.slice(0, k).map(result => result.source);
  }

  /**
   * ACE-Graph Hybrid Retrieval implementation
   * Combines semantic similarity with keyword matching
   */
  private hybridRetrieve(query: string, sources: Citation[], paradigm: HostParadigm): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const queryLower = query.toLowerCase();
    const strategy = this.strategies[paradigm];

    for (const source of sources) {
      // Semantic scoring (simplified - would use actual embeddings in production)
      const semanticScore = this.calculateSemanticSimilarity(query, source);
      
      // Keyword scoring based on paradigm priorities
      const keywordScore = this.calculateKeywordScore(queryLower, source, strategy);
      
      // Combined score with weights
      const combinedScore = (semanticScore * 0.6) + (keywordScore * 0.4);
      
      results.push({
        source,
        semanticScore,
        keywordScore,
        combinedScore,
        relevanceReason: this.generateRelevanceReason(source, strategy, semanticScore, keywordScore)
      });
    }

    return results;
  }

  private calculateSemanticSimilarity(query: string, source: Citation): number {
    // Simplified semantic similarity - in production would use embeddings
    const queryWords = query.toLowerCase().split(' ');
    const sourceText = `${source.title || ''} ${source.snippet || ''}`.toLowerCase();
    
    const matchedWords = queryWords.filter(word => 
      word.length > 2 && sourceText.includes(word)
    );
    
    return matchedWords.length / Math.max(queryWords.length, 1);
  }

  private calculateKeywordScore(_query: string, source: Citation, strategy: SelectionStrategy): number {
    const sourceText = `${source.title || ''} ${source.snippet || ''}`.toLowerCase();
    
    // Base paradigm criteria score
    let score = strategy.selectionCriteria(source);
    
    // Boost for priority terms
    for (const priority of strategy.sourcePriorities) {
      if (sourceText.includes(priority.toLowerCase())) {
        score += 0.5;
      }
    }
    
    // Normalize to 0-1 range
    return Math.min(score / 5, 1);
  }

  private rerank(results: RetrievalResult[]): RetrievalResult[] {
    // Sort by combined score
    results.sort((a, b) => b.combinedScore - a.combinedScore);
    
    // Apply MMR-style diversification for top results
    const diversified = this.applyDiversification(results);
    
    return diversified;
  }

  private applyDiversification(results: RetrievalResult[]): RetrievalResult[] {
    const diversified: RetrievalResult[] = [];
    const used = new Set<string>();
    
    for (const result of results) {
      const sourceKey = this.getSourceKey(result.source);
      
      // Avoid duplicate domains for diversity
      if (!used.has(sourceKey)) {
        diversified.push(result);
        used.add(sourceKey);
      }
      
      if (diversified.length >= 20) break; // Limit to reasonable number
    }
    
    return diversified;
  }

  private getSourceKey(source: Citation): string {
    if (source.url) {
      try {
        const domain = new URL(source.url).hostname;
        return domain;
      } catch {
        return source.url;
      }
    }
    return source.title || 'unknown';
  }

  private generateRelevanceReason(source: Citation, strategy: SelectionStrategy, semanticScore: number, keywordScore: number): string {
    const reasons: string[] = [];
    
    if (semanticScore > 0.7) reasons.push('high semantic relevance');
    if (keywordScore > 0.7) reasons.push(`matches ${strategy.paradigm} priorities`);
    
    const sourceText = `${source.title || ''} ${source.snippet || ''}`.toLowerCase();
    for (const priority of strategy.sourcePriorities) {
      if (sourceText.includes(priority.toLowerCase())) {
        reasons.push(`contains "${priority}"`);
        break;
      }
    }
    
    return reasons.join(', ') || 'general relevance';
  }

  recommendTools(paradigm: HostParadigm): string[] {
    return this.strategies[paradigm].toolPriorities;
  }

  getSourcePriorities(paradigm: HostParadigm): string[] {
    return this.strategies[paradigm].sourcePriorities;
  }
}
