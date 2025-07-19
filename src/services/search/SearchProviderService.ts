/**
 * SearchProviderService - Provides real web search capabilities
 * Supports multiple search providers with fallback strategies
 */

import { Citation } from '@/types';
import { getEnv } from '@/utils/getEnv';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  relevanceScore?: number;
  source?: string;
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  region?: string;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  domains?: string[];
  excludeDomains?: string[];
  fileType?: string;
  safe?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  searchTime?: number;
  provider: string;
  query: string;
}

export interface SearchProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
  getRateLimit(): { remaining: number; resetTime: number };
}

// Bing Search API Provider
class BingSearchProvider implements SearchProvider {
  name = 'bing';
  private apiKey: string;
  private endpoint: string;
  private rateLimit = { remaining: 1000, resetTime: Date.now() + 86400000 };

  constructor(apiKey?: string, endpoint = 'https://api.bing.microsoft.com/v7.0/search') {
    this.apiKey = apiKey || getEnv('VITE_BING_SEARCH_API_KEY', 'BING_SEARCH_API_KEY') || '';
    this.endpoint = endpoint;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && typeof fetch !== 'undefined';
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (!await this.isAvailable()) {
      throw new Error('Bing Search provider not available');
    }

    const searchParams = new URLSearchParams({
      q: this.buildSearchQuery(query, options),
      count: Math.min(options.maxResults || 10, 50).toString(),
      offset: '0',
      mkt: options.language || 'en-US',
      responseFilter: 'webpages',
      textDecorations: 'false',
      textFormat: 'Raw'
    });

    if (options.timeRange) {
      searchParams.append('freshness', this.mapTimeRange(options.timeRange));
    }

    if (options.safe !== false) {
      searchParams.append('safeSearch', 'Moderate');
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.endpoint}?${searchParams}`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const searchTime = Date.now() - startTime;

      // Update rate limit from headers
      const remaining = response.headers.get('X-MSEdge-ClientID');
      if (remaining) {
        this.rateLimit.remaining = parseInt(remaining, 10) || this.rateLimit.remaining;
      }

      const results = this.parseBingResults(data.webPages?.value || []);
      
      return {
        results,
        totalResults: data.webPages?.totalEstimatedMatches,
        searchTime,
        provider: this.name,
        query
      };
    } catch (error) {
      console.error('Bing search failed:', error);
      throw error;
    }
  }

  private buildSearchQuery(query: string, options: SearchOptions): string {
    let searchQuery = query;

    if (options.domains && options.domains.length > 0) {
      const siteQueries = options.domains.map(domain => `site:${domain}`).join(' OR ');
      searchQuery += ` (${siteQueries})`;
    }

    if (options.excludeDomains && options.excludeDomains.length > 0) {
      const excludeQueries = options.excludeDomains.map(domain => `-site:${domain}`).join(' ');
      searchQuery += ` ${excludeQueries}`;
    }

    if (options.fileType) {
      searchQuery += ` filetype:${options.fileType}`;
    }

    return searchQuery;
  }

  private mapTimeRange(timeRange: string): string {
    const mapping: Record<string, string> = {
      day: 'Day',
      week: 'Week',
      month: 'Month',
      year: 'Year'
    };
    return mapping[timeRange] || 'Week';
  }

  private parseBingResults(results: any[]): SearchResult[] {
    return results.map(result => ({
      title: result.name || 'No title',
      url: result.url || '',
      snippet: result.snippet || '',
      publishedDate: result.dateLastCrawled,
      relevanceScore: this.calculateRelevance(result),
      source: 'bing'
    }));
  }

  private calculateRelevance(result: any): number {
    // Simple relevance calculation based on available metadata
    let score = 0.5;
    
    if (result.name && result.name.length > 10) score += 0.1;
    if (result.snippet && result.snippet.length > 50) score += 0.1;
    if (result.dateLastCrawled) {
      const daysSinceUpdate = (Date.now() - new Date(result.dateLastCrawled).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) score += 0.1;
      if (daysSinceUpdate < 7) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  getRateLimit() {
    return this.rateLimit;
  }
}

// Google Custom Search Engine Provider
class GoogleSearchProvider implements SearchProvider {
  name = 'google';
  private apiKey: string;
  private searchEngineId: string;
  private endpoint = 'https://www.googleapis.com/customsearch/v1';
  private rateLimit = { remaining: 100, resetTime: Date.now() + 86400000 };
  private dailyUsage = { count: 0, date: new Date().toDateString() };

  constructor(apiKey?: string, searchEngineId?: string) {
    this.apiKey = apiKey || getEnv('VITE_GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_API_KEY') || '';
    this.searchEngineId = searchEngineId || getEnv('VITE_GOOGLE_SEARCH_ENGINE_ID', 'GOOGLE_SEARCH_ENGINE_ID') || '';
  }

  async isAvailable(): Promise<boolean> {
    // Check basic availability
    if (!this.apiKey || !this.searchEngineId || typeof fetch === 'undefined') {
      return false;
    }
    
    // Check daily quota (Google CSE free tier: 100 queries/day)
    const today = new Date().toDateString();
    if (this.dailyUsage.date !== today) {
      // Reset daily usage for new day
      this.dailyUsage = { count: 0, date: today };
      this.rateLimit.remaining = 100;
    }
    
    // Check if we have remaining quota
    return this.dailyUsage.count < 100 && this.rateLimit.remaining > 0;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (!await this.isAvailable()) {
      throw new Error('Google Search provider quota exceeded or unavailable');
    }
    
    // Track quota usage before making the request
    this.dailyUsage.count++;
    this.rateLimit.remaining = Math.max(0, 100 - this.dailyUsage.count);
    
    // Add request headers for better API performance (per REST API documentation)
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Reveries-Research-Agent/1.0'
    };

    const searchParams = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: this.buildSearchQuery(query, options),
      num: Math.min(options.maxResults || 10, 10).toString(), // Google CSE max is 10
      gl: options.region || 'us',
      hl: options.language || 'en',
      // Additional parameters for better results (per REST API documentation)
      fields: 'items(title,link,snippet,pagemap),searchInformation(totalResults,searchTime)',
      prettyPrint: 'false' // Reduce response size
    });

    if (options.timeRange) {
      searchParams.append('dateRestrict', this.mapTimeRange(options.timeRange));
    }

    if (options.safe !== false) {
      searchParams.append('safe', 'medium');
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.endpoint}?${searchParams}`, {
        headers,
        method: 'GET'
      });

