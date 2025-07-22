/**
 * SearchProviderService - Provides real web search capabilities
 * Supports multiple search providers with fallback strategies
 */

import { Citation } from '@/types';
import { getEnv } from '@/utils/getEnv';
import { RateLimiter, estimateTokens } from '../rateLimiter';

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

export interface ExaResearchTask {
  id: string;
  status: 'running' | 'completed' | 'failed';
  instructions: string;
  schema?: Record<string, unknown>;
  data?: Record<string, unknown>;
  citations?: Record<string, Citation[]>;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface ExaResearchTaskList {
  requestId: string;
  data: ExaResearchTask[];
  hasMore: boolean;
  nextCursor?: string;
}

// Type definitions for external APIs
interface BingWebPage {
  name?: string;
  url?: string;
  snippet?: string;
  dateLastCrawled?: string;
}

interface BingSearchResponse {
  webPages?: {
    value?: BingWebPage[];
    totalEstimatedMatches?: number;
  };
}

interface GoogleSearchItem {
  title?: string;
  link?: string;
  snippet?: string;
  pagemap?: {
    metatags?: Record<string, string>[];
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
  };
}

interface ExaSearchResult {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
  score?: number;
  summary?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

interface ExaContentsResponse {
  results?: {
    url?: string;
    text?: string;
    highlights?: string[];
  }[];
}

interface ExaFindSimilarResponse {
  results?: ExaSearchResult[];
}

interface ExaResearchCreateResponse {
  id: string;
}

interface ExaResearchGetResponse {
  id: string;
  status: 'running' | 'completed' | 'failed';
  instructions: string;
  data?: Record<string, unknown>;
  error?: string;
}

// Bing Search API Provider
class BingSearchProvider implements SearchProvider {
  name = 'bing';
  private apiKey: string;
  private endpoint: string;
  private rateLimit = { remaining: 1000, resetTime: Date.now() + 86400000 };
  private rateLimiter = RateLimiter.getInstance();

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
      // Apply rate limiting for Bing API call
      const estimatedTokens = estimateTokens(query) + 100; // Add overhead for API call
      await this.rateLimiter.waitForCapacity(estimatedTokens);

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

      const data = (await response.json()) as BingSearchResponse;
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

  private parseBingResults(results: BingWebPage[]): SearchResult[] {
    return results.map(result => ({
      title: result.name || 'No title',
      url: result.url || '',
      snippet: result.snippet || '',
      publishedDate: result.dateLastCrawled,
      relevanceScore: this.calculateRelevance(result),
      source: 'bing'
    }));
  }

