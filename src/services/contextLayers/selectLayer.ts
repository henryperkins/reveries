import { HostParadigm, Citation } from '@/types';
import { EmbeddingService } from '@/services/ai/EmbeddingService';

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
  private embeddingService: EmbeddingService;
  private embeddingCache: Map<string, import('@/services/ai/EmbeddingService').EmbeddingVector> = new Map();

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

  private constructor() {
    this.embeddingService = EmbeddingService.getInstance();
  }

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
    k = 5,
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
    const hybridResults = await this.hybridRetrieve(query, sources, paradigm);

    // Apply paradigm-specific reranking
    const rerankedResults = this.rerank(hybridResults);

    // Return top k sources
    return rerankedResults.slice(0, k).map(result => result.source);
  }

  /**
   * ACE-Graph Hybrid Retrieval implementation
   * Combines semantic similarity with keyword matching
   */
  private async hybridRetrieve(query: string, sources: Citation[], paradigm: HostParadigm): Promise<RetrievalResult[]> {
    const queryLower = query.toLowerCase();
    const strategy = this.strategies[paradigm];

    // Process sources in parallel for better performance
    const retrievalPromises = sources.map(async (source) => {
      // Semantic scoring with real embeddings
      const semanticScore = await this.calculateSemanticSimilarity(query, source);
      
      // Keyword scoring based on paradigm priorities
      const keywordScore = this.calculateKeywordScore(queryLower, source, strategy);
      
      // Combined score with weights
      const combinedScore = (semanticScore * 0.6) + (keywordScore * 0.4);
      
      return {
        source,
        semanticScore,
        keywordScore,
        combinedScore,
        relevanceReason: this.generateRelevanceReason(source, strategy, semanticScore, keywordScore)
      };
    });

    // Wait for all calculations to complete
    const results = await Promise.all(retrievalPromises);
    return results;
  }

  private async calculateSemanticSimilarity(query: string, source: Citation): Promise<number> {
    try {
      // Get or generate embeddings
      const queryEmbedding = await this.getOrGenerateEmbedding(query);
      const sourceText = `${source.title || ''} ${source.snippet || ''}`;
      const sourceEmbedding = await this.getOrGenerateEmbedding(sourceText);
      
      // Calculate cosine similarity
      return this.embeddingService.calculateSimilarity(queryEmbedding, sourceEmbedding);
    } catch (error) {
      console.warn('Failed to calculate semantic similarity, falling back to keyword matching:', error);
      // Fallback to simple keyword matching
      const queryWords = query.toLowerCase().split(' ');
      const sourceText = `${source.title || ''} ${source.snippet || ''}`.toLowerCase();
      
      const matchedWords = queryWords.filter(word => 
        word.length > 2 && sourceText.includes(word)
      );
      
      return matchedWords.length / Math.max(queryWords.length, 1);
    }
  }

  private async getOrGenerateEmbedding(text: string): Promise<import('@/services/ai/EmbeddingService').EmbeddingVector> {
    // Check cache first
    const cached = this.embeddingCache.get(text);
    if (cached) return cached;
    
    // Generate new embedding
    const embedding = await this.embeddingService.generateEmbedding(text);
    
    // Cache it (limit cache size to prevent memory issues)
    if (this.embeddingCache.size > 1000) {
      // Remove oldest entries
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    this.embeddingCache.set(text, embedding);
    
    return embedding;
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
