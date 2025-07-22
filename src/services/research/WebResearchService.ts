/**
 * Web Research Service
 * Handles web search, research operations, and source management
 */

import { ModelType, EffortType, Citation } from '@/types';
import { WebResearchResult } from '@/services/research/types';
import { ResearchUtilities } from '@/services/utils/ResearchUtilities';
import { ResearchMemoryService } from '@/services/memory/ResearchMemoryService';
import { ResearchTaskService, StructuredResearchOutput } from './ResearchTaskService';
import { ExaResearchTask } from '../search/SearchProviderService';

export class WebResearchService {
  private static instance: WebResearchService;
  private memoryService: ResearchMemoryService;
  private researchTaskService: ResearchTaskService;

  private constructor() {
    this.memoryService = ResearchMemoryService.getInstance();
    this.researchTaskService = ResearchTaskService.getInstance();
  }

  public static getInstance(): WebResearchService {
    if (!WebResearchService.instance) {
      WebResearchService.instance = new WebResearchService();
    }
    return WebResearchService.instance;
  }

  /**
   * Generate search queries based on user input with Exa-optimized semantic approach
   */
  async generateSearchQueries(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>,
    onProgress?: (message: string) => void
  ): Promise<string[]> {
    // Notify tool usage
    onProgress?.('tool_used:query_generation');

    // Check for learned query suggestions first
    const learnedSuggestions = this.memoryService.getQuerySuggestions(userQuery);

    // Enhanced prompt optimized for semantic search (Exa) and traditional search
    const prompt = `You are a research assistant helping to generate diverse, effective search queries for comprehensive research.

User Query: "${userQuery}"

Generate 3-4 diverse search queries that will help comprehensively research this topic. Follow these guidelines:

1. **Semantic queries**: Use natural language that describes what you're looking for (good for Exa)
   - Example: "recent breakthroughs in quantum computing applications"
   
2. **Specific queries**: Include technical terms, names, or specific aspects
   - Example: "quantum supremacy IBM Google 2024"
   
3. **Contextual queries**: Add context about timeframe, domain, or perspective
   - Example: "quantum computing commercial applications challenges"

4. **Related queries**: Include adjacent or related topics that might provide useful context
   - Example: "quantum algorithms cryptography implications"

${learnedSuggestions.length > 0 ? `Previous successful queries for similar topics: ${learnedSuggestions.slice(0, 3).join(', ')}` : ''}

Return only the search queries as a comma-separated list, without explanations or numbering.`;

    const result = await generateText(prompt, model, effort);
    const queries = result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);

    // Report progress
    onProgress?.(`Generated ${queries.length} search queries for: ${userQuery}`);
    queries.forEach((query, index) => {
      onProgress?.(`Query ${index + 1}: ${query}`);
    });

    // Learn from this query
    this.memoryService.learnFromQuery(userQuery, 'exploratory', queries);

    // Mark completion
    onProgress?.('tool_used:completed:query_generation:' + Date.now());

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

    // Notify that web search is starting with a summary message
    onProgress?.(`Searching web with ${queries.length} ${queries.length === 1 ? 'query' : 'queries'}...`);
    onProgress?.('tool_used:web_search');

    // When using Gemini-2.5-Flash, rely on the model's native `google_search`
    // grounding and disable Google Custom Search to avoid redundant calls.
    if (model === 'gemini-2.5-flash') {
      searchService.disableProvider('google');
    }

