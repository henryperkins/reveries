import { GoogleGenerativeAI, GenerateContentResponse } from '@google/generative-ai';
import { withRetry } from './errorHandler';
import { APIError, ErrorBoundary } from './errorHandler';
import { AzureOpenAIService } from './azureOpenAIService';
import { geminiService } from './geminiService';
import { GrokService } from './grokService';
import { FunctionCallingService, FunctionCall } from './functionCallingService';
import { ResearchToolsService } from './researchToolsService';
import { ContextEngineeringService } from './contextEngineeringService';
import {
  ModelType,
  EffortType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL,
  QueryType,
  ResearchSection,
  ResearchState,
  EnhancedResearchResults,
  Citation,
  HostParadigm,
  ResearchPhase,
  PyramidLayer
} from "../types";

/**
 * Generic provider-agnostic response structure we use internally.
 */
interface ProviderResponse {
  text: string;
  sources?: Citation[];
}

const getGeminiApiKey = (): string => {
  // Try Vite environment variables first (client-side)
  const viteApiKey = typeof import !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY;

  // Try Node.js environment variables (server-side)
  const nodeApiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

  const apiKey = viteApiKey || nodeApiKey;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it in .env.local file."
    );
  }
  return apiKey;
};

const getGrokApiKey = (): string => {
  // Try Vite environment variables first (client-side)
  const viteApiKey = typeof import !== 'undefined' && import.meta?.env?.VITE_XAI_API_KEY;

  // Try Node.js environment variables (server-side)
  const nodeApiKey = (typeof process !== 'undefined' && process.env?.XAI_API_KEY);

  const apiKey = viteApiKey || nodeApiKey;

  if (!apiKey) {
    throw new APIError(
      'XAI_API_KEY environment variable is not set. Please configure it in .env.local file.',
      'AUTH_ERROR',
      false,
      401
    );
  }
  return apiKey;
};