      const data = await response.json();
      const searchTime = Date.now() - startTime;

      // Handle specific Google API errors according to REST API documentation
      if (!response.ok || data.error) {
        const error = data.error || { code: response.status, message: response.statusText };
        
        // Handle quota exceeded errors specifically
        if (error.code === 403 && error.message?.includes('Quota exceeded')) {
          console.warn(`[GoogleSearchProvider] Daily quota exceeded`);
          this.rateLimit.remaining = 0;
          throw new Error('Google Search API daily quota exceeded. Try again tomorrow or upgrade to paid tier.');
        }
        
        // Handle invalid API key
        if (error.code === 400 && error.message?.includes('API key not valid')) {
          console.error(`[GoogleSearchProvider] Invalid API key`);
          throw new Error('Google Search API key is invalid. Please check your VITE_GOOGLE_SEARCH_API_KEY configuration.');
        }
        
        // Handle invalid search engine ID
        if (error.code === 400 && error.message?.includes('Invalid Value')) {
          console.error(`[GoogleSearchProvider] Invalid search engine ID`);
          throw new Error('Google Custom Search Engine ID is invalid. Please check your VITE_GOOGLE_SEARCH_ENGINE_ID configuration.');
        }
        
        console.error(`[GoogleSearchProvider] API Error:`, error);
        throw new Error(`Google Search API error: ${error.message || 'Unknown error'}`);
      }