    for (const query of queries) {
      // Don't emit individual query progress to reduce duplicate cards
      // Just emit tool usage notification
      onProgress?.('tool_used:web_search');

      try {
        // Perform real web search
        const searchResponse = await searchService.search(query, {
          maxResults: 10,
          safe: true,
          timeRange: 'month' // Focus on recent results
        }, onProgress);

        // Don't emit individual result counts to reduce noise

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
          // Mark completion of this search
          onProgress?.('tool_used:completed:web_search:' + Date.now());
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
        onProgress?.('tool_used:llm_fallback');

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
          onProgress?.('tool_used:completed:llm_fallback:' + Date.now());
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
   * Generate final answer from research findings with enhanced synthesis
   */
  async generateFinalAnswer(
    userQuery: string,
    context: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<{ text: string; sources?: Citation[] }> {
    const prompt = `You are a research analyst synthesizing comprehensive findings to answer a user's query.

User Query: "${userQuery}"

Research Findings:
${context}

Instructions:
1. **Synthesize** the information from all sources to provide a comprehensive answer
2. **Structure** your response with clear sections if the topic is complex
3. **Cite sources** appropriately by referencing URLs or titles from the research findings
4. **Identify gaps** if important information is missing or contradictory
5. **Provide insights** that connect different findings or reveal patterns
6. **Be objective** and indicate the strength/reliability of different claims

Format your response as a well-structured research synthesis that directly addresses the user's query while incorporating insights from the gathered sources.`;

    return generateText(prompt, model, effort);
  }

  /**
   * Enhanced research method using Exa's semantic capabilities when available
   */
  async performEnhancedResearch(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>,
    onProgress?: (message: string) => void
  ): Promise<WebResearchResult> {
    // Import search provider service
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();

    // Check if Exa is available for enhanced semantic research
    const testResults = await searchService.testProviders();
    const exaAvailable = testResults.find(result => result.provider === 'exa' && result.available);

    if (exaAvailable) {
      onProgress?.('Using enhanced semantic research with Exa');
      return this.performExaEnhancedResearch(userQuery, model, effort, generateText, onProgress);
    } else {
      onProgress?.('Using standard research workflow');
      // Fallback to standard research
      const queries = await this.generateSearchQueries(userQuery, model, effort, generateText, onProgress);
      return this.performWebResearch(queries, model, effort, generateText, onProgress);
    }
  }

  /**
   * Exa-enhanced research workflow inspired by the Exa researcher example
   */
  private async performExaEnhancedResearch(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>,
    onProgress?: (message: string) => void
  ): Promise<WebResearchResult> {
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();
    
    onProgress?.('tool_used:exa_enhanced_research');

    // Step 1: Generate diverse semantic queries optimized for Exa
    onProgress?.('Generating semantic search queries...');
    const queries = await this.generateSemanticQueries(userQuery, model, effort, generateText);
    
    const allSources: Citation[] = [];
    const findingsOutputParts: string[] = [];
    const uniqueSourceKeys = new Set<string>();

    // Step 2: Perform multiple search rounds with different strategies
    for (const [index, query] of queries.entries()) {
      onProgress?.(`Researching: ${query} (${index + 1}/${queries.length})`);
      
      try {
        // Use Exa's auto search type for optimal semantic matching
        const searchResponse = await searchService.search(query, {
          maxResults: 8, // Slightly more results for better coverage
          safe: true,
          timeRange: 'month'
        }, onProgress);

        if (searchResponse.results.length === 0) {
          findingsOutputParts.push(`## ${query}\n\nNo search results found for this query.`);
          continue;
        }

        // Convert to citations and deduplicate
        const searchCitations = searchService.convertToCitations(searchResponse.results);
        searchCitations.forEach(source => {
          const sourceKey = ResearchUtilities.normalizeSourceKey(source);
          if (!uniqueSourceKeys.has(sourceKey)) {
            uniqueSourceKeys.add(sourceKey);
            allSources.push(source);
          }
        });

        // Enhanced synthesis for Exa results (better quality snippets/highlights)
        const contextData = searchResponse.results
          .slice(0, 6) // Use more results for Exa since they're higher quality
          .map(result => {
            const snippetText = result.snippet || '';
            return `**${result.title}**\nURL: ${result.url}\nContent: ${snippetText}`;
          })
          .join('\n\n---\n\n');

        const synthesisPrompt = `Analyze these high-quality search results for the query "${query}" and provide a comprehensive synthesis.

Search Results:
${contextData}

Instructions:
1. Extract key insights and factual information
2. Identify important patterns or themes
3. Note any conflicting information
4. Synthesize into a coherent summary
5. Highlight the most reliable and relevant findings

Focus on creating a synthesis that adds analytical value beyond just summarizing the individual results.`;

        const { text: synthesis } = await generateText(synthesisPrompt, model, effort);
        
        if (synthesis && synthesis.trim()) {
          findingsOutputParts.push(`## ${query}\n\n${synthesis}`);
        }

        onProgress?.(`Synthesized ${searchResponse.results.length} sources for "${query}"`);

      } catch (error) {
        console.error(`Enhanced research failed for query "${query}":`, error);
        onProgress?.(`Research failed for "${query}", continuing with other queries...`);
      }
    }

    // Step 3: Create comprehensive synthesis
    const aggregatedFindings = findingsOutputParts.join('\n\n---\n\n');

    return {
      aggregatedFindings,
      allSources: ResearchUtilities.deduplicateSources(allSources)
    };
  }

  /**
   * Generate semantic queries optimized for Exa's capabilities
   */
  private async generateSemanticQueries(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<string[]> {
    const prompt = `Generate 3-4 diverse semantic search queries for comprehensive research on this topic:

"${userQuery}"

Create queries that work well with semantic/neural search (like Exa). Use these strategies:

1. **Descriptive queries**: Describe what you're looking for in natural language
   - "latest research findings on [topic]"
   - "comprehensive overview of [topic] applications"

2. **Question-based queries**: Frame as questions that would lead to informative answers
   - "what are the current challenges in [topic]"
   - "how does [topic] impact [relevant domain]"

3. **Context-rich queries**: Include domain context and timeframes
   - "[topic] developments in 2024"
   - "[topic] implications for [relevant field]"

4. **Comparative queries**: Explore relationships and comparisons
   - "[topic] compared to alternatives"
   - "[topic] advantages and limitations"

Return only the search queries as a comma-separated list.`;

    const result = await generateText(prompt, model, effort);
    return result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);
  }

  /**
   * Submit asynchronous research task for complex queries
   */
  async submitAsyncResearch(
    userQuery: string,
    researchType: 'general' | 'timeline' | 'comparative' | 'technical' = 'general',
    onProgress?: (task: ExaResearchTask) => void
  ): Promise<string> {
    // Enhanced instructions for better Exa research
    const instructions = `Conduct comprehensive research on the following topic: "${userQuery}"

Research Requirements:
1. Find authoritative and recent sources
2. Identify key themes and insights
3. Note any conflicting information or debates
4. Highlight practical applications or implications
5. Identify gaps in current knowledge
6. Provide confidence assessment for claims

Focus on providing factual, well-sourced information that directly addresses the research query.`;

    return this.researchTaskService.createStructuredResearch(
      instructions,
      researchType,
      {
        model: 'exa-research-pro',
        onProgress
      }
    );
  }

  /**
   * Check if a query should use async research (based on complexity/time estimation)
   */
  shouldUseAsyncResearch(userQuery: string): boolean {
    // Factors that suggest async research would be beneficial:
    const complexityIndicators = [
      userQuery.length > 100, // Long, detailed queries
      /\b(comprehensive|detailed|in-depth|thorough|complete)\b/i.test(userQuery),
      /\b(history|timeline|evolution|development)\b/i.test(userQuery),
      /\b(compare|comparison|versus|vs|differences|similarities)\b/i.test(userQuery),
      /\b(analysis|analyze|research|study|investigation)\b/i.test(userQuery),
      /\b(multiple|various|different|several)\b.*\b(aspects|factors|approaches|methods)\b/i.test(userQuery),
      userQuery.split(' ').length > 15 // Long queries
    ];

    // Use async if 2+ complexity indicators are present
    return complexityIndicators.filter(indicator => indicator).length >= 2;
  }

  /**
   * Intelligent research routing - chooses between sync and async based on query
   */
  async performIntelligentResearch(
    userQuery: string,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>,
    onProgress?: (message: string) => void
  ): Promise<WebResearchResult | { taskId: string; isAsync: true }> {
    // Check if async research is beneficial
    if (this.shouldUseAsyncResearch(userQuery)) {
      onProgress?.('Query complexity detected - submitting as background research task...');
      
      try {
        // Determine research type
        let researchType: 'general' | 'timeline' | 'comparative' | 'technical' = 'general';
        
        if (/\b(history|timeline|evolution|development|chronology)\b/i.test(userQuery)) {
          researchType = 'timeline';
        } else if (/\b(compare|comparison|versus|vs|differences|similarities)\b/i.test(userQuery)) {
          researchType = 'comparative';
        } else if (/\b(technical|specification|implementation|algorithm|architecture)\b/i.test(userQuery)) {
          researchType = 'technical';
        }

        const taskId = await this.submitAsyncResearch(
          userQuery, 
          researchType,
          (task) => {
            onProgress?.(`Research task ${task.status}: ${task.id}`);
          }
        );

        onProgress?.(`Research task submitted with ID: ${taskId}`);
        onProgress?.('You can check back later for results or continue with other queries.');
        
        return { taskId, isAsync: true };
      } catch (error) {
        onProgress?.('Failed to submit async research, falling back to standard research...');
        console.error('Async research submission failed:', error);
      }
    }

    // Fall back to standard research
    onProgress?.('Using standard research workflow...');
    return this.performEnhancedResearch(userQuery, model, effort, generateText, onProgress);
  }

  /**
   * Get research task status and results
   */
  async getResearchTask(taskId: string): Promise<ExaResearchTask | null> {
    return this.researchTaskService.getTask(taskId);
  }

  /**
   * Wait for research task completion
   */
  async waitForResearchCompletion(
    taskId: string,
    onProgress?: (task: ExaResearchTask) => void,
    timeoutMs?: number
  ): Promise<ExaResearchTask> {
    return this.researchTaskService.waitForCompletion(taskId, {
      timeoutMs,
      onProgress
    });
  }

  /**
   * Convert Exa research task results to WebResearchResult format
   */
  convertTaskToWebResult(task: ExaResearchTask): WebResearchResult {
    if (task.status !== 'completed' || !task.data) {
      return {
        aggregatedFindings: `Research task ${task.status}: ${task.error || 'No results available'}`,
        allSources: []
      };
    }

    let findings = `# Research Results for: ${task.instructions}\n\n`;

    // Handle structured data
    if (typeof task.data === 'object' && task.data !== null) {
      const data = task.data as unknown as StructuredResearchOutput;
      
      if (data.keyFindings) {
        findings += `## Key Findings\n\n`;
        data.keyFindings.forEach((finding, index) => {
          findings += `${index + 1}. ${finding}\n`;
        });
        findings += '\n';
      }

      if (data.mainTopics) {
        findings += `## Main Topics\n\n`;
        data.mainTopics.forEach(topic => {
          findings += `- ${topic}\n`;
        });
        findings += '\n';
      }

      if (data.timeline) {
        findings += `## Timeline\n\n`;
        data.timeline.forEach(period => {
          findings += `### ${period.period}\n`;
          period.events.forEach(event => {
            findings += `- ${event}\n`;
          });
          findings += '\n';
        });
      }

      if (data.recommendations) {
        findings += `## Recommendations\n\n`;
        data.recommendations.forEach((rec, index) => {
          findings += `${index + 1}. ${rec}\n`;
        });
        findings += '\n';
      }

      if (data.gaps && data.gaps.length > 0) {
        findings += `## Research Gaps\n\n`;
        data.gaps.forEach(gap => {
          findings += `- ${gap}\n`;
        });
        findings += '\n';
      }

      if (data.confidenceScore !== undefined) {
        findings += `## Confidence Score\n\n${Math.round(data.confidenceScore * 100)}% confidence in findings\n\n`;
      }
    } else {
      // Handle plain text data
      findings += task.data;
    }

    // Convert citations
    const allSources: Citation[] = [];
    if (task.citations) {
      Object.values(task.citations).forEach(citationGroup => {
        if (Array.isArray(citationGroup)) {
          allSources.push(...citationGroup);
        }
      });
    }

    return {
      aggregatedFindings: findings,
      allSources: ResearchUtilities.deduplicateSources(allSources)
    };
  }

  /**
   * List all research tasks
   */
  async listResearchTasks(): Promise<ExaResearchTask[]> {
    const result = await this.researchTaskService.listTasks();
    return result.data;
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
  filterSourcesByQuality(sources: Citation[], minRelevance = 0.3): Citation[] {
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
          if (!grouped.other) {
            grouped.other = [];
          }
          grouped.other.push(source);
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