  private calculateRelevance(result: BingWebPage): number {
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
  private rateLimiter = RateLimiter.getInstance();

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
      // Apply rate limiting for Google API call
      const estimatedTokens = estimateTokens(query) + 100; // Add overhead for API call
      await this.rateLimiter.waitForCapacity(estimatedTokens);

      const startTime = Date.now();
      const response = await fetch(`${this.endpoint}?${searchParams}`, {
        headers,
        method: 'GET'
      });

      const data = (await response.json()) as GoogleSearchResponse;
      const searchTime = Date.now() - startTime;

      // Handle specific Google API errors according to REST API documentation
      if (!response.ok || (data as Record<string, unknown>).error) {
        const error = ((data as Record<string, unknown>).error as { code: number; message: string }) || { code: response.status, message: response.statusText };

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

  private parseGoogleResults(results: GoogleSearchItem[]): SearchResult[] {
    return results.map(result => ({
      title: result.title || 'No title',
      url: result.link || '',
      snippet: result.snippet || '',
      publishedDate: result.pagemap?.metatags?.[0]?.['article:published_time'],
      relevanceScore: this.calculateRelevance(result),
      source: 'google'
    }));
  }

  private calculateRelevance(result: GoogleSearchItem): number {
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

// Exa Search Provider
class ExaSearchProvider implements SearchProvider {
  name = 'exa';
  private apiKey: string;
  private endpoint = 'https://api.exa.ai';
  private rateLimit = { remaining: 1000, resetTime: Date.now() + 86400000 };
  private rateLimiter = RateLimiter.getInstance();
  private exaSDK: { search?: (query: string, options: Record<string, unknown>) => Promise<ExaSearchResponse>; research?: { createTask: (options: Record<string, unknown>) => Promise<ExaResearchCreateResponse>; getTask: (id: string) => Promise<ExaResearchGetResponse> } } | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getEnv('VITE_EXA_API_KEY', 'EXA_API_KEY') || '';
    this.initializeSDK();
  }

  private async initializeSDK() {
    try {
      // Try to dynamically import the official Exa SDK if available
      const ExaModule = await import('exa-js').catch(() => null);

      if (ExaModule) {
        const Exa = ExaModule.default || ExaModule;
        this.exaSDK = new Exa(this.apiKey) as unknown as { search?: (query: string, options: Record<string, unknown>) => Promise<ExaSearchResponse>; research?: { createTask: (options: Record<string, unknown>) => Promise<ExaResearchCreateResponse>; getTask: (id: string) => Promise<ExaResearchGetResponse> } };
        console.log('[ExaSearchProvider] Using official Exa SDK');
      } else {
        this.exaSDK = null;
        console.log('[ExaSearchProvider] Exa SDK not found, using direct HTTP calls');
      }
    } catch (_error) {
      // SDK not available, fall back to HTTP calls
      console.log('[ExaSearchProvider] Exa SDK initialization failed, using direct HTTP calls');
      this.exaSDK = null;
    }
  }

  private async executeCustomHeaders(headerConfig: any): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(headerConfig)) {
      if (typeof value === 'string') {
        // Check if it's a function string
        if (value.trim().startsWith('function') || value.includes('=>')) {
          try {
            // Use eval in a controlled way with strict validation
            const funcStr = value.trim();
            if (!/^(function\s*\(.*\)\s*{[\s\S]*}|.*=>\s*[\s\S]*)$/.test(funcStr)) {
              throw new Error('Invalid function format');
            }

            // Create function in isolated scope
            const func = (0, eval)(`(${funcStr})`);
            if (typeof func === 'function') {
              headers[key] = await func();
            }
          } catch (error) {
            console.error(`Failed to execute custom header function for ${key}:`, error);
          }
        } else {
          headers[key] = value;
        }
      }
    }

    return headers;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && typeof fetch !== 'undefined';
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    // Apply rate limiting for Exa API call
    const estimatedTokens = estimateTokens(query) + 150; // Add overhead for API call
    await this.rateLimiter.waitForCapacity(estimatedTokens);

    const startTime = Date.now();

    try {
      // Use SDK if available, otherwise fall back to HTTP
      if (this.exaSDK && this.exaSDK.search) {
        return await this.searchWithSDK(query, options, startTime);
      } else {
        return await this.searchWithHTTP(query, options, startTime);
      }
    } catch (error) {
      console.error('Exa search failed:', error);
      throw error;
    }
  }

  private async searchWithSDK(query: string, options: SearchOptions, startTime: number): Promise<SearchResponse> {
    const searchOptions: Record<string, unknown> = {
      query: this.buildSearchQuery(query, options),
      type: 'auto',
      numResults: Math.min(options.maxResults || 10, 100),
      text: true,
      highlights: {
        numSentences: 3,
        highlightsPerUrl: 2
      }
    };

    // Add domain filtering
    if (options.domains && options.domains.length > 0) {
      searchOptions.includeDomains = options.domains;
    }
    if (options.excludeDomains && options.excludeDomains.length > 0) {
      searchOptions.excludeDomains = options.excludeDomains;
    }

    // Add time filtering
    if (options.timeRange) {
      searchOptions.startCrawlDate = this.mapTimeRange(options.timeRange);
      searchOptions.endCrawlDate = new Date().toISOString();
    }

    const data = await this.exaSDK!.search!(query, searchOptions);
    const searchTime = Date.now() - startTime;

    const results = this.parseExaResults(data.results || []);

    return {
      results,
      totalResults: data.results?.length || 0,
      searchTime,
      provider: this.name,
      query
    };
  }

  private async searchWithHTTP(query: string, options: SearchOptions, startTime: number): Promise<SearchResponse> {
    const requestBody: Record<string, unknown> = {
      query: this.buildSearchQuery(query, options),
      type: 'auto',
      numResults: Math.min(options.maxResults || 10, 100),
      contents: {
        text: true,
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2
        }
      },
      ...(options.domains && options.domains.length > 0 && {
        includeDomains: options.domains
      }),
      ...(options.excludeDomains && options.excludeDomains.length > 0 && {
        excludeDomains: options.excludeDomains
      }),
      ...(options.timeRange && {
        startCrawlDate: this.mapTimeRange(options.timeRange),
        endCrawlDate: new Date().toISOString()
      })
    };

    const response = await fetch(`${this.endpoint}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as ExaSearchResponse;
    const searchTime = Date.now() - startTime;

    const results = this.parseExaResults(data.results || []);

    return {
      results,
      totalResults: data.results?.length || 0,
      searchTime,
      provider: this.name,
      query
    };
  }

  private buildSearchQuery(query: string, options: SearchOptions): string {
    let searchQuery = query;

    // Exa handles domain filtering via includeDomains/excludeDomains parameters
    // so we don't need to modify the query string for that

    if (options.fileType) {
      searchQuery += ` filetype:${options.fileType}`;
    }

    return searchQuery;
  }

  private mapTimeRange(timeRange: string): string {
    const now = new Date();
    const mapping: Record<string, Date> = {
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };
    return (mapping[timeRange] || mapping.week).toISOString();
  }

  private parseExaResults(results: ExaSearchResult[]): SearchResult[] {
    return results.map(result => ({
      title: result.title || 'No title',
      url: result.url || '',
      snippet: this.extractSnippet(result),
      publishedDate: result.publishedDate,
      relevanceScore: result.score || 0.5,
      source: 'exa'
    }));
  }

  private extractSnippet(result: ExaSearchResult): string {
    // Try highlights first, then text, then fallback
    if (result.highlights && result.highlights.length > 0) {
      return result.highlights.join(' ... ');
    }
    if (result.text) {
      // Truncate to reasonable snippet length
      return result.text.length > 300
        ? result.text.substring(0, 300) + '...'
        : result.text;
    }
    return result.summary || '';
  }

  getRateLimit() {
    return this.rateLimit;
  }

  /**
   * Get full content from URLs using Exa's contents endpoint
   */
  async getContents(urls: string[], options?: { text?: boolean; summary?: boolean }): Promise<{ url?: string; text?: string; highlights?: string[] }[]> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    const requestBody = {
      urls,
      text: options?.text ?? true,
      summary: options?.summary ?? false
    };

    try {
      const response = await fetch(`${this.endpoint}/contents`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa Contents API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as ExaContentsResponse;
      return data.results || [];
    } catch (error) {
      console.error('Exa get contents failed:', error);
      throw error;
    }
  }

  /**
   * Find similar links using Exa's findSimilar endpoint
   */
  async findSimilar(url: string, numResults = 10): Promise<SearchResult[]> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    const requestBody = {
      url,
      numResults: Math.min(numResults, 100),
      contents: {
        text: true,
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2
        }
      }
    };

    try {
      const response = await fetch(`${this.endpoint}/findSimilar`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa FindSimilar API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as ExaFindSimilarResponse;
      return this.parseExaResults(data.results || []);
    } catch (error) {
      console.error('Exa find similar failed:', error);
      throw error;
    }
  }

  /**
   * Create a research task using Exa's research API
   */
  async createResearchTask(
    instructions: string,
    options?: {
      model?: 'exa-research' | 'exa-research-pro';
      outputSchema?: Record<string, unknown>;
      inferSchema?: boolean;
    }
  ): Promise<string> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    try {
      // Use SDK if available
      if (this.exaSDK && this.exaSDK.research) {
        const taskOptions: Record<string, unknown> = {
          model: options?.model || 'exa-research',
          instructions
        };

        if (options?.outputSchema) {
          taskOptions.outputSchema = options.outputSchema;
        } else if (options?.inferSchema) {
          taskOptions.inferSchema = true;
        }

        const task = await this.exaSDK.research.createTask(taskOptions);
        return task.id;
      } else {
        // Fall back to HTTP
        return await this.createResearchTaskHTTP(instructions, options);
      }
    } catch (error) {
      console.error('Exa create research task failed:', error);
      throw error;
    }
  }

  private async createResearchTaskHTTP(
    instructions: string,
    options?: {
      model?: 'exa-research' | 'exa-research-pro';
      outputSchema?: Record<string, unknown>;
      inferSchema?: boolean;
    }
  ): Promise<string> {
    const requestBody: Record<string, unknown> = {
      instructions,
      model: options?.model || 'exa-research'
    };

    // Add output configuration
    if (options?.outputSchema) {
      requestBody.output = { schema: options.outputSchema };
    } else if (options?.inferSchema) {
      requestBody.output = { inferSchema: true };
    }

    const response = await fetch(`${this.endpoint}/research/v0/tasks`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa Research API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as ExaResearchCreateResponse;
    return data.id;
  }

  /**
   * Get the status and results of a research task
   */
  async getResearchTask(taskId: string): Promise<ExaResearchTask> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    try {
      // Use SDK if available
      if (this.exaSDK && this.exaSDK.research) {
        const task = await this.exaSDK.research.getTask(taskId);
        return task as ExaResearchTask;
      } else {
        // Fall back to HTTP
        const response = await fetch(`${this.endpoint}/research/v0/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Exa Research API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = (await response.json()) as ExaResearchGetResponse;
        return data as ExaResearchTask;
      }
    } catch (error) {
      console.error('Exa get research task failed:', error);
      throw error;
    }
  }

