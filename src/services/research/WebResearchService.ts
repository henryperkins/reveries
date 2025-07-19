/**
 * Web Research Service
 * Handles web search, research operations, and source management
 */

import { ModelType, EffortType, Citation } from '@/types';
import { WebResearchResult } from '@/services/research/types';
import { ResearchUtilities } from '@/utils/ResearchUtilities';
import { ResearchMemoryService } from '@/services/memory/ResearchMemoryService';

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
   * Perform web research using real search APIs
   */
  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>,
    onProgress?: (message: string) => void
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

    // Import search provider service
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();

    for (const query of queries) {
      onProgress?.(`Searching for: "${query}"`);
      
      try {
        // Perform real web search
        const searchResponse = await searchService.search(query, {
          maxResults: 10,
          safe: true,
          timeRange: 'month' // Focus on recent results
        }, onProgress);

        onProgress?.(`Found ${searchResponse.results.length} results for "${query}"`);

        if (searchResponse.results.length === 0) {
          findingsOutputParts.push(`## ${query}\n\nNo search results found for this query.`);
          continue;
        }

        // Convert search results to citations
        const searchCitations = searchService.convertToCitations(searchResponse.results);
        
        // Add unique sources
        searchCitations.forEach(source => {
          const sourceKey = ResearchUtilities.normalizeSourceKey(source);
          if (!uniqueSourceKeys.has(sourceKey)) {
            uniqueSourceKeys.add(sourceKey);
            allSources.push(source);
          }
        });

        // Summarize search results using LLM
        const searchContext = searchResponse.results
          .slice(0, 5) // Top 5 results for context
          .map(result => `Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
          .join('\n\n---\n\n');

        const summaryPrompt = `Based on the following search results for the query "${query}", provide a comprehensive summary of the key information found. Focus on factual insights and important findings. If the results don't contain relevant information, state that clearly.

Search Results:
${searchContext}

Please provide a well-structured summary that synthesizes the information from these sources.`;

        try {
          onProgress?.('tool_used:llm_summarization');
          const { text: summary, sources: additionalSources } = await generateText(
            summaryPrompt,
            model,
            effort
          );

          if (summary && summary.trim()) {
            findingsOutputParts.push(`## ${query}\n\n${summary}`);
          }

          // Add any additional sources from LLM response
          if (additionalSources) {
            additionalSources.forEach(source => {
              const sourceKey = ResearchUtilities.normalizeSourceKey(source);
              if (!uniqueSourceKeys.has(sourceKey)) {
                uniqueSourceKeys.add(sourceKey);
                allSources.push(source);
              }
            });
          }

          onProgress?.(`Summarized ${searchResponse.results.length} sources for "${query}"`);
        } catch (summaryError) {
          console.error(`Error summarizing results for "${query}":`, summaryError);
          // Fallback: Use raw search results
          const fallbackSummary = searchResponse.results
            .slice(0, 3)
            .map(result => `**${result.title}**\n${result.snippet}\nSource: ${result.url}`)
            .join('\n\n');
          
          findingsOutputParts.push(`## ${query}\n\n${fallbackSummary}`);
          onProgress?.(`Used raw search results for "${query}" due to summarization error`);
        }

      } catch (searchError) {
        console.error(`Error searching for "${query}":`, searchError);
        onProgress?.(`Search failed for "${query}", trying LLM fallback...`);
        
        // Fallback to LLM-only approach if search fails
        try {
          const fallbackPrompt = `Provide information about: "${query}". Focus on factual information and insights based on your training data. If you don't have reliable information about this topic, state that clearly.`;
          
          const { text, sources } = await generateText(
            fallbackPrompt,
            model,
            effort
          );
          
          if (text && text.trim()) {
            findingsOutputParts.push(`## ${query}\n\n${text}\n\n*Note: This information is based on training data as web search was unavailable.*`);
          }
          
          if (sources) {
            sources.forEach(source => {
              const sourceKey = ResearchUtilities.normalizeSourceKey(source);
              if (!uniqueSourceKeys.has(sourceKey)) {
                uniqueSourceKeys.add(sourceKey);
                allSources.push(source);
              }
            });
          }
          
          onProgress?.(`Used LLM fallback for "${query}"`);
        } catch (fallbackError) {
          console.error(`Fallback failed for query "${query}":`, fallbackError);
          onProgress?.(`All search methods failed for "${query}"`);
          findingsOutputParts.push(`## ${query}\n\nUnable to retrieve information for this query. Both web search and LLM fallback failed.`);
        }
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
