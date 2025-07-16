/**
 * Research utility functions
 * Common utilities used across research services
 */

import { Citation, QueryType } from '../../types';
import { EnhancedResearchResults, EvaluationMetadata } from '../research/types';

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
   * Calculate confidence score for research results
   */
  static calculateConfidenceScore(result: EnhancedResearchResults): number {
    let score = 0.5; // Base confidence

    // Evaluation metadata contributes 30%
    if (result.evaluationMetadata) {
      const evalScore = this.calculateEvaluationScore(result.evaluationMetadata);
      score += evalScore * 0.3;
    }

    // Number of sources contributes 20%
    const sourceScore = Math.min(result.sources.length / 10, 1);
    score += sourceScore * 0.2;

    // Synthesis length appropriateness contributes 10%
    const synthesisLength = result.synthesis.length;
    const lengthScore = synthesisLength > 500 && synthesisLength < 5000 ? 1 : 0.5;
    score += lengthScore * 0.1;

    // Refinement iterations contribute 15%
    if (result.refinementCount) {
      const refinementScore = Math.min(result.refinementCount / 3, 1);
      score += refinementScore * 0.15;
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate evaluation score from metadata
   */
  private static calculateEvaluationScore(metadata: EvaluationMetadata): number {
    const scores = [
      metadata.completeness || 0,
      metadata.accuracy || 0,
      metadata.clarity || 0
    ];

    return scores.reduce((acc, score) => acc + score, 0) / scores.length;
  }

  /**
   * Calculate query complexity score
   */
  static calculateComplexityScore(query: string, queryType: QueryType): number {
    let score = 0.3; // Base complexity

    // Query length contributes to complexity
    const wordCount = query.split(/\s+/).length;
    score += Math.min(wordCount / 20, 0.3);

    // Query type complexity
    const typeComplexity = {
      'factual': 0.1,
      'analytical': 0.3,
      'comparative': 0.25,
      'exploratory': 0.2
    };
    score += typeComplexity[queryType] || 0.2;

    // Check for complexity indicators
    const complexityIndicators = [
      'analyze', 'compare', 'evaluate', 'assess', 'explain',
      'relationship', 'impact', 'effect', 'influence', 'correlation'
    ];

    const hasComplexityIndicators = complexityIndicators.some(
      indicator => query.toLowerCase().includes(indicator)
    );

    if (hasComplexityIndicators) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate a cache key for research results
   */
  static generateCacheKey(query: string, paradigm?: HostParadigm): string {
    const normalizedQuery = query.toLowerCase().trim();
    return paradigm ? `${normalizedQuery}:${paradigm}` : normalizedQuery;
  }

  /**
   * Check if a result needs self-healing based on quality metrics
   */
  static needsSelfHealing(result: EnhancedResearchResults): boolean {
    // Check confidence score
    if (result.confidenceScore && result.confidenceScore < 0.4) {
      return true;
    }

    // Check synthesis length
    if (result.synthesis.length < 200) {
      return true;
    }

    // Check source count
    if (result.sources.length < 2) {
      return true;
    }

    // Check evaluation scores
    if (result.evaluationMetadata) {
      const avgScore = this.calculateEvaluationScore(result.evaluationMetadata);
      if (avgScore < 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Deduplicate sources based on normalized keys
   */
  static deduplicateSources(sources: Citation[]): Citation[] {
    const seen = new Map<string, Citation>();

    for (const source of sources) {
      const key = this.normalizeSourceKey(source);
      if (!seen.has(key)) {
        seen.set(key, source);
      }
    }

    return Array.from(seen.values());
  }
}
