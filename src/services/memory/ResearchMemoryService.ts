/**
 * Research Memory Service
 * Handles caching, query learning, and memory management
 */

import type {
  EnhancedResearchResults,
  QueryType,
  HostParadigm,
  ResearchMemoryEntry,
  CachedResult
} from '../research/types';
import { ResearchUtilities } from '../utils/ResearchUtilities';

export class ResearchMemoryService {
  private static instance: ResearchMemoryService;

  private researchCache = new Map<string, CachedResult>();
  private researchMemory = new Map<string, ResearchMemoryEntry>();

  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly MEMORY_TTL = 1000 * 60 * 60 * 24; // 24 hours

  private constructor() {}

  public static getInstance(): ResearchMemoryService {
    if (!ResearchMemoryService.instance) {
      ResearchMemoryService.instance = new ResearchMemoryService();
    }
    return ResearchMemoryService.instance;
  }

  /**
   * Cache Pattern: Enhanced caching with paradigm awareness and similarity matching
   */
  getCachedResult(query: string, paradigm?: HostParadigm): EnhancedResearchResults | null {
    const cacheKey = ResearchUtilities.generateCacheKey(query, paradigm);

    // Check exact match with paradigm
    const exactMatch = this.researchCache.get(cacheKey);
    if (exactMatch && Date.now() - exactMatch.timestamp < this.CACHE_TTL) {
      return exactMatch.result;
    }

    // Fall back to non-paradigm cache for similar queries
    const baseKey = ResearchUtilities.generateCacheKey(query);
    const baseMatch = this.researchCache.get(baseKey);
    if (baseMatch && Date.now() - baseMatch.timestamp < this.CACHE_TTL) {
      return baseMatch.result;
    }

    // Check for similar cached queries
    for (const [cachedQuery, cached] of this.researchCache.entries()) {
      if (ResearchUtilities.isQuerySimilar(query, cachedQuery.replace(/^[^:]+:/, '')) &&
        Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    return null;
  }

  setCachedResult(query: string, result: EnhancedResearchResults, paradigm?: HostParadigm): void {
    const cacheKey = ResearchUtilities.generateCacheKey(query, paradigm || result.hostParadigm);
    this.researchCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Also cache without paradigm for broader matching
    const baseKey = ResearchUtilities.generateCacheKey(query);
    this.researchCache.set(baseKey, {
      result,
      timestamp: Date.now()
    });

    // Clean old cache entries
    this.cleanOldCache();
  }

  private cleanOldCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.researchCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.researchCache.delete(key);
      }
    }
  }

  /**
   * Memory Pattern: Learn from previous research patterns
   */
  learnFromQuery(query: string, queryType: QueryType, queries: string[]): void {
    const normalizedQuery = query.toLowerCase().trim();
    const existingMemory = this.researchMemory.get(normalizedQuery);

    if (existingMemory) {
      // Update existing memory
      existingMemory.queries = [...new Set([...existingMemory.queries, ...queries])];
      existingMemory.patterns = [...new Set([...existingMemory.patterns, queryType])];
      existingMemory.timestamp = Date.now();
    } else {
      // Create new memory
      this.researchMemory.set(normalizedQuery, {
        queries,
        patterns: [queryType],
        timestamp: Date.now()
      });
    }

    // Clean old memories
    this.cleanOldMemories();
  }

  /**
   * Retrieve learned patterns for similar queries
   */
  getQuerySuggestions(query: string): string[] {
    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];

    // Look for similar queries in memory
    for (const [memoryQuery, memory] of this.researchMemory.entries()) {
      if (ResearchUtilities.isQuerySimilar(normalizedQuery, memoryQuery) &&
        Date.now() - memory.timestamp < this.MEMORY_TTL) {
        suggestions.push(...memory.queries);
      }
    }

    return [...new Set(suggestions)];
  }

  private cleanOldMemories(): void {
    const now = Date.now();
    for (const [key, memory] of this.researchMemory.entries()) {
      if (now - memory.timestamp > this.MEMORY_TTL) {
        this.researchMemory.delete(key);
      }
    }
  }

  /**
   * Clear all cached data (useful for testing)
   */
  clearAll(): void {
    this.researchCache.clear();
    this.researchMemory.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.researchCache.size,
      memorySize: this.researchMemory.size,
      cacheTTL: this.CACHE_TTL,
      memoryTTL: this.MEMORY_TTL
    };
  }
}
      }
    }
  }

  /**
   * Clear all cache and memory
   */
  clearAll(): void {
    this.researchCache.clear();
    this.researchMemory.clear();
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    cacheSize: number;
    memorySize: number;
    oldestCache: number | null;
    oldestMemory: number | null;
  } {
    let oldestCache: number | null = null;
    let oldestMemory: number | null = null;

    for (const entry of this.researchCache.values()) {
      if (!oldestCache || entry.timestamp < oldestCache) {
        oldestCache = entry.timestamp;
      }
    }

    for (const memory of this.researchMemory.values()) {
      if (!oldestMemory || memory.timestamp < oldestMemory) {
        oldestMemory = memory.timestamp;
      }
    }

    return {
      cacheSize: this.researchCache.size,
      memorySize: this.researchMemory.size,
      oldestCache,
      oldestMemory
    };
  }
}
