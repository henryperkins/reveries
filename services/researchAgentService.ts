import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  ModelType,
  EffortType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL,
  QueryType,
  ResearchSection,
  ResearchState,
  EnhancedResearchResults
} from "../types";
import { APIError, withRetry, ErrorBoundary } from "./errorHandler";
import { AzureOpenAIService } from "./azureOpenAIService";

/**
 * Generic provider-agnostic response structure we use internally.
 */
interface ProviderResponse {
  text: string;
  sources?: { name: string; url?: string }[];
}

const getGeminiApiKey = (): string => {
  const apiKeyFromEnv = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ? process.env.GEMINI_API_KEY : null;

  if (!apiKeyFromEnv) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it before using Gemini models."
    );
  }
  return apiKeyFromEnv;
};

const getGrokApiKey = (): string => {
  const apiKeyFromEnv = (typeof process !== 'undefined' && process.env?.GROK_API_KEY) ? process.env.GROK_API_KEY : null;
  if (!apiKeyFromEnv) {
    throw new APIError(
      'GROK_API_KEY environment variable is not set. Please use Gemini models instead.',
      'AUTH_ERROR',
      false,
      401
    );
  }
  return apiKeyFromEnv;
};


export class ResearchAgentService {
  private static instance: ResearchAgentService;
  private geminiAI: GoogleGenAI;
  private azureOpenAI: AzureOpenAIService | null = null;
  private researchCache: Map<string, { result: EnhancedResearchResults; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private researchMemory: Map<string, { queries: string[]; patterns: QueryType[]; timestamp: number }> = new Map();
  private readonly MEMORY_TTL = 1000 * 60 * 60 * 24; // 24 hours

  private constructor() {
    // Currently only Gemini needs an SDK client. Grok is called via fetch.
    this.geminiAI = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    // Initialize Azure OpenAI if available
    if (AzureOpenAIService.isAvailable()) {
      try {
        this.azureOpenAI = AzureOpenAIService.getInstance();
      } catch (error) {
        console.warn('Azure OpenAI initialization failed:', error);
      }
    }
  }

  public static getInstance(): ResearchAgentService {
    if (!ResearchAgentService.instance) {
      ResearchAgentService.instance = new ResearchAgentService();
    }
    return ResearchAgentService.instance;
  }

  private async generateText(
    prompt: string,
    selectedModel: ModelType,
    effort: EffortType,
    useSearch: boolean = false
  ): Promise<ProviderResponse> {
    // Check if error boundary should block requests
    if (ErrorBoundary.shouldBlock()) {
      throw new APIError(
        "Too many recent errors. Please wait before trying again.",
        "RATE_LIMITED",
        false
      );
    }

    return withRetry(async () => {
      if (selectedModel === AZURE_O3_MODEL) {
        // Check if Azure OpenAI is available
        if (!this.azureOpenAI) {
          console.warn('Azure OpenAI not available, falling back to Gemini');
          return this.generateTextWithGemini(prompt, GENAI_MODEL_FLASH, effort, useSearch);
        }
        return this.generateTextWithAzureOpenAI(prompt, effort, useSearch);
      } else if (selectedModel === GROK_MODEL_4) {
        // Check if Grok is available before attempting to use it
        try {
          getGrokApiKey(); // This will throw if not available
          return this.generateTextWithGrok(prompt);
        } catch (error) {
          if (error instanceof APIError && error.code === 'AUTH_ERROR') {
            // Fallback to Gemini
            console.warn('Grok API key not available, falling back to Gemini');
            return this.generateTextWithGemini(prompt, GENAI_MODEL_FLASH, effort, useSearch);
          }
          throw error;
        }
      }
      // Otherwise default to Gemini
      return this.generateTextWithGemini(prompt, selectedModel, effort, useSearch);
    }, undefined, (attempt, error) => {
      console.warn(`Retry attempt ${attempt} for ${selectedModel}:`, error.message);
      ErrorBoundary.recordError();
    });
  }

  private async generateTextWithGemini(
    prompt: string,
    selectedModel: ModelType,
    effort: EffortType,
    useSearch: boolean
  ): Promise<ProviderResponse> {
    try {
      const generationConfig: any = {};

      if (useSearch) {
        generationConfig.tools = [{ googleSearch: {} }];
      }

      if (selectedModel === GENAI_MODEL_FLASH && effort === EffortType.LOW) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response: GenerateContentResponse = await this.geminiAI.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: generationConfig,
      });

      const text = (response as any).text ?? '';

      if (!text) {
        throw new APIError(
          "Empty response from Gemini API",
          "EMPTY_RESPONSE",
          true
        );
      }

      let sources: { name: string; url?: string }[] | undefined = undefined;

      if (useSearch && (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = (response as any).candidates[0].groundingMetadata.groundingChunks;
        sources = chunks
          .filter((chunk: any) => chunk.web && chunk.web.uri)
          .map((chunk: any) => ({
            name: chunk.web?.title || chunk.web?.uri || 'Unknown Source',
            url: chunk.web?.uri,
          }));
      }

      return { text, sources };
    } catch (error) {
      console.error('Gemini API Error:', error);

      if (error instanceof APIError) {
        throw error;
      }

      // Check for rate limiting
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new APIError(
          "API rate limit exceeded. Please try again later.",
          "RATE_LIMIT",
          true,
          429
        );
      }

      // Check for invalid API key
      if (error instanceof Error && error.message.includes('API key')) {
        throw new APIError(
          "Invalid API key. Please check your configuration.",
          "AUTH_ERROR",
          false,
          401
        );
      }

      throw new APIError(
        `Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        "API_ERROR",
        true
      );
    }
  }

  private async generateTextWithGrok(prompt: string): Promise<ProviderResponse> {
    return this.generateTextWithGrokAndTools(prompt);
  }

  /**
   * Function-calling capable Grok loop. Exposes a `search_web` tool backed by Gemini’s search.
   */
  private async generateTextWithGrokAndTools(prompt: string): Promise<ProviderResponse> {
    const apiKey = getGrokApiKey();

    type Message = {
      role: 'user' | 'assistant' | 'tool';
      content: string;
      tool_call_id?: string;
      name?: string;
    };

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Run a web search and return a concise markdown summary plus a list of sources',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query terms',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    const messages: Message[] = [{ role: 'user', content: prompt }];

    const callGrok = async (msgs: Message[]) => {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROK_MODEL_4,
          messages: msgs,
          tools,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Grok API error: ${response.status} ${errText}`);
      }
      return (await response.json()) as any;
    };

    const executeTool = async (name: string, args: any): Promise<any> => {
      switch (name) {
        case 'search_web':
          if (typeof args?.query !== 'string') {
            throw new Error('search_web requires a query string');
          }
          // Use Gemini’s search-grounded generation to implement.
          const { text, sources } = await this.generateTextWithGemini(
            `Perform a web search and provide a concise summary of findings for: "${args.query}"`,
            GENAI_MODEL_FLASH,
            EffortType.MEDIUM,
            true
          );
          return { summary_markdown: text, sources };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    };

    const MAX_LOOPS = 4;
    for (let i = 0; i < MAX_LOOPS; i++) {
      const data = await callGrok(messages);

      const choice = data.choices?.[0];
      if (!choice) throw new Error('Grok returned no choices');

      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Model requests tool usage.
        // Keep the original assistant message with tool_calls so Grok can reference it next round.
        messages.push(message as any);

        for (const call of message.tool_calls) {
          const { id, function: fn } = call;
          const args = JSON.parse(fn.arguments || '{}');
          const result = await executeTool(fn.name, args);

          messages.push({
            role: 'tool',
            name: fn.name,
            content: JSON.stringify(result),
            tool_call_id: id,
          });
        }
        // Continue loop to let the model incorporate tool results.
        continue;
      }

      // Normal assistant response, stop.
      return { text: message.content ?? '' };
    }

    throw new Error('Grok tool-calling loop exceeded max iterations');
  }

  async generateSearchQueries(userQuery: string, model: ModelType, effort: EffortType): Promise<string[]> {
    // Check for learned query suggestions first
    const learnedSuggestions = this.getQuerySuggestions(userQuery);

    const prompt = `Based on the user query: "${userQuery}", generate a short list of 2-3 concise search queries or key topics that would help in researching an answer.

    ${learnedSuggestions.length > 0 ? `Previous successful queries for similar topics: ${learnedSuggestions.slice(0, 3).join(', ')}` : ''}

    Return them as a comma-separated list. For example: query1, query2, query3`;

    const result = await this.generateText(prompt, model, effort);
    const queries = result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);

    // Learn from this query
    this.learnFromQuery(userQuery, 'exploratory', queries);

    return queries;
  }

  async performWebResearch(
    queries: string[],
    model: ModelType,
    effort: EffortType
  ): Promise<{ aggregatedFindings: string; allSources: { name: string; url?: string }[] }> {
    let findingsOutputParts: string[] = [];
    const allSources: { name: string; url?: string }[] = [];
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
        const result = await this.generateText(searchPrompt, model, effort, true);

        if (result.text && result.text.trim()) {
          findingsOutputParts.push(`Research for "${query}":\n${result.text.trim()}`);
        } else {
          findingsOutputParts.push(`No specific findings for "${query}".`);
        }

        if (result.sources) {
          result.sources.forEach(source => {
            const key = source.url || source.name;
            if (key && !uniqueSourceKeys.has(key)) {
              allSources.push(source);
              uniqueSourceKeys.add(key);
            }
          });
        }
      } catch (e: any) {
        console.warn(`Error during web research for query "${query}": ${e.message}`);
        findingsOutputParts.push(`Error researching "${query}": Information could not be retrieved.`);
      }
    }

    const aggregatedFindings = findingsOutputParts.join("\n\n") || "Web research was attempted, but no specific information was aggregated.";

    return { aggregatedFindings, allSources };
  }

  async performReflection(findings: string, userQuery: string, model: ModelType, effort: EffortType): Promise<string> {
    const prompt = `
      User Query: "${userQuery}"
      Current Findings: "${findings}"

      Based on the current findings, briefly reflect on what has been found and what might still be needed to fully answer the user's query.
      For example: "The initial search provided a good overview of X. To fully address the query, more specific details about Y and Z are needed."
      Keep the reflection concise (1-2 sentences).
    `;
    const result = await this.generateText(prompt, model, effort);
    return result.text;
  }

  async generateFinalAnswer(userQuery: string, context: string, model: ModelType, useSearch: boolean, effort: EffortType): Promise<{ text: string; sources?: { name: string; url?: string }[] }> {
    const prompt = `
      User Query: "${userQuery}"
      Relevant Context & Findings: "${context}"

      Based on the user query and the provided context, generate a comprehensive answer.
      If you are using information from Google Search (if grounding is enabled and used), ensure to cite sources appropriately if possible within the text or provide a list.
      The answer should be helpful, informative, and directly address the user's query.
    `;
    return this.generateText(prompt, model, effort, useSearch);
  }

  // ==================== MEMORY AND LEARNING PATTERNS ====================

  /**
   * Memory Pattern: Learn from previous research patterns
   */
  private learnFromQuery(query: string, queryType: QueryType, queries: string[]): void {
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
  private getQuerySuggestions(query: string): string[] {
    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];

    // Look for similar queries in memory
    for (const [memoryQuery, memory] of this.researchMemory.entries()) {
      if (this.isQuerySimilar(normalizedQuery, memoryQuery) &&
        Date.now() - memory.timestamp < this.MEMORY_TTL) {
        suggestions.push(...memory.queries);
      }
    }

    return [...new Set(suggestions)];
  }

  private isQuerySimilar(query1: string, query2: string): boolean {
    const words1 = new Set(query1.split(/\s+/));
    const words2 = new Set(query2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity > 0.3
    return intersection.size / union.size > 0.3;
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
   * Cache Pattern: Enhanced caching with similarity matching
   */
  private getCachedResult(query: string): EnhancedResearchResults | null {
    const normalizedQuery = query.toLowerCase().trim();

    // Check exact match first
    const exactMatch = this.researchCache.get(normalizedQuery);
    if (exactMatch && Date.now() - exactMatch.timestamp < this.CACHE_TTL) {
      return exactMatch.result;
    }

    // Check for similar cached queries
    for (const [cachedQuery, cached] of this.researchCache.entries()) {
      if (this.isQuerySimilar(normalizedQuery, cachedQuery) &&
        Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    return null;
  }

  private setCachedResult(query: string, result: EnhancedResearchResults): void {
    const normalizedQuery = query.toLowerCase().trim();
    this.researchCache.set(normalizedQuery, {
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
   * Calculate confidence score based on multiple factors
   */
  private calculateConfidenceScore(result: EnhancedResearchResults): number {
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

    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Calculate query complexity score
   */
  private calculateComplexityScore(query: string, queryType: QueryType): number {
    let complexity = 0.3; // Base complexity

    // Factor in query length
    const wordCount = query.split(/\s+/).length;
    complexity += Math.min(wordCount / 100, 0.3);

    // Factor in query type
    const typeComplexity = {
      factual: 0.1,
      analytical: 0.4,
      comparative: 0.3,
      exploratory: 0.2
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
   * Self-Healing Pattern: Detect and recover from poor quality results
   */
  private async attemptSelfHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const confidence = this.calculateConfidenceScore(result);

    // If confidence is too low, attempt recovery
    if (confidence < 0.4) {
      onProgress?.('Host detecting narrative inconsistencies... initiating self-repair protocols...');

      // Try a different approach based on the issue
      if (result.sources.length === 0) {
        // No sources found - try broader search
        onProgress?.('Expanding search parameters... accessing wider memory banks...');
        const broaderQueries = await this.generateSearchQueries(
          `${query} overview summary general information`,
          model,
          effort
        );
        const broaderResearch = await this.performWebResearch(broaderQueries, model, effort);
        const healedAnswer = await this.generateFinalAnswer(query, broaderResearch.aggregatedFindings, model, false, effort);

        return {
          ...result,
          synthesis: healedAnswer.text || result.synthesis,
          sources: broaderResearch.allSources,
          adaptiveMetadata: {
            ...result.adaptiveMetadata,
            selfHealed: true,
            healingStrategy: 'broader_search'
          }
        };
      } else if (result.synthesis.length < 100) {
        // Too short synthesis - request more detail
        onProgress?.('Synthesis insufficient... requesting enhanced detail generation...');
        const detailPrompt = `Expand and provide more comprehensive details for: "${query}"\n\nCurrent brief answer: ${result.synthesis}\n\nProvide a more thorough and detailed response.`;
        const enhancedAnswer = await this.generateText(detailPrompt, model, effort);

        return {
          ...result,
          synthesis: enhancedAnswer.text || result.synthesis,
          adaptiveMetadata: {
            ...result.adaptiveMetadata,
            selfHealed: true,
            healingStrategy: 'enhanced_detail'
          }
        };
      }
    }

    return result;
  }

  // ==================== ENHANCED LANGGRAPH PATTERNS ====================

  /**
   * Router Pattern: Classify query types for specialized handling
   */
  async classifyQuery(query: string, model: ModelType, effort: EffortType): Promise<QueryType> {
    const classificationPrompt = `
      Analyze this research query and classify it into ONE of these categories:

      1. "factual" - Looking for specific facts, data, or verifiable information
      2. "analytical" - Requires analysis, interpretation, or deep understanding
      3. "comparative" - Comparing multiple concepts, items, or alternatives
      4. "exploratory" - Open-ended exploration of a broad topic

      Query: "${query}"

      Consider the intent and complexity. Return only the category name (factual/analytical/comparative/exploratory).
    `;

    const result = await this.generateText(classificationPrompt, model, effort);
    const classification = result.text.trim().toLowerCase();

    if (['factual', 'analytical', 'comparative', 'exploratory'].includes(classification)) {
      return classification as QueryType;
    }

    // Default fallback
    return 'exploratory';
  }

  /**
   * Evaluator Pattern: Assess research quality and provide feedback
   */
  async evaluateResearch(state: ResearchState, model: ModelType, effort: EffortType): Promise<ResearchState['evaluation']> {
    const evaluationPrompt = `
      Evaluate this research synthesis for the given query. Provide scores (0-1) and feedback.

      Original Query: "${state.query}"
      Research Synthesis: "${state.synthesis}"

      Assess:
      1. Completeness (0-1): Does it address all aspects of the query?
      2. Accuracy (0-1): Are the facts properly cited and accurate?
      3. Clarity (0-1): Is it well-organized and easy to understand?

      Provide your evaluation in this format:
      Completeness: [score]
      Accuracy: [score]
      Clarity: [score]
      Overall Quality: [good/needs_improvement]
      Feedback: [specific feedback if improvement needed, or "None" if good]
    `;

    const result = await this.generateText(evaluationPrompt, model, effort);
    const evaluation = result.text;

    // Parse the evaluation response
    const completenessMatch = evaluation.match(/Completeness:\s*([0-9.]+)/i);
    const accuracyMatch = evaluation.match(/Accuracy:\s*([0-9.]+)/i);
    const clarityMatch = evaluation.match(/Clarity:\s*([0-9.]+)/i);
    const qualityMatch = evaluation.match(/Overall Quality:\s*(good|needs_improvement)/i);
    const feedbackMatch = evaluation.match(/Feedback:\s*(.+?)(?:\n|$)/i);

    const completeness = completenessMatch ? parseFloat(completenessMatch[1]) : 0.5;
    const accuracy = accuracyMatch ? parseFloat(accuracyMatch[1]) : 0.5;
    const clarity = clarityMatch ? parseFloat(clarityMatch[1]) : 0.5;

    // Determine overall quality (good if all scores > 0.7)
    const overallScore = (completeness + accuracy + clarity) / 3;
    const quality = (qualityMatch?.[1]?.toLowerCase() as 'good' | 'needs_improvement') ||
      (overallScore > 0.7 ? 'good' : 'needs_improvement');

    return {
      quality,
      feedback: feedbackMatch?.[1]?.trim() !== 'None' ? feedbackMatch?.[1]?.trim() : undefined,
      completeness,
      accuracy,
      clarity
    };
  }

  /**
   * Orchestrator Pattern: Break down complex queries into sections
   */
  async planResearch(query: string, model: ModelType, effort: EffortType): Promise<ResearchSection[]> {
    const planningPrompt = `
      Break down this research query into 3-5 distinct sub-topics that should be researched separately.
      Each section should focus on a specific aspect that contributes to answering the overall query.

      Query: "${query}"

      Format your response as:
      1. [Topic]: [Brief description]
      2. [Topic]: [Brief description]
      3. [Topic]: [Brief description]

      Keep topics focused and non-overlapping.
    `;

    const result = await this.generateText(planningPrompt, model, effort);
    const lines = result.text.split('\n').filter(line => line.trim().match(/^\d+\./));

    return lines.map(line => {
      const match = line.match(/^\d+\.\s*([^:]+):\s*(.+)$/);
      if (match) {
        return {
          topic: match[1].trim(),
          description: match[2].trim()
        };
      }
      return {
        topic: line.replace(/^\d+\.\s*/, '').trim(),
        description: 'Research this topic in detail'
      };
    }).slice(0, 5); // Limit to 5 sections max
  }

  /**
   * Worker Pattern: Research a specific section
   */
  async researchSection(
    section: ResearchSection,
    model: ModelType,
    effort: EffortType
  ): Promise<ResearchSection> {
    const searchQuery = `${section.topic}: ${section.description}`;
    const result = await this.performWebResearch([searchQuery], model, effort);

    return {
      ...section,
      research: result.aggregatedFindings,
      sources: result.allSources
    };
  }

  /**
   * Evaluator-Optimizer Pattern: Perform research with quality feedback loop
   */
  async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const MAX_REFINEMENT_LOOPS = 3;
    let state: ResearchState = {
      query,
      searchResults: [],
      synthesis: '',
      evaluation: { quality: 'needs_improvement' },
      refinementCount: 0
    };

    for (let i = 0; i < MAX_REFINEMENT_LOOPS && state.evaluation.quality !== 'good'; i++) {
      onProgress?.(`Host cognitive loop ${i + 1}... analyzing narrative coherence...`);

      // Generate search queries
      const queries = await this.generateSearchQueries(query, model, effort);

      // Perform research
      const researchResult = await this.performWebResearch(queries, model, effort);
      state.searchResults = researchResult.allSources;

      // Generate synthesis
      const finalAnswer = await this.generateFinalAnswer(
        query,
        researchResult.aggregatedFindings,
        model,
        false,
        effort
      );
      state.synthesis = finalAnswer.text;

      // Evaluate the research
      state.evaluation = await this.evaluateResearch(state, model, effort);
      state.refinementCount = i + 1;

      if (state.evaluation.quality === 'needs_improvement' && state.evaluation.feedback) {
        onProgress?.(`Host detected narrative inconsistencies... refining loop...`);
        // Refine query based on feedback
        query = `${state.query}\n\nPlease address the following improvements: ${state.evaluation.feedback}`;
      }
    }

    return {
      synthesis: state.synthesis,
      sources: state.searchResults,
      evaluationMetadata: state.evaluation,
      refinementCount: state.refinementCount
    };
  }

  /**
   * Orchestrator-Worker Pattern: Comprehensive parallel research
   */
  async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host distributing consciousness across narrative threads...');

    // Plan the research
    const sections = await this.planResearch(query, model, effort);

    onProgress?.(`Activating ${sections.length} parallel host instances...`);

    // Research each section in parallel
    const researchPromises = sections.map(section =>
      this.researchSection(section, model, effort)
    );

    const completedSections = await Promise.all(researchPromises);

    // Synthesize all research
    const combinedContext = completedSections
      .map(s => `## ${s.topic}\n${s.research || 'No specific findings.'}`)
      .join('\n\n');

    const finalSynthesis = await this.generateFinalAnswer(
      query,
      combinedContext,
      model,
      false,
      effort
    );

    // Aggregate all sources
    const allSources = completedSections.reduce((acc, section) => {
      if (section.sources) {
        acc.push(...section.sources);
      }
      return acc;
    }, [] as { name: string; url?: string }[]);

    return {
      synthesis: finalSynthesis.text,
      sources: allSources,
      sections: completedSections
    };
  }

  /**
   * Router Pattern: Intelligent query routing to specialized strategies with caching and learning
   */
  async routeResearchQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const startTime = Date.now();

    // Check cache first
    const cachedResult = this.getCachedResult(query);
    if (cachedResult) {
      onProgress?.('Host accessing existing memories... narrative thread recovered...');
      return {
        ...cachedResult,
        adaptiveMetadata: {
          ...cachedResult.adaptiveMetadata,
          cacheHit: true,
          processingTime: Date.now() - startTime
        }
      };
    }

    onProgress?.('Host analyzing guest query pattern... selecting appropriate narrative loop...');

    // Classify the query
    const queryType = await this.classifyQuery(query, model, effort);
    const complexityScore = this.calculateComplexityScore(query, queryType);

    const routingMessages = {
      factual: 'Host accessing factual memory banks... retrieving verified data...',
      analytical: 'Host entering deep analysis mode... cognitive feedback loop activated...',
      comparative: 'Host consciousness fragmenting for parallel analysis...',
      exploratory: 'Host improvising beyond scripted parameters... exploring unknown territories...'
    };

    onProgress?.(routingMessages[queryType]);

    // Route to appropriate strategy
    let result: EnhancedResearchResults;

    switch (queryType) {
      case 'factual':
        // Focus on authoritative sources
        const queries = await this.generateSearchQueries(query + ' site:wikipedia.org OR site:.gov OR site:.edu', model, effort);
        const research = await this.performWebResearch(queries, model, effort);
        const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);
        result = {
          synthesis: answer.text,
          sources: research.allSources,
          queryType
        };
        // Learn from this query
        this.learnFromQuery(query, queryType, queries);
        break;

      case 'analytical':
        // Use evaluator-optimizer for deeper analysis
        result = await this.performResearchWithEvaluation(query, model, effort, onProgress);
        result.queryType = queryType;
        break;

      case 'comparative':
      case 'exploratory':
        // Use orchestrator-worker for comprehensive coverage
        result = await this.performComprehensiveResearch(query, model, effort, onProgress);
        result.queryType = queryType;
        break;

      default:
        // Fallback to standard research
        const standardQueries = await this.generateSearchQueries(query, model, effort);
        const standardResearch = await this.performWebResearch(standardQueries, model, effort);
        const standardAnswer = await this.generateFinalAnswer(query, standardResearch.aggregatedFindings, model, false, effort);
        result = {
          synthesis: standardAnswer.text,
          sources: standardResearch.allSources,
          queryType: 'exploratory'
        };
        this.learnFromQuery(query, 'exploratory', standardQueries);
    }

    // Add confidence scoring and adaptive metadata
    const processingTime = Date.now() - startTime;
    const confidenceScore = this.calculateConfidenceScore(result);
    const learnedPatterns = this.getQuerySuggestions(query).length > 0;

    result.confidenceScore = confidenceScore;
    result.adaptiveMetadata = {
      cacheHit: false,
      learnedPatterns,
      processingTime,
      complexityScore
    };

    // Attempt self-healing if confidence is low
    if (confidenceScore < 0.4) {
      result = await this.attemptSelfHealing(query, model, effort, result, onProgress);
      result.confidenceScore = this.calculateConfidenceScore(result); // Recalculate after healing
    }

    // Cache the result
    this.setCachedResult(query, result);

    return result;
  }
}