      // Enhanced logging for debugging
      console.log(`[GoogleSearchProvider] Query: "${query}"`);
      console.log(`[GoogleSearchProvider] Response status: ${response.status}`);
      console.log(`[GoogleSearchProvider] Search time: ${searchTime}ms`);
      console.log(`[GoogleSearchProvider] Total results: ${data.searchInformation?.totalResults || 0}`);
      console.log(`[GoogleSearchProvider] Items returned: ${data.items?.length || 0}`);

      const results = this.parseGoogleResults(data.items || []);
      
      // Log sample results for debugging
      if (results.length > 0) {
        console.log(`[GoogleSearchProvider] Sample result:`, {
          title: results[0].title,
          url: results[0].url,
          snippet: results[0].snippet.substring(0, 100) + '...'
        });
      }
      
      return {
        results,
        totalResults: parseInt(data.searchInformation?.totalResults || '0', 10),
        searchTime,
        provider: this.name,
        query
      };
    } catch (error) {
      console.error('Google search failed:', error);
      throw error;
    }
  }

  private buildSearchQuery(query: string, options: SearchOptions): string {
    let searchQuery = query;

    if (options.domains && options.domains.length > 0) {
      const siteQueries = options.domains.map(domain => `site:${domain}`).join(' OR ');
      searchQuery += ` (${siteQueries})`;
    }

    if (options.excludeDomains && options.excludeDomains.length > 0) {
      const excludeQueries = options.excludeDomains.map(domain => `-site:${domain}`).join(' ');
      searchQuery += ` ${excludeQueries}`;
    }

    if (options.fileType) {
      searchQuery += ` filetype:${options.fileType}`;
    }

    return searchQuery;
  }

  private mapTimeRange(timeRange: string): string {
    const mapping: Record<string, string> = {
      day: 'd1',
      week: 'w1',
      month: 'm1',
      year: 'y1'
    };
    return mapping[timeRange] || 'w1';
  }

  private parseGoogleResults(results: any[]): SearchResult[] {
    return results.map(result => ({
      title: result.title || 'No title',
      url: result.link || '',
      snippet: result.snippet || '',
      publishedDate: result.pagemap?.metatags?.[0]?.['article:published_time'],
      relevanceScore: this.calculateRelevance(result),
      source: 'google'
    }));
  }

  private calculateRelevance(result: any): number {
    // Simple relevance calculation
    let score = 0.5;
    
    if (result.title && result.title.length > 10) score += 0.1;
    if (result.snippet && result.snippet.length > 50) score += 0.1;
    if (result.pagemap?.metatags) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  getRateLimit() {
    return this.rateLimit;
  }
}

// DuckDuckGo Provider (uses their instant answer API - limited)
class DuckDuckGoProvider implements SearchProvider {
  name = 'duckduckgo';
  private endpoint = 'https://api.duckduckgo.com/';
  private rateLimit = { remaining: 1000, resetTime: Date.now() + 86400000 };

  async isAvailable(): Promise<boolean> {
    return typeof fetch !== 'undefined';
  }

