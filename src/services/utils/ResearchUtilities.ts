import type { Citation, QueryType, EnhancedResearchResults } from '@/services/research/types';

export class ResearchUtilities {
  /**
   * Normalize a source citation for deduplication
   */
  static normalizeSourceKey(source: Citation): string {
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
  static normalizeUrl(url: string): string {
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
   * Check if two queries are similar using Jaccard similarity
   */
  static isQuerySimilar(query1: string, query2: string): boolean {
    const words1 = new Set(query1.split(/\s+/));
    const words2 = new Set(query2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity > 0.3
    return intersection.size / union.size > 0.3;
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  static calculateConfidenceScore(result: EnhancedResearchResults): number {
    let confidence = 0.5; // Base confidence

    // Factor in evaluation metadata
    if (result.evaluationMetadata) {
      const avgQuality = (
        (result.evaluationMetadata.completeness || 0.5) +
        (result.evaluationMetadata.accuracy || 0.5) +
        (result.evaluationMetadata.clarity || 0.5)
      ) / 3;
      confidence += avgQuality * 0.3;
    }

    // Factor in number of sources
    if (result.sources && result.sources.length > 0) {
      confidence += Math.min(result.sources.length / 10, 0.2); // Up to 0.2 boost for sources
    }

    // Factor in synthesis length (neither too short nor too long)
    const synthesisLength = result.synthesis.length;
    if (synthesisLength > 200 && synthesisLength < 5000) {
      confidence += 0.1;
    }

    // Factor in refinement iterations (more iterations = higher confidence)
    if (result.refinementCount && result.refinementCount > 1) {
      confidence += Math.min(result.refinementCount * 0.05, 0.15);
    }

    // Paradigm-specific confidence adjustments
    if (result.hostParadigm) {
      // Bernard gets confidence boost when evaluation exists
      if (result.hostParadigm === 'bernard' && result.evaluationMetadata) {
        confidence += 0.05;
      }

      // Maeve gets confidence boost for strategic metrics
      if (result.hostParadigm === 'maeve' && result.adaptiveMetadata?.focusAreas?.includes('strategic_leverage')) {
        confidence += 0.03;
      }

      // Teddy gets confidence boost for comprehensive sources
      if (result.hostParadigm === 'teddy' && result.sources.length > 5) {
        confidence += 0.04;
      }

      // Dolores gets confidence boost for action-oriented results
      if (result.hostParadigm === 'dolores' && result.adaptiveMetadata?.focusAreas?.includes('action_steps')) {
        confidence += 0.04;
      }
    }

    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Calculate query complexity score
   */
  static calculateComplexityScore(query: string, queryType: QueryType): number {
    let complexity = 0.3; // Base complexity

    // Factor in query length
    const wordCount = query.split(/\s+/).length;
    complexity += Math.min(wordCount / 100, 0.3);

    // Factor in query type
    const typeComplexity = {
      factual: 0.1,
      analytical: 0.4,
      comparative: 0.3,
      exploratory: 0.2,
      comprehensive: 0.5
    };
    complexity += typeComplexity[queryType];

    // Factor in question complexity indicators
    const complexityIndicators = [
      'compare', 'analyze', 'evaluate', 'explain why', 'how does',
      'relationship between', 'impact of', 'pros and cons'
    ];

    const queryLower = query.toLowerCase();
    const matchingIndicators = complexityIndicators.filter(indicator =>
      queryLower.includes(indicator)
    ).length;

    complexity += matchingIndicators * 0.1;

    return Math.min(Math.max(complexity, 0), 1);
  }

  /**
   * Deduplicate sources based on normalized keys
   */
  static deduplicateSources(sources: Citation[]): Citation[] {
    const uniqueSourceKeys = new Set<string>();
    const uniqueSources: Citation[] = [];

    sources.forEach(source => {
      const sourceKey = this.normalizeSourceKey(source);
      if (!uniqueSourceKeys.has(sourceKey)) {
        uniqueSourceKeys.add(sourceKey);
        uniqueSources.push(source);
      }
    });

    return uniqueSources;
  }

  /**
   * Generate cache key with optional paradigm awareness
   */
  static generateCacheKey(query: string, paradigm?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    return paradigm ? `${paradigm}:${normalizedQuery}` : normalizedQuery;
  }

  /**
   * Check if result needs self-healing based on quality metrics
   */
  static needsSelfHealing(result: EnhancedResearchResults): boolean {
    // Check if evaluation indicates improvement needed
    if (result.evaluationMetadata?.quality === 'needs_improvement') {
      return true;
    }

    // Check for low confidence scores (35% threshold as per diagram)
    if (result.confidenceScore !== undefined && result.confidenceScore < 0.35) {
      return true;
    }

    // Check for very short synthesis (likely incomplete)
    if (result.synthesis.length < 100) {
      return true;
    }

    // Check for lack of sources
    if (!result.sources || result.sources.length === 0) {
      return true;
    }

    // Check evaluation metrics if available
    if (result.evaluationMetadata) {
      const { completeness = 0, accuracy = 0, clarity = 0 } = result.evaluationMetadata;
      if (completeness < 0.5 || accuracy < 0.5 || clarity < 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create fallback key for tracking attempts
   */
  static createFallbackKey(prompt: string): string {
    return `${prompt.substring(0, 50)}_${Date.now()}`;
  }
}