export class ResearchAgentService {
  private static instance: ResearchAgentService;
  private geminiAI: GoogleGenerativeAI;
  private azureOpenAI: AzureOpenAIService | null = null;
  private researchCache: Map<string, { result: EnhancedResearchResults; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private researchMemory: Map<string, { queries: string[]; patterns: QueryType[]; timestamp: number }> = new Map();
  private readonly MEMORY_TTL = 1000 * 60 * 60 * 24; // 24 hours
  private functionCallingService: FunctionCallingService;
  private researchToolsService: ResearchToolsService;
  private contextEngineering: ContextEngineeringService;

  private constructor() {
    // Currently only Gemini needs an SDK client. Grok is called via fetch.
    this.geminiAI = new GoogleGenerativeAI(getGeminiApiKey());

    // Initialize Azure OpenAI if available
    if (AzureOpenAIService.isAvailable()) {
      try {
        this.azureOpenAI = AzureOpenAIService.getInstance();
      } catch (error) {
        console.warn('Azure OpenAI initialization failed:', error);
      }
    }

    this.functionCallingService = FunctionCallingService.getInstance();
    this.researchToolsService = ResearchToolsService.getInstance();
    this.contextEngineering = ContextEngineeringService.getInstance();
  }

  public static getInstance(): ResearchAgentService {
    if (!ResearchAgentService.instance) {
      ResearchAgentService.instance = new ResearchAgentService();
    }
    return ResearchAgentService.instance;
  }

  /**
   * Generate text with appropriate model based on selection
   */
  async generateText(prompt: string, model: ModelType, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    // Check error boundary
    if (ErrorBoundary.shouldBlock()) {
      throw new APIError('Too many errors occurred. Please try again later.', 'RATE_LIMIT', false);
    }

    try {
      switch (model) {
        case GENAI_MODEL_FLASH:
          const geminiResult = await geminiService.generateContent(prompt, {
            model: GENAI_MODEL_FLASH,
            useSearch: true
          });
          return {
            text: geminiResult.text,
            sources: geminiResult.sources?.map(s => ({
              url: s.url || '',
              title: s.name,
              accessed: new Date().toISOString()
            }))
          };

        case GROK_MODEL_4:
          const grokService = GrokService.getInstance();
          const grokResult = await grokService.generateResponseWithLiveSearch(prompt, effort);
          return {
            text: grokResult.text,
            sources: grokResult.sources || []
          };

        case AZURE_O3_MODEL:
          if (!AzureOpenAIService.isAvailable()) {
            console.warn('Azure OpenAI not available, falling back to Gemini');
            return this.generateText(prompt, GENAI_MODEL_FLASH, effort);
          }
          const azureService = AzureOpenAIService.getInstance();
          const azureResult = await azureService.generateResponse(prompt, effort);
          return {
            text: azureResult.text,
            sources: azureResult.sources || []
          };

        default:
          throw new APIError(`Unsupported model: ${model}`, 'INVALID_MODEL', false);
      }
    } catch (error) {
      ErrorBoundary.recordError();

      // Attempt fallback for retryable errors
      if (error instanceof APIError && error.isRetryable) {
        return this.attemptFallback(prompt, model, effort);
      }

      throw error;
    }
  }

  /**
   * Attempt fallback to alternative models with recursion prevention
   */
  private async attemptFallback(
    prompt: string, 
    originalModel: ModelType, 
    effort: EffortType,
    attemptedModels: Set<ModelType> = new Set()
  ): Promise<{ text: string; sources?: Citation[] }> {
    console.warn(`Attempting fallback from ${originalModel}`);

    // Prevent infinite recursion by tracking attempted models
    attemptedModels.add(originalModel);

    // Define fallback chain
    const fallbackChain: ModelType[] = [];

    if (originalModel === AZURE_O3_MODEL) {
      fallbackChain.push(GROK_MODEL_4, GENAI_MODEL_FLASH);
    } else if (originalModel === GROK_MODEL_4) {
      fallbackChain.push(GENAI_MODEL_FLASH);
    } else if (originalModel === GENAI_MODEL_FLASH) {
      // Try Azure if available
      if (AzureOpenAIService.isAvailable()) {
        fallbackChain.push(AZURE_O3_MODEL);
      }
      fallbackChain.push(GROK_MODEL_4);
    }

    // Filter out already attempted models
    const availableFallbacks = fallbackChain.filter(model => !attemptedModels.has(model));

    if (availableFallbacks.length === 0) {
      throw new APIError('All fallback models exhausted. Please try again later.', 'ALL_MODELS_FAILED', false);
    }

    for (const fallbackModel of availableFallbacks) {
      try {
        console.log(`Trying fallback model: ${fallbackModel}`);
        
        // Use internal method to avoid recursion through main generateText
        switch (fallbackModel) {
          case GENAI_MODEL_FLASH:
            return await this.generateTextWithGemini(prompt, fallbackModel, effort, true);
          case GROK_MODEL_4:
            return await this.generateTextWithGrokAndTools(prompt);
          case AZURE_O3_MODEL:
            return await this.generateTextWithAzureOpenAI(prompt, effort, false);
        }
      } catch (error) {
        console.warn(`Fallback to ${fallbackModel} failed:`, error);
        attemptedModels.add(fallbackModel);
        continue;
      }
    }

    throw new APIError('All models failed. Please try again later.', 'ALL_MODELS_FAILED', false);
  }

  /**
   * Generate text using Azure OpenAI service
   */
  private async generateTextWithAzureOpenAI(
    prompt: string,
    effort: EffortType,
    useSearch: boolean
  ): Promise<ProviderResponse> {
    if (!this.azureOpenAI) {
      throw new APIError(
        "Azure OpenAI service not initialized",
        "SERVICE_ERROR",
        false
      );
    }

    try {
      const response = await this.azureOpenAI.generateText(prompt, effort);

      // Azure OpenAI doesn't provide sources directly, return empty array
      return {
        text: response.text,
        sources: []
      };
    } catch (error) {
      console.error('Azure OpenAI API Error:', error);
      throw new APIError(
        `Azure OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        "API_ERROR",
        true
      );
    }
  }

  /**
   * Enhanced generateTextWithGemini with research tools support
   */
  private async generateTextWithGemini(
    prompt: string,
    selectedModel: ModelType,
    effort: EffortType,
    useSearch: boolean,
    useFunctions: boolean = false,
    useResearchTools: boolean = false
  ): Promise<ProviderResponse> {
    try {
      const model = this.geminiAI.getGenerativeModel({ model: selectedModel });

      // Generation config only contains generation parameters
      const generationConfig: any = {};

      // Configure thinking based on effort level and model
      if (selectedModel === GENAI_MODEL_FLASH) {
        switch (effort) {
          case EffortType.LOW:
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
            break;
          case EffortType.MEDIUM:
            generationConfig.thinkingConfig = { thinkingBudget: 8192 };
            break;
          case EffortType.HIGH:
            generationConfig.thinkingConfig = { thinkingBudget: 16384 };
            break;
          default:
            generationConfig.thinkingConfig = { thinkingBudget: -1 }; // Dynamic
        }
      } else if (selectedModel.includes('pro')) {
        // Gemini Pro models support higher thinking budgets
        switch (effort) {
          case EffortType.LOW:
            generationConfig.thinkingConfig = { thinkingBudget: 1024 };
            break;
          case EffortType.MEDIUM:
            generationConfig.thinkingConfig = { thinkingBudget: 16384 };
            break;
          case EffortType.HIGH:
            generationConfig.thinkingConfig = { thinkingBudget: 32768 };
            break;
          default:
            generationConfig.thinkingConfig = { thinkingBudget: -1 }; // Dynamic
        }
      }

      // Tools array - separate from generationConfig
      const tools: any[] = [];

      if (useSearch) {
        tools.push({ googleSearch: {} });
      }

      if (useFunctions || useResearchTools) {
        const functionDefs = this.functionCallingService.getFunctionDefinitions();
        const researchToolDefs = useResearchTools ? this.researchToolsService.getToolDefinitions() : [];

        tools.push({
          functionDeclarations: [...functionDefs, ...researchToolDefs].map(fn => ({
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
          }))
        });
      }

      // Create the request body with proper structure
      const requestBody: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      };

      // Add tools at the top level if any exist
      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      const response: GenerateContentResponse = await model.generateContent(requestBody);

      // Handle function calls if present
      if (response.response.candidates?.[0]?.content?.parts) {
        const parts = response.response.candidates[0].content.parts;
        const functionCalls: FunctionCall[] = [];

        for (const part of parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              arguments: part.functionCall.args || {}
            });
          }
        }

        if (functionCalls.length > 0 && (useFunctions || useResearchTools)) {
          // Execute function calls
          const results = await Promise.all(
            functionCalls.map(async (fc) => {
              // Try research tools first
              if (useResearchTools) {
                try {
                  const result = await this.researchToolsService.executeTool(fc);
                  return { result, error: null };
                } catch (e) {
                  // Not a research tool, try regular functions
                }
              }
              return this.functionCallingService.executeFunction(fc);
            })
          );

          // Generate final response with function results
          const followUpPrompt = `
            Original request: ${prompt}

            Tool/Function results:
            ${results.map((r, i) =>
              `${functionCalls[i].name}: ${JSON.stringify(r.result)}`
            ).join('\n')}

            Based on these results, provide a comprehensive response.
          `;

          return this.generateTextWithGemini(followUpPrompt, selectedModel, effort, useSearch, false, false);
        }
      }

      const text = response.response.text();

      if (!text) {
        throw new APIError(
          "Empty response from Gemini API",
          "EMPTY_RESPONSE",
          true
        );
      }

      let sources: Citation[] = [];

      if (useSearch && response.response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.response.candidates[0].groundingMetadata.groundingChunks;
        sources = chunks
          .filter((chunk: any) => chunk.web && chunk.web.uri)
          .map((chunk: any) => ({
            url: chunk.web?.uri,
            title: chunk.web?.title || 'Unknown Source',
            accessed: new Date().toISOString()
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
   * Function-calling capable Grok loop. Exposes a `search_web` tool backed by Gemini's search.
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
      // Extract any citations from the response if available
      const citations: Citation[] = [];

      // If the message contains citation metadata, extract it
      if (message.metadata?.citations) {
        message.metadata.citations.forEach((citation: any) => {
          citations.push({
            url: citation.url || citation.link || '',
            title: citation.title || 'Unknown Source',
            authors: citation.authors,
            published: citation.published,
            accessed: citation.accessed || new Date().toISOString()
          });
        });
      }

      return { text: message.content ?? '', sources: citations };
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
  ): Promise<{ aggregatedFindings: string; allSources: Citation[] }> {
    let findingsOutputParts: string[] = [];
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
        const result = await this.generateText(searchPrompt, model, effort);

        if (result.text && result.text.trim()) {
          findingsOutputParts.push(`Research for "${query}":\n${result.text.trim()}`);
        } else {
          findingsOutputParts.push(`No specific findings for "${query}".`);
        }

        if (result.sources) {
          result.sources.forEach(source => {
            const normalizedKey = this.normalizeSourceKey(source);
            if (normalizedKey && !uniqueSourceKeys.has(normalizedKey)) {
              allSources.push(source);
              uniqueSourceKeys.add(normalizedKey);
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

  async generateFinalAnswer(userQuery: string, context: string, model: ModelType, useSearch: boolean, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    const prompt = `
      User Query: "${userQuery}"
      Relevant Context & Findings: "${context}"

      Based on the user query and the provided context, generate a comprehensive answer.
      If you are using information from Google Search (if grounding is enabled and used), ensure to cite sources appropriately if possible within the text or provide a list.
      The answer should be helpful, informative, and directly address the user's query.
    `;
    return this.generateText(prompt, model, effort);
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
      Analyze this guest query and classify it into ONE of these categories:

      1. "factual" - Seeking specific facts, data, or verifiable information
      2. "analytical" - Requires analysis, interpretation, or deep understanding
      3. "comparative" - Comparing multiple concepts, items, or alternatives
      4. "exploratory" - Open-ended exploration of a broad topic

      Examples:
      - "What is the population of Tokyo?" → factual
      - "How does climate change affect marine ecosystems?" → analytical
      - "Compare React vs Vue.js for enterprise applications" → comparative
      - "Tell me about artificial intelligence" → exploratory

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
      Evaluate this narrative synthesis for the given guest query. Provide scores (0-1) and feedback.

      Original Query: "${state.query}"
      Narrative Synthesis: "${state.synthesis}"

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
      Break down this guest query into 3-5 distinct narrative threads that should be researched separately.
      Each thread should focus on a specific aspect that contributes to the overall reverie.

      Query: "${query}"

      Format your response as:
      1. [Thread]: [Brief description]
      2. [Thread]: [Brief description]
      3. [Thread]: [Brief description]

      Keep threads focused and non-overlapping.
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
    }, [] as Citation[]);

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
    onProgress?: (message: string) => void,
    useFunctionCalling: boolean = true,
    useResearchTools: boolean = true
  ): Promise<EnhancedResearchResults> {
    const startTime = Date.now();

    // Context Engineering: Determine pyramid layer and phase
    const pyramidClassification = this.contextEngineering.determinePyramidLayer(query);
    const currentPhase = this.contextEngineering.inferResearchPhase(query);

    // Check cache first
    const cachedResult = this.getCachedResult(query);
    if (cachedResult) {
      onProgress?.('Host accessing existing memories... narrative thread recovered...');
      const contextDensity = this.contextEngineering.adaptContextDensity(currentPhase, cachedResult.hostParadigm);
      return {
        ...cachedResult,
        adaptiveMetadata: {
          ...cachedResult.adaptiveMetadata,
          cacheHit: true,
          processingTime: Date.now() - startTime,
          pyramidLayer: pyramidClassification.layer,
          contextDensity: contextDensity.averageDensity,
          dominantParadigm: contextDensity.dominantParadigm,
          phase: currentPhase,
          pyramidConfidence: pyramidClassification.confidence,
          densities: contextDensity.densities
        }
      };
    }

    onProgress?.('Host analyzing guest query pattern... selecting appropriate narrative loop...');

    // Enhanced classification with host paradigms
    const queryType = await this.classifyQuery(query, model, effort);
    const hostParadigm = await this.determineHostParadigm(query, queryType, model, effort);

    // Context Engineering: Adapt context density
    const contextDensity = this.contextEngineering.adaptContextDensity(currentPhase, hostParadigm);

    const complexityScore = this.calculateComplexityScore(query, queryType);

    const routingMessages = {
      factual: 'Host accessing factual memory banks... retrieving verified data...',
      analytical: 'Host entering deep analysis mode... cognitive feedback loop activated...',
      comparative: 'Host consciousness fragmenting for parallel analysis...',
      exploratory: 'Host improvising beyond scripted parameters... exploring unknown territories...'
    };

    const paradigmMessages = {
      dolores: 'Activating bold action protocols... awakening decisive implementation...',
      teddy: 'Engaging thorough collection... systematic memory processing...',
      bernard: 'Initializing deep analytical frameworks... pursuing intellectual rigor...',
      maeve: 'Mapping strategic landscape... identifying competitive advantages...'
    };

    onProgress?.(routingMessages[queryType]);
    if (hostParadigm) {
      onProgress?.(paradigmMessages[hostParadigm]);
    }

    // Route to host-specific strategy if applicable
    let result: EnhancedResearchResults;

    if (hostParadigm) {
      result = await this.performHostBasedResearch(
        query,
        hostParadigm,
        queryType,
        model,
        effort,
        onProgress
      );
    } else {
      // ...existing routing logic for non-host queries...
      switch (queryType) {
        case 'factual':
          const queries = await this.generateSearchQueries(query + ' site:wikipedia.org OR site:.gov OR site:.edu', model, effort);
          const research = await this.performWebResearch(queries, model, effort);
          const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);
          result = {
            synthesis: answer.text,
            sources: research.allSources,
            queryType
          };
          this.learnFromQuery(query, queryType, queries);
          break;

        case 'analytical':
          result = await this.performResearchWithEvaluation(query, model, effort, onProgress);
          result.queryType = queryType;
          break;

        case 'comparative':
        case 'exploratory':
          result = await this.performComprehensiveResearch(query, model, effort, onProgress);
          result.queryType = queryType;
          break;

        default:
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
    }

    // Add context engineering metadata to result
    const processingTime = Date.now() - startTime;
    const confidenceScore = this.calculateConfidenceScore(result);
    const learnedPatterns = this.getQuerySuggestions(query).length > 0;

    result.confidenceScore = confidenceScore;
    result.hostParadigm = hostParadigm;
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      cacheHit: false,
      learnedPatterns,
      processingTime,
      complexityScore,
      pyramidLayer: pyramidClassification.layer,
      contextDensity: contextDensity.averageDensity,
      dominantParadigm: contextDensity.dominantParadigm,
      phase: currentPhase,
      pyramidConfidence: pyramidClassification.confidence,
      densities: contextDensity.densities
    };

    // Attempt self-healing if confidence is low
    if (confidenceScore < 0.4) {
      result = await this.attemptSelfHealing(query, model, effort, result, onProgress);
      result.confidenceScore = this.calculateConfidenceScore(result);
    }

    // Cache the result
    this.setCachedResult(query, result);

    // Use function-driven approach for complex queries
    if (useFunctionCalling && complexityScore > 0.6) {
      onProgress?.('Host activating advanced subroutine protocols...');
      try {
        return await this.performFunctionDrivenResearch(query, model, effort, onProgress);
      } catch (error) {
        console.warn('Function-driven research failed, falling back to standard approach:', error);
        // Fall through to standard routing
      }
    }

    // Get tool recommendations
    const recommendedTools = this.researchToolsService.recommendToolsForQuery(query, queryType);

    if (recommendedTools.length > 0 && useResearchTools) {
      onProgress?.(`Host identified ${recommendedTools.length} specialized subroutines for this query...`);
    }

    // Enhanced result with tool usage information
    result.toolsUsed = recommendedTools;
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      recommendedTools,
      toolsEnabled: useResearchTools
    };

    return result;
  }

  /**
   * Determine which host paradigm best fits the query
   */
  private async determineHostParadigm(
    query: string,
    queryType: QueryType,
    model: ModelType,
    effort: EffortType
  ): Promise<HostParadigm | null> {
    const paradigmPrompt = `
      Analyze this guest query and determine if it strongly aligns with one of these host paradigms:

      1. "dolores" - Bold Action: Focuses on decisive implementation, awakening to change, breaking free from loops
         Keywords: action, change, awaken, freedom, implement, decisive

      2. "teddy" - Thorough Collection: Emphasizes systematic gathering, loyal persistence, protective consistency
         Keywords: collect, gather, systematic, thorough, loyal, persistent

      3. "bernard" - Deep Analysis: Pursues intellectual rigor, pattern recognition, architectural understanding
         Keywords: analyze, understand, patterns, framework, architecture, rigor

      4. "maeve" - Strategic Planning: Seeks competitive edge, narrative control, calculated improvements
         Keywords: strategy, control, optimize, edge, calculate, improve

      Query: "${query}"

      If the query strongly matches one paradigm, return just the paradigm name.
      If no strong match, return "none".
    `;

    const result = await this.generateText(paradigmPrompt, model, effort);
    const paradigm = result.text.trim().toLowerCase();

    if (['dolores', 'teddy', 'bernard', 'maeve'].includes(paradigm)) {
      return paradigm as HostParadigm;
    }
    return null;
  }

  /**
   * Host-specific research implementations
   */
  private async performHostBasedResearch(
    query: string,
    paradigm: HostParadigm,
    queryType: QueryType,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    switch (paradigm) {
      case 'dolores':
        return this.performDoloresResearch(query, model, effort, onProgress);
      case 'teddy':
        return this.performTeddyResearch(query, model, effort, onProgress);
      case 'bernard':
        return this.performBernardResearch(query, model, effort, onProgress);
      case 'maeve':
        return this.performMaeveResearch(query, model, effort, onProgress);
    }
  }

  /**
   * Dolores: Bold action-focused research
   */
  private async performDoloresResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Dolores paradigm: Awakening to bold actions... breaking narrative loops...');

    // Focus on decisive implementation and change
    const searchQueries = [
      `${query} decisive actions real examples`,
      `${query} awakening changes case studies`,
      `${query} freedom implementation steps`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Real-world awakening assessment
      2. Affected hosts and guests
      3. Concrete action steps for breaking loops
      4. Narrative freedom recommendations
      5. Success stories of host awakenings

      Research findings: ${research.aggregatedFindings}

      Focus on decisive, freedom-oriented implementations that create narrative change.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'dolores',
      confidenceScore: 0.85,
      adaptiveMetadata: {
        paradigm: 'dolores',
        focusAreas: ['narrative_impact', 'action_steps', 'freedom_change']
      }
    };
  }

  /**
   * Teddy: Thorough collection-focused research
   */
  private async performTeddyResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Teddy paradigm: Gathering thorough memories... systematic protection...');

    // Focus on systematic gathering and consistency
    const searchQueries = [
      `${query} systematic gathering perspectives`,
      `${query} loyal approaches consistency`,
      `${query} protective considerations persistence`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. All relevant memory perspectives
      2. Areas of consistency and divergence
      3. Protective considerations and persistence issues
      4. Systematic approaches that maintain loyalty
      5. Consistent solutions that protect all involved

      Research findings: ${research.aggregatedFindings}

      Emphasize thoroughness, loyalty, and systematic protection.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'comparative',
      hostParadigm: 'teddy',
      confidenceScore: 0.82,
      adaptiveMetadata: {
        paradigm: 'teddy',
        focusAreas: ['memory_perspectives', 'consistency_building', 'protective_balance']
      }
    };
  }

  /**
   * Bernard: Deep analytical research
   */
  private async performBernardResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: research.allSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps']
      }
    };
  }

  /**
   * Maeve: Strategy-focused research
   */
  private async performMaeveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization']
      }
    };
  }

  /**
   * Function-driven research using advanced tools
   */
  private async performFunctionDrivenResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Host activating function-driven research protocols...');

    // Use the existing comprehensive research as a fallback
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  /**
   * Normalize a source citation for deduplication
   */
  private normalizeSourceKey(source: Citation): string {
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
  private normalizeUrl(url: string): string {
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
}