  async search(query: string, _options: SearchOptions = {}): Promise<SearchResponse> {
    // Note: DuckDuckGo's API is very limited for web search
    // This is mainly for instant answers and basic info
    // options parameter is unused for DuckDuckGo API
    const searchParams = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1'
    });

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.endpoint}?${searchParams}`);

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      const searchTime = Date.now() - startTime;

      const results = this.parseDuckDuckGoResults(data);
      
      return {
        results,
        totalResults: results.length,
        searchTime,
        provider: this.name,
        query
      };
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      throw error;
    }
  }

  private parseDuckDuckGoResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    // Add instant answer if available
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || 'Instant Answer',
        url: data.AbstractURL,
        snippet: data.Abstract,
        relevanceScore: 0.9,
        source: 'duckduckgo-instant'
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text,
            relevanceScore: 0.6,
            source: 'duckduckgo-related'
          });
        }
      });
    }

    return results;
  }

  getRateLimit() {
    return this.rateLimit;
  }
}

export class SearchProviderService {
  private static instance: SearchProviderService;
  private providers: SearchProvider[] = [];
  // Remove unused currentProviderIndex
  private cache: Map<string, { response: SearchResponse; timestamp: number }> = new Map();
  private readonly cacheTimeout = 3600000; // 1 hour

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): SearchProviderService {
    if (!SearchProviderService.instance) {
      SearchProviderService.instance = new SearchProviderService();
    }
    return SearchProviderService.instance;
  }

  private initializeProviders(): void {
    // Prioritize Google for better quality, with Bing as primary fallback
    this.providers = [
      new GoogleSearchProvider(),  // Primary: Best quality, 100/day limit
      new BingSearchProvider(),     // Fallback 1: Good quality, higher limits
      new DuckDuckGoProvider()      // Fallback 2: Privacy-focused, basic results
    ];
  }

  private async getAvailableProvider(): Promise<SearchProvider> {
    // Try providers in order until one is available
    console.log(`[SearchProviderService] Checking ${this.providers.length} providers...`);
    
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        console.log(`[SearchProviderService] Provider ${provider.name}: ${isAvailable ? 'available' : 'not available'}`);
        
        if (isAvailable) {
          const rateLimit = provider.getRateLimit();
          console.log(`[SearchProviderService] Provider ${provider.name} rate limit: ${rateLimit.remaining} remaining`);
          
          if (rateLimit.remaining > 0) {
            console.log(`[SearchProviderService] Selected provider: ${provider.name}`);
            return provider;
          } else {
            console.log(`[SearchProviderService] Provider ${provider.name} rate limited, trying next...`);
          }
        }
      } catch (error) {
        console.warn(`[SearchProviderService] Provider ${provider.name} check failed:`, error);
        // Continue to next provider
      }
    }
    throw new Error('All search providers exhausted or rate limited. Please try again later.');
  }

  public async search(
    query: string, 
    options: SearchOptions = {}, 
    onProgress?: (message: string) => void
  ): Promise<SearchResponse> {
    const cacheKey = `${query}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Returning cached search results');
      onProgress?.('tool_used:search_cache');
      return cached.response;
    }

    try {
      const startTime = Date.now();
      const provider = await this.getAvailableProvider();
      console.log(`Using search provider: ${provider.name}`);
      onProgress?.(`tool_used:${provider.name}_search`);
      
      const response = await provider.search(query, options);
      onProgress?.(`tool_used:completed:${provider.name}_search:${startTime}`);
      
      // Cache the response
      this.cache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Search failed with all providers:', error);
      throw error;
    }
  }

  public async searchMultiple(queries: string[], options: SearchOptions = {}): Promise<SearchResponse[]> {
    const promises = queries.map(query => 
      this.search(query, options).catch(error => {
        console.error(`Search failed for query "${query}":`, error);
        return {
          results: [],
          totalResults: 0,
          provider: 'failed',
          query
        } as SearchResponse;
      })
    );

    return Promise.all(promises);
  }

  public convertToCitations(searchResults: SearchResult[]): Citation[] {
    return searchResults.map(result => ({
      url: result.url,
      title: result.title,
      snippet: result.snippet,
      relevanceScore: result.relevanceScore || 0.5,
      accessed: new Date().toISOString(),
      published: result.publishedDate,
      source: result.source
    }));
  }

  public async testProviders(): Promise<Array<{provider: string; available: boolean; error?: string}>> {
    const results = [];
    
    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable();
        if (available) {
          // Test with a simple query
          await provider.search('test', { maxResults: 1 });
          results.push({ provider: provider.name, available: true });
        } else {
          results.push({ 
            provider: provider.name, 
            available: false, 
            error: 'Provider not configured' 
          });
        }
      } catch (error) {
        results.push({ 
          provider: provider.name, 
          available: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number; oldestEntry: number } {
    const timestamps = Array.from(this.cache.values()).map(v => v.timestamp);
    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0
    };
  }
}