/**
 * Research Memory Service
 * Handles caching, query learning, and memory management
 */

import { HostParadigm } from '../../types';
import {
  EnhancedResearchResults,
  ResearchMemoryEntry,
  ResearchCacheEntry
} from '../research/types';
import { ResearchUtilities } from '../utils/ResearchUtilities';

export class ResearchMemoryService {
  private static instance: ResearchMemoryService;

  private researchCache: Map<string, ResearchCacheEntry> = new Map();
  private researchMemory: Map<string, ResearchMemoryEntry> = new Map();

  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly MEMORY_TTL = 1000 * 60 * 60 * 24; // 24 hours

  private constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanOldCache();
      this.cleanOldMemories();
    }, 1000 * 60 * 5); // Clean every 5 minutes
  }

  public static getInstance(): ResearchMemoryService {
    if (!ResearchMemoryService.instance) {
      ResearchMemoryService.instance = new ResearchMemoryService();
    }
    return ResearchMemoryService.instance;
  }

  /**
   * Get cached research result
   */
  getCachedResult(query: string, paradigm?: HostParadigm): EnhancedResearchResults | null {
    const cacheKey = ResearchUtilities.generateCacheKey(query, paradigm);

    // Check exact match
    const cached = this.researchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        ...cached.result,
        adaptiveMetadata: {
          ...cached.result.adaptiveMetadata,
          cacheHit: true
        }
      };
    }

    // Check for similar queries
    for (const [key, value] of this.researchCache.entries()) {
      const [cachedQuery] = key.split(':');
      if (ResearchUtilities.isQuerySimilar(query, cachedQuery) &&
          Date.now() - value.timestamp < this.CACHE_TTL) {
        return {
          ...value.result,
          adaptiveMetadata: {
            ...value.result.adaptiveMetadata,
            cacheHit: true
          }
        };
      }
    }

    return null;
  }

  /**
   * Cache research result
   */
  cacheResult(query: string, result: EnhancedResearchResults, paradigm?: HostParadigm): void {
    const cacheKey = ResearchUtilities.generateCacheKey(query, paradigm);
    this.researchCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Learn from query patterns
   */
  learnFromQuery(query: string, queryType: QueryType, searchQueries: string[]): void {
    const normalizedQuery = query.toLowerCase().trim();
    const existingMemory = this.researchMemory.get(normalizedQuery);

    if (existingMemory) {
      // Update existing memory
      existingMemory.queries = [...new Set([...existingMemory.queries, ...searchQueries])];
      existingMemory.patterns = [...new Set([...existingMemory.patterns, queryType])];
      existingMemory.timestamp = Date.now();
    } else {
      // Create new memory
      this.researchMemory.set(normalizedQuery, {
        queries: searchQueries,
        patterns: [queryType],
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get query suggestions based on learned patterns
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

  /**
   * Get learned patterns for a query
   */
  getLearnedPatterns(query: string): QueryType[] {
    const normalizedQuery = query.toLowerCase().trim();
    const patterns: QueryType[] = [];

    for (const [memoryQuery, memory] of this.researchMemory.entries()) {
      if (ResearchUtilities.isQuerySimilar(normalizedQuery, memoryQuery) &&
          Date.now() - memory.timestamp < this.MEMORY_TTL) {
        patterns.push(...memory.patterns);
      }
    }

    return [...new Set(patterns)];
  }

  /**
   * Clean old cache entries
   */
  private cleanOldCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.researchCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.researchCache.delete(key);
      }
    }
  }

  /**
   * Clean old memory entries
   */
  private cleanOldMemories(): void {
    const now = Date.now();
    for (const [key, memory] of this.researchMemory.entries()) {
      if (now - memory.timestamp > this.MEMORY_TTL) {
        this.researchMemory.delete(key);
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