  /**
   * List research tasks with optional pagination
   */
  async listResearchTasks(options?: {
    cursor?: string;
    limit?: number
  }): Promise<ExaResearchTaskList> {
    if (!await this.isAvailable()) {
      throw new Error('Exa Search provider not available');
    }

    const searchParams = new URLSearchParams();
    if (options?.cursor) searchParams.append('cursor', options.cursor);
    if (options?.limit) searchParams.append('limit', options.limit.toString());

    try {
      const url = `${this.endpoint}/research/v0/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa Research API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as ExaResearchTaskList;
      return data;
    } catch (error) {
      console.error('Exa list research tasks failed:', error);
      throw error;
    }
  }

  /**
   * Poll a research task until completion or timeout
   */
  async pollResearchTask(
    taskId: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (task: ExaResearchTask) => void;
    }
  ): Promise<ExaResearchTask> {
    const timeoutMs = options?.timeoutMs || 300000; // 5 minutes default
    const intervalMs = options?.intervalMs || 3000; // 3 seconds default

    try {
      // Use SDK polling if available
      if (this.exaSDK && this.exaSDK.research) {
        const task = await this.exaSDK.research.getTask(taskId);
        return task as ExaResearchTask;
      } else {
        // Fall back to manual polling
        return await this.manualPollTask(taskId, timeoutMs, intervalMs, options?.onProgress);
      }
    } catch (error) {
      console.error('Exa poll research task failed:', error);
      throw error;
    }
  }

  private async manualPollTask(
    taskId: string,
    timeoutMs: number,
    intervalMs: number,
    onProgress?: (task: ExaResearchTask) => void
  ): Promise<ExaResearchTask> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const task = await this.getResearchTask(taskId);

      if (onProgress) {
        onProgress(task);
      }

      if (task.status === 'completed') {
        return task;
      } else if (task.status === 'failed') {
        throw new Error(`Research task failed: ${task.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Research task polling timeout after ${timeoutMs}ms`);
  }
}

// DuckDuckGo Provider (uses their instant answer API - limited)
class DuckDuckGoProvider implements SearchProvider {
  name = 'duckduckgo';
  private endpoint = 'https://api.duckduckgo.com/';
  private rateLimit = { remaining: 1000, resetTime: Date.now() + 86400000 };
  private rateLimiter = RateLimiter.getInstance();

  async isAvailable(): Promise<boolean> {
    return typeof fetch !== 'undefined';
  }

  async search(query: string, _options: SearchOptions = {}): Promise<SearchResponse> {
    // Note: DuckDuckGo's API is very limited for web search
    // _options parameter is reserved for future use
    void _options; // Suppress unused parameter warning
    const searchParams = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1'
    });

    try {
      // Apply rate limiting for DuckDuckGo API call
      const estimatedTokens = estimateTokens(query) + 50; // Lower overhead for DuckDuckGo
      await this.rateLimiter.waitForCapacity(estimatedTokens);

      const startTime = Date.now();
      const response = await fetch(`${this.endpoint}?${searchParams}`);

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
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

  private parseDuckDuckGoResults(data: Record<string, unknown>): SearchResult[] {
    const results: SearchResult[] = [];

    // Add instant answer if available
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: (data.Heading as string) || 'Instant Answer',
        url: data.AbstractURL as string,
        snippet: data.Abstract as string,
        relevanceScore: 0.9,
        source: 'duckduckgo-instant'
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic) => {
        const topicObj = topic as Record<string, unknown>;
        if (topicObj.FirstURL && topicObj.Text) {
          results.push({
            title: (topicObj.Text as string).split(' - ')[0] || 'Related Topic',
            url: topicObj.FirstURL as string,
            snippet: topicObj.Text as string,
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
    // Prioritize Exa for semantic search, with traditional search as fallbacks
    this.providers = [
      new ExaSearchProvider(),      // Primary: Semantic search, high quality
      new GoogleSearchProvider(),  // Fallback 1: Best traditional quality, 100/day limit
      new BingSearchProvider(),     // Fallback 2: Good quality, higher limits
      new DuckDuckGoProvider()      // Fallback 3: Privacy-focused, basic results
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

  public async testProviders(): Promise<{provider: string; available: boolean; error?: string}[]> {
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

  /**
   * Disable a provider by name at runtime (e.g., skip Google CSE when Gemini Flash
   * has built-in `google_search` grounding).
   */
  public disableProvider(providerName: string): void {
    this.providers = this.providers.filter(p => p.name !== providerName);
  }

  public getCacheStats(): { size: number; oldestEntry: number } {
    const timestamps = Array.from(this.cache.values()).map(v => v.timestamp);
    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0
    };
  }
}
