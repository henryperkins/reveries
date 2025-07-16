/**
 * Web Research Service
 * Handles web search, research operations, and source management
 */

import { ModelType, EffortType, Citation } from '../../types';
import { WebResearchResult } from '../research/types';
import { ResearchUtilities } from '../utils/ResearchUtilities';
import { ResearchMemoryService } from '../memory/ResearchMemoryService';

export class WebResearchService {
  private static instance: WebResearchService;
  private memoryService: ResearchMemoryService;

  private constructor() {
    this.memoryService = ResearchMemoryService.getInstance();
  }

  public static getInstance(): WebResearchService {
    if (!WebResearchService.instance) {
      WebResearchService.instance = new WebResearchService();
    }
    return WebResearchService.instance;
  }

  /**
   * Generate search queries based on user input
   */
  async generateSearchQueries(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<string[]> {
    // Check for learned query suggestions first
    const learnedSuggestions = this.memoryService.getQuerySuggestions(userQuery);

    const prompt = `Based on the user query: "${userQuery}", generate a short list of 2-3 concise search queries or key topics that would help in researching an answer.

    ${learnedSuggestions.length > 0 ? `Previous successful queries for similar topics: ${learnedSuggestions.slice(0, 3).join(', ')}` : ''}

    Return them as a comma-separated list. For example: query1, query2, query3`;

    const result = await generateText(prompt, model, effort);
    const queries = result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);

    // Learn from this query
    this.memoryService.learnFromQuery(userQuery, 'exploratory', queries);

    return queries;
  }

  /**
   * Perform web research using generated queries
   */
  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<WebResearchResult> {
    const findingsOutputParts: string[] = [];
    const allSources: Citation[] = [];
    const uniqueSourceKeys = new Set<string>();

    if (!queries || queries.length === 0) {
      return {
        aggregatedFindings: "No search queries were provided for web research.",
        allSources
      };
    }

    for (const query of queries) {
      const searchPrompt = `Perform a web search and provide a concise summary of key information found for the query: "${query}". Focus on factual information and insights. If no relevant information is found, state that clearly.`;

      try {
        const { text, sources } = await generateText(
          searchPrompt,
          model,
          effort
        );

        if (text && text.trim()) {
          findingsOutputParts.push(`## ${query}\n\n${text}`);
        }

        // Add unique sources
        if (sources) {
          sources.forEach(source => {
            const sourceKey = ResearchUtilities.normalizeSourceKey(source);
            if (!uniqueSourceKeys.has(sourceKey)) {
              uniqueSourceKeys.add(sourceKey);
              allSources.push(source);
            }
          });
        }
      } catch (error) {
        console.error(`Error researching query "${query}":`, error);
        findingsOutputParts.push(`## ${query}\n\nError performing search for this query.`);
      }
    }

    const aggregatedFindings = findingsOutputParts.join('\n\n---\n\n');

    return {
      aggregatedFindings,
      allSources: ResearchUtilities.deduplicateSources(allSources)
    };
  }

  /**
   * Generate final answer from research findings
   */
  async generateFinalAnswer(
    userQuery: string,
    context: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<{ text: string; sources?: Citation[] }> {
    const prompt = `
      User Query: "${userQuery}"
      Relevant Context & Findings: "${context}"

      Based on the user query and the provided context, generate a comprehensive answer.
      If you are using information from Google Search (if grounding is enabled and used), ensure to cite sources appropriately if possible within the text or provide a list.
      The answer should be helpful, informative, and directly address the user's query.
    `;

    return generateText(prompt, model, effort);
  }

  /**
   * Perform reflection on current findings
   */
  async performReflection(
    findings: string,
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<string> {
    const prompt = `
      User Query: "${userQuery}"
      Current Findings: "${findings}"

      Based on the current findings, briefly reflect on what has been found and what might still be needed to fully answer the user's query.
      For example: "The initial search provided a good overview of X. To fully address the query, more specific details about Y and Z are needed."
      Keep the reflection concise (1-2 sentences).
    `;

    const result = await generateText(prompt, model, effort);
    return result.text;
  }

  /**
   * Extract key topics from a query
   */
  extractKeyTopics(query: string): string[] {
    // Remove common words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'what', 'how', 'why', 'when', 'where', 'who', 'can', 'will'
    ]);

    // Extract words
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Look for multi-word phrases (simple approach)
    const phrases: string[] = [];
    const queryLower = query.toLowerCase();

    // Common phrase patterns
    const phrasePatterns = [
      /(?:machine|deep) learning/g,
      /artificial intelligence/g,
      /neural network[s]?/g,
      /data science/g,
      /computer vision/g,
      /natural language/g
    ];

    phrasePatterns.forEach(pattern => {
      const matches = queryLower.match(pattern);
      if (matches) {
        phrases.push(...matches);
      }
    });

    // Combine words and phrases
    return [...new Set([...words, ...phrases])].slice(0, 5);
  }

  /**
   * Rank sources by relevance
   */
  rankSourcesByRelevance(sources: Citation[], query: string): Citation[] {
    const queryTopics = this.extractKeyTopics(query);

    return sources
      .map(source => {
        let score = source.relevanceScore || 0.5;

        // Boost score if title contains query topics
        if (source.title) {
          const titleLower = source.title.toLowerCase();
          queryTopics.forEach(topic => {
            if (titleLower.includes(topic)) {
              score += 0.1;
            }
          });
        }

        // Boost score if snippet contains query topics
        if (source.snippet) {
          const snippetLower = source.snippet.toLowerCase();
          queryTopics.forEach(topic => {
            if (snippetLower.includes(topic)) {
              score += 0.05;
            }
          });
        }

        return { ...source, relevanceScore: Math.min(score, 1) };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Filter sources by quality criteria
   */
  filterSourcesByQuality(sources: Citation[], minRelevance: number = 0.3): Citation[] {
    return sources.filter(source => {
      // Filter by relevance score
      if ((source.relevanceScore || 0) < minRelevance) {
        return false;
      }

      // Ensure source has either URL or title
      if (!source.url && !source.title) {
        return false;
      }

      // Prefer sources with snippets
      if (!source.snippet || source.snippet.trim().length < 10) {
        return false;
      }

      return true;
    });
  }

  /**
   * Group sources by domain
   */
  groupSourcesByDomain(sources: Citation[]): Record<string, Citation[]> {
    const grouped: Record<string, Citation[]> = {};

    sources.forEach(source => {
      if (source.url) {
        try {
          const url = new URL(source.url);
          const domain = url.hostname.replace('www.', '');

          if (!grouped[domain]) {
            grouped[domain] = [];
          }
          grouped[domain].push(source);
        } catch {
          // Invalid URL, group under 'other'
          if (!grouped['other']) {
            grouped['other'] = [];
          }
          grouped['other'].push(source);
        }
      } else {
        // No URL, group under 'no-url'
        if (!grouped['no-url']) {
          grouped['no-url'] = [];
        }
        grouped['no-url'].push(source);
      }
    });

    return grouped;
  }
}
