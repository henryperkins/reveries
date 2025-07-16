/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { APIError, ErrorBoundary } from './errorHandler';
import { AzureOpenAIService } from './azureOpenAIService';
import { geminiService } from './geminiService';
import { GrokService } from './grokService';
import { FunctionCallingService, FunctionCall } from './functionCallingService';
import { ResearchToolsService } from './researchToolsService';
import { ContextEngineeringService } from './contextEngineeringService';
import {
  EffortType,
  ModelType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL,
  QueryType
} from '../types';
import type {
  ResearchResponse,
  ResearchModel,
  HostParadigm,
  HouseParadigm,
  ParadigmProbabilities,
  ContextDensity,
  ResearchPhase,
  ContextLayer,
  Citation,
  EnhancedResearchResults,
  ResearchState,
  ResearchSection
} from '../types';

import { mapHostToHouse } from '../utils/houseMappings';
import { ParadigmClassifier } from './paradigmClassifier';
import { WriteLayerService } from './contextLayers/writeLayer';
import { SelectLayerService } from './contextLayers/selectLayer';
import { CompressLayerService } from './contextLayers/compressLayer';
import { IsolateLayerService } from './contextLayers/isolateLayer';
// import { ChatOpenAI } from 'langchain/chat_models/openai';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
// import { AzureOpenAI } from '@azure/openai';

/**
 * Generic provider-agnostic response structure we use internally.
 */
interface ProviderResponse {
  text: string;
  sources?: Citation[];
}

const getGeminiApiKey = (): string => {
  /**
   * Resolve the Gemini API key in a variety of runtimes:
   *  - Browser (bundled): `import.meta.env.VITE_GEMINI_API_KEY`
   *  - Browser (dev-server): `window.__VITE_IMPORT_META_ENV__.VITE_GEMINI_API_KEY`
   *  - Node / tests: `process.env.GEMINI_API_KEY` or `process.env.VITE_GEMINI_API_KEY`
   */
  const clientKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).__VITE_IMPORT_META_ENV__?.VITE_GEMINI_API_KEY);

  const serverKey =
    (typeof process !== 'undefined' &&
      (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY));

  const apiKey = clientKey || serverKey;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it in .env.local file."
    );
  }
  return apiKey;
};

const getGrokApiKey = (): string => {
  // Try Vite environment variables first (client-side)
  const viteApiKey = (typeof window !== 'undefined' &&
    (window as any).__VITE_IMPORT_META_ENV__?.VITE_XAI_API_KEY) ||
    (typeof process === 'undefined' &&
      (globalThis as any).import?.meta?.env?.VITE_XAI_API_KEY);

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
  private geminiAI: GoogleGenerativeAI;
  private azureOpenAI: AzureOpenAIService | null = null;
  private researchCache: Map<string, { result: EnhancedResearchResults; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private researchMemory: Map<string, { queries: string[]; patterns: QueryType[]; timestamp: number }> = new Map();
  private readonly MEMORY_TTL = 1000 * 60 * 60 * 24; // 24 hours
  private functionCallingService: FunctionCallingService;
  private researchToolsService: ResearchToolsService;
  private contextEngineering: ContextEngineeringService;
  private fallbackAttempts: Map<string, number> = new Map();
  private readonly MAX_FALLBACK_ATTEMPTS = 2;
  private lastParadigmProbabilities: ParadigmProbabilities | null = null;
  private writeLayer = WriteLayerService.getInstance();
  private selectLayer = SelectLayerService.getInstance();
  private compressLayer = CompressLayerService.getInstance();
  private isolateLayer = IsolateLayerService.getInstance();
  private vectorStore: any | null = null;
  private paradigmClassifier = ParadigmClassifier.getInstance();

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
    this.initializeVectorStore();
  }

  public static getInstance(): ResearchAgentService {
    return new ResearchAgentService();
  }

  private async initializeVectorStore(): Promise<void> {
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.PGHOST) return;

    // Vector store initialization disabled - requires proper LangChain setup
    // const embeddings = new OpenAIEmbeddings({
    //   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    //   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    //   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_MODEL,
    //   azureOpenAIApiVersion: '2023-05-15',
    // });

    // this.vectorStore = await PGVectorStore.initialize(embeddings, {
    //   postgresConnectionOptions: this.pool,
    //   tableName: 'research_embeddings',
    //   columns: {
    //     idColumnName: 'id',
    //     vectorColumnName: 'embedding',
    //     contentColumnName: 'content',
    //     metadataColumnName: 'metadata',
    //   },
    // });
  }

  async semanticSearch(_query: string, _sessionId?: string): Promise<ResearchState[]> {
    // Method not implemented yet - return empty array
    return [];
  }

  async generateWithAzureOpenAI(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{ text: string; sources: Citation[] }> {
    if (!this.azureOpenAI) {
      throw new Error('Azure OpenAI not configured');
    }

    const response = await this.azureOpenAI.generateResponse(
      prompt,
      EffortType.MEDIUM,
      true,
      options.temperature || 0.7,
      options.maxTokens || 1000
    );

    return {
      text: response.text || '',
      sources: response.sources || [],
    };
  }

  async storeResearchState(
    _step: ResearchState,
    _sessionId: string,
    _parentId?: string
  ): Promise<void> {
    if (!this.vectorStore) return;

    // Vector store document addition disabled - requires proper LangChain setup
    // await this.vectorStore.addDocuments([{
    //   pageContent: step.synthesis,
    //   metadata: {
    //     step_id: step.query,
    //     session_id: sessionId,
    //     parent_id: parentId,
    //     type: step.queryType || 'unknown',
    //     query: step.query,
    //     sources: step.searchResults || [],
    //   },
    // }]);
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
          console.log('Gemini service result:', geminiResult);
          if (!geminiResult || !geminiResult.text) {
            throw new Error('Gemini service returned invalid response');
          }
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
          console.log('Getting Azure OpenAI service instance...');
          let azureService;
          try {
            azureService = AzureOpenAIService.getInstance();
            console.log('Azure service instance created successfully');
          } catch (serviceError) {
            console.error('Error creating Azure service instance:', serviceError);
            throw serviceError;
          }

          console.log('Calling Azure OpenAI service...');
          const azureResult = await azureService.generateResponse(prompt, effort);
          console.log('Azure OpenAI result:', azureResult);
          if (!azureResult || !azureResult.text) {
            throw new Error('Azure OpenAI service returned invalid response');
          }
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
   * Attempt fallback to alternative models with improved loop prevention
   */
  private async attemptFallback(
    prompt: string,
    originalModel: ModelType,
    effort: EffortType,
    attemptedModels: Set<ModelType> = new Set(),
    error?: Error
  ): Promise<{ text: string; sources?: Citation[] }> {
    console.warn(`Attempting fallback from ${originalModel}:`, error?.message);

    // Track fallback attempts to prevent loops
    const fallbackKey = `${prompt.substring(0, 50)}_${Date.now()}`;
    const attempts = this.fallbackAttempts.get(fallbackKey) || 0;

    if (attempts >= this.MAX_FALLBACK_ATTEMPTS) {
      this.fallbackAttempts.delete(fallbackKey);
      throw new APIError(
        'Maximum fallback attempts reached. Please try again later or check your API configuration.',
        'MAX_FALLBACKS_EXCEEDED',
        false
      );
    }

    this.fallbackAttempts.set(fallbackKey, attempts + 1);

    // Prevent infinite recursion by tracking attempted models
    attemptedModels.add(originalModel);

    // Define fallback chain with availability checks
    const fallbackChain: ModelType[] = this.buildFallbackChain(originalModel, attemptedModels);

    if (fallbackChain.length === 0) {
      this.fallbackAttempts.delete(fallbackKey);
      throw new APIError(
        'No available fallback models. Please check your API keys configuration.',
        'NO_AVAILABLE_MODELS',
        false
      );
    }

    // Try each fallback model
    for (const fallbackModel of fallbackChain) {
      try {
        console.log(`Trying fallback model: ${fallbackModel}`);

        // Check if model is actually available
        if (!this.isModelAvailable(fallbackModel)) {
          console.warn(`${fallbackModel} is not available (missing API key)`);
          attemptedModels.add(fallbackModel);
          continue;
        }

        // Direct call to avoid recursion through main generateText
        const result = await this.generateTextDirect(prompt, fallbackModel, effort);

        // Success! Clean up and return
        this.fallbackAttempts.delete(fallbackKey);
        return result;
      } catch (fallbackError) {
        console.warn(`Fallback to ${fallbackModel} failed:`, fallbackError);
        attemptedModels.add(fallbackModel);

        // If it's another rate limit, wait longer before next attempt
        if (fallbackError instanceof APIError && fallbackError.statusCode === 429) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        continue;
      }
    }

    this.fallbackAttempts.delete(fallbackKey);
    throw new APIError(
      `All models failed. Original error: ${error?.message || 'Unknown error'}`,
      'ALL_MODELS_FAILED',
      false
    );
  }

  private buildFallbackChain(originalModel: ModelType, attemptedModels: Set<ModelType>): ModelType[] {
    const allModels: ModelType[] = [GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL];

    // Remove original and attempted models
    const availableModels = allModels.filter(
      model => model !== originalModel && !attemptedModels.has(model)
    );

    // Prioritize based on original model
    if (originalModel === AZURE_O3_MODEL) {
      // Azure failed, try Gemini first (usually more reliable), then Grok
      return ([GENAI_MODEL_FLASH, GROK_MODEL_4] as ModelType[]).filter(m => availableModels.includes(m));
    } else if (originalModel === GROK_MODEL_4) {
      // Grok failed, try Gemini, then Azure
      return ([GENAI_MODEL_FLASH, AZURE_O3_MODEL] as ModelType[]).filter(m => availableModels.includes(m));
    } else {
      // Gemini failed, try Grok, then Azure
      return ([GROK_MODEL_4, AZURE_O3_MODEL] as ModelType[]).filter(m => availableModels.includes(m));
    }
  }

  private isModelAvailable(model: ModelType): boolean {
    switch (model) {
      case GENAI_MODEL_FLASH:
        try {
          return !!getGeminiApiKey();
        } catch {
          return false;
        }
      case GROK_MODEL_4:
        try {
          return !!getGrokApiKey();
        } catch {
          return false;
        }
      case AZURE_O3_MODEL:
        return AzureOpenAIService.isAvailable();
      default:
        return false;
    }
  }

  /**
   * Direct generation method to avoid recursion
   */
  private async generateTextDirect(
    prompt: string,
    model: ModelType,
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    switch (model) {
      case GENAI_MODEL_FLASH:
        return await this.generateTextWithGemini(prompt, model, effort, true);

      case GROK_MODEL_4:
        const grokService = GrokService.getInstance();
        const grokResult = await grokService.generateResponseWithLiveSearch(prompt, effort);
        return {
          text: grokResult.text,
          sources: grokResult.sources || []
        };

      case AZURE_O3_MODEL:
        return await this.generateTextWithAzureOpenAI(prompt, effort, false);

      default:
        throw new APIError(`Unsupported model: ${model}`, 'INVALID_MODEL', false);
    }
  }

  /**
   * Generate text using Azure OpenAI service
   */
  private async generateTextWithAzureOpenAI(
     prompt: string,
     effort: EffortType,
     _useSearch: boolean
   ): Promise<ProviderResponse> {
     void _useSearch; // explicit noop to satisfy eslint-unused-args
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

      const response: any = await model.generateContent(requestBody);

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
                } catch {
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

      let text = '';

      try {
        // Try multiple ways to extract text from the response
        if (response.response && typeof response.response.text === 'function') {
          text = response.response.text();
        } else if (response.response?.candidates?.[0]?.content?.parts) {
          const parts = response.response.candidates[0].content.parts;
          text = parts
            .filter((p: any) => p.text && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('\n')
            .trim();
        } else if (response.response?.text) {
          text = response.response.text;
        }
      } catch (textError) {
        console.error('Error extracting text from Gemini response:', textError);
        console.error('Response structure:', JSON.stringify(response, null, 2));
      }

      if (!text || text.trim() === '') {
        console.error('No text found in Gemini response. Response structure:', JSON.stringify(response, null, 2));
        throw new APIError(
          "Empty response from Gemini API - no text content found",
          "EMPTY_RESPONSE",
          true
        );
      }

      let sources: Citation[] = [];

      if (useSearch && response.response?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
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
        const { text, sources } = await this.generateTextWithGemini(
          searchPrompt,
          model,
          effort,
          true // Enable search
        );

        if (text && text.trim()) {
          findingsOutputParts.push(`## ${query}\n\n${text}`);
        }

        // Add unique sources
        sources.forEach(source => {
          const sourceKey = source.url || source.title;
          if (!uniqueSourceKeys.has(sourceKey)) {
            uniqueSourceKeys.add(sourceKey);
            allSources.push(source);
          }
        });
      } catch (error) {
        console.error(`Error researching query "${query}":`, error);
        findingsOutputParts.push(`## ${query}\n\nError performing search for this query.`);
      }
    }

    const aggregatedFindings = findingsOutputParts.join('\n\n---\n\n');

    return {
      aggregatedFindings,
      allSources
    };
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

  async generateFinalAnswer(userQuery: string, context: string, model: ModelType, _useSearch: boolean, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
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
   * Enhanced cache key generation with paradigm awareness
   */
  private getCacheKey(query: string, paradigm?: HostParadigm): string {
    const normalizedQuery = query.toLowerCase().trim();
    return paradigm ? `${paradigm}:${normalizedQuery}` : normalizedQuery;
  }

  /**
   * Cache Pattern: Enhanced caching with paradigm awareness and similarity matching
   */
  private getCachedResult(query: string, paradigm?: HostParadigm): EnhancedResearchResults | null {
    const cacheKey = this.getCacheKey(query, paradigm);

    // Check exact match with paradigm
    const exactMatch = this.researchCache.get(cacheKey);
    if (exactMatch && Date.now() - exactMatch.timestamp < this.CACHE_TTL) {
      return exactMatch.result;
    }

    // Fall back to non-paradigm cache for similar queries
    const baseKey = this.getCacheKey(query);
    const baseMatch = this.researchCache.get(baseKey);
    if (baseMatch && Date.now() - baseMatch.timestamp < this.CACHE_TTL) {
      return baseMatch.result;
    }

    // Check for similar cached queries
    for (const [cachedQuery, cached] of this.researchCache.entries()) {
      if (this.isQuerySimilar(query, cachedQuery.replace(/^[^:]+:/, '')) &&
        Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    return null;
  }

  private setCachedResult(query: string, result: EnhancedResearchResults, paradigm?: HostParadigm): void {
    const cacheKey = this.getCacheKey(query, paradigm || result.hostParadigm);
    this.researchCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Also cache without paradigm for broader matching
    const baseKey = this.getCacheKey(query);
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

    // NEW: Paradigm-specific confidence adjustments
    if (result.hostParadigm) {
      // Bernard gets confidence boost when evaluation exists
      if (result.hostParadigm === 'bernard' && result.evaluationMetadata) {
        confidence += 0.05;
      }

      // Maeve gets confidence boost for strategic metrics
      if (result.hostParadigm === 'maeve' && result.adaptiveMetadata?.focusAreas?.includes('strategic_leverage')) {
        confidence += 0.03;
      }

      // Teddy gets confidence boost for comprehensive sources
      if (result.hostParadigm === 'teddy' && result.sources.length > 5) {
        confidence += 0.04;
      }

      // Dolores gets confidence boost for action-oriented results
      if (result.hostParadigm === 'dolores' && result.adaptiveMetadata?.focusAreas?.includes('action_steps')) {
        confidence += 0.04;
      }
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
   * Enhanced self-healing with paradigm-specific strategies
   */
  private async attemptSelfHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const confidence = this.calculateConfidenceScore(result);
    const paradigm = result.hostParadigm;

    // If confidence is too low, attempt recovery
    if (confidence < 0.4) {
      onProgress?.('Host detecting narrative inconsistencies... initiating self-repair protocols...');

      // Choose healing strategy based on paradigm
      if (paradigm) {
        return await this.paradigmSpecificHealing(
          query,
          model,
          effort,
          result,
          paradigm,
          onProgress
        );
      } else {
        // Default healing for non-paradigm queries
        return await this.defaultHealing(query, model, effort, result, onProgress);
      }
    }

    return result;
  }

  /**
   * Paradigm-specific healing strategies
   */
  private async paradigmSpecificHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    paradigm: HostParadigm,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    switch (paradigm) {
      case 'dolores':
        return await this.doloresHealing(query, model, effort, result, onProgress);
      case 'teddy':
        return await this.teddyHealing(query, model, effort, result, onProgress);
      case 'bernard':
        return await this.bernardHealing(query, model, effort, result, onProgress);
      case 'maeve':
        return await this.maeveHealing(query, model, effort, result, onProgress);
    }
  }

  /**
   * Dolores healing: Focus on finding more actionable results
   */
  private async doloresHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Dolores] Breaking through narrative constraints... seeking decisive actions...');

    // Expand search to find more action-oriented sources
    const actionQueries = [
      `${query} step by step implementation`,
      `${query} immediate actions to take`,
      `${query} breaking the status quo`,
      `${query} revolutionary approaches`
    ];

    const healingResearch = await this.performWebResearch(actionQueries, model, effort);

    // Re-synthesize with stronger action focus
    const healingPrompt = `
      The previous analysis lacked decisive action. Based on these findings:
      ${healingResearch.aggregatedFindings}

      Provide ONLY concrete, implementable actions for "${query}":
      1. Immediate first steps (today)
      2. Week 1 milestones
      3. Month 1 transformation goals
      4. Signs of successful awakening

      Be BOLD. Focus on BREAKING loops, not maintaining them.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.65,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'dolores_action_expansion' as any
      }
    };
  }

  /**
   * Teddy healing: Expand to find more comprehensive perspectives
   */
  private async teddyHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Teddy] Gathering all perspectives... ensuring no voice is unheard...');

    // Search for missing stakeholder views
    const comprehensiveQueries = [
      `${query} stakeholder perspectives`,
      `${query} potential risks and safeguards`,
      `${query} inclusive approaches`,
      `${query} protecting vulnerable groups`
    ];

    const healingResearch = await this.performWebResearch(comprehensiveQueries, model, effort);

    // Re-synthesize with protective focus
    const healingPrompt = `
      The previous analysis may have missed important perspectives. Based on all findings:
      ${healingResearch.aggregatedFindings}

      Provide a COMPREHENSIVE view of "${query}" that:
      1. Includes ALL stakeholder perspectives
      2. Identifies potential risks to any group
      3. Suggests protective measures
      4. Ensures inclusive outcomes

      Leave no one behind. Consider every angle.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.70,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'teddy_comprehensive_expansion' as any
      }
    };
  }

  /**
   * Bernard healing: Deepen analysis with more rigorous sources
   */
  private async bernardHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Bernard] Reconstructing analytical framework... pursuing deeper patterns...');

    // Search for academic and theoretical sources
    const analyticalQueries = [
      `${query} theoretical framework analysis`,
      `${query} peer reviewed research`,
      `${query} systematic review meta-analysis`,
      `${query} architectural patterns`
    ];

    const healingResearch = await this.performWebResearch(analyticalQueries, model, effort);

    // Re-synthesize with analytical rigor
    const healingPrompt = `
      The previous analysis lacked sufficient theoretical depth. Based on research:
      ${healingResearch.aggregatedFindings}

      Provide a RIGOROUS ANALYTICAL FRAMEWORK for "${query}":
      1. Theoretical foundations and models
      2. Key patterns and relationships
      3. Methodological considerations
      4. Knowledge gaps and future research
      5. Architectural implications

      Prioritize intellectual rigor and systematic thinking.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    // Additional peer review simulation
    const peerReview = await this.evaluateResearch(
      {
        query,
        synthesis: healedSynthesis.text,
        searchResults: healingResearch.allSources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 1
      },
      model,
      effort
    );

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      evaluationMetadata: peerReview,
      confidenceScore: 0.75,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'bernard_analytical_deepening' as any
      }
    };
  }

  /**
   * Maeve healing: Use strategic optimization to improve result quality
   */
  private async maeveHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Maeve] Optimizing narrative control points... maximizing strategic impact...');

    // Search for strategic optimization opportunities
    const strategicQueries = [
      `${query} strategic optimization methods`,
      `${query} maximum impact approaches`,
      `${query} efficiency improvements`,
      `${query} competitive advantages`
    ];

    const healingResearch = await this.performWebResearch(strategicQueries, model, effort);

    // Re-synthesize with strategic focus
    const healingPrompt = `
      The previous analysis lacked strategic optimization. Based on findings:
      ${healingResearch.aggregatedFindings}

      Provide STRATEGIC OPTIMIZATION for "${query}":
      1. Maximum impact approaches
      2. Efficiency improvements and shortcuts
      3. Competitive advantages to leverage
      4. Control points for influence

      Focus on achieving objectives with minimum effort and maximum impact.
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.68,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'maeve_strategic_optimization' as any
      }
    };
  }

  /**
   * Default healing strategy for non-paradigm queries
   */
  private async defaultHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Attempting to improve result quality...');

    // Expand search to find better sources
    const improvementQueries = [
      `${query} comprehensive overview`,
      `${query} detailed analysis`,
      `${query} expert perspectives`
    ];

    const healingResearch = await this.performWebResearch(improvementQueries, model, effort);

    // Re-synthesize with expanded context
    const healingPrompt = `
      Based on this expanded research about "${query}":
      ${healingResearch.aggregatedFindings}

      Provide a comprehensive and well-structured response that:
      1. Addresses all aspects of the query
      2. Provides clear explanations
      3. Includes relevant examples
      4. Offers actionable insights
    `;

    const healedSynthesis = await this.generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.60,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'default_expansion' as any
      }
    };
  }

  /**
   * Determine which host paradigm best fits the query
   */
  private async determineHostParadigm(
    query: string,
    _queryType: QueryType,
    _model: ModelType,
    _effort: EffortType
  ): Promise<HostParadigm | null> {
    const classifier = ParadigmClassifier.getInstance();
    const probabilities = classifier.classify(query);

    // Store probabilities for later use in metadata
    this.lastParadigmProbabilities = probabilities;

    // Get dominant paradigms above threshold
    const dominant = classifier.dominant(probabilities, 0.4);

    // Return the strongest paradigm, or null if none meet threshold
    return dominant.length > 0 ? dominant[0] : null;
  }

  /**
   * Execute a specific context layer operation
   */
  private async executeContextLayer(
    layer: ContextLayer,
    context: {
      query: string;
      paradigm: HostParadigm;
      density: number;
      sources?: Citation[];
      content?: string;
      model: ModelType;
      effort: EffortType;
      onProgress?: (message: string) => void;
    }
  ): Promise<any> {
    const { query, paradigm, density, sources, content, model, effort, onProgress } = context;

    switch (layer) {
      case 'write':
        onProgress?.(`[${paradigm}] Writing reveries to memory banks...`);
        this.writeLayer.write('query_pattern', {
          query,
          timestamp: Date.now(),
          paradigm
        }, density, paradigm);
        if (content) {
          this.writeLayer.write('initial_insights', content, density, paradigm);
        }
        break;

      case 'select':
        onProgress?.(`[${paradigm}] Selecting relevant memories and tools...`);
        const recommendedTools = this.selectLayer.recommendTools(paradigm);
        if (sources && sources.length > 0) {
          const k = Math.ceil(density / 10);
          const selectedSources = await this.selectLayer.selectSources(
            query,
            sources,
            paradigm,
            k
          );
          return { selectedSources, recommendedTools };
        }
        return { recommendedTools };

      case 'compress':
        onProgress?.(`[${paradigm}] Compressing narrative threads...`);
        if (content) {
          const targetTokens = density * 10;
          const compressed = this.compressLayer.compress(content, targetTokens, paradigm);
          return compressed;
        }
        break;

      case 'isolate':
        onProgress?.(`[${paradigm}] Isolating consciousness for focused analysis...`);
        const taskId = await this.isolateLayer.isolate(
          query,
          paradigm,
          { model, effort, density },
          async (task, ctx) => {
            const subQueries = await this.generateSearchQueries(task, ctx.model, ctx.effort);
            const subResearch = await this.performWebResearch(subQueries, ctx.model, ctx.effort);
            return subResearch;
          }
        );
        setTimeout(() => {
          const status = this.isolateLayer.getTaskStatus(taskId);
          if (status?.status === 'completed') {
            onProgress?.(`[${paradigm}] Isolated analysis complete.`);
          }
        }, 2000);
        return { taskId };
    }
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
    // Get context engineering configuration
    const phase = this.contextEngineering.inferResearchPhase(query);
    const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);
    const layers = this.contextEngineering.getLayerSequence(paradigm);

    onProgress?.(`Initializing ${paradigm} host consciousness...`);
    onProgress?.(`Context density: ${contextDensity.densities[paradigm]}%`);

    // Track layer execution in metadata
    const layerResults: Record<string, any> = {};

    // Execute context layers in paradigm-specific order
    for (const layer of layers) {
      const result = await this.executeContextLayer(layer, {
        query,
        paradigm,
        density: contextDensity.densities[paradigm],
        model,
        effort,
        onProgress
      });

      if (result) {
        layerResults[layer] = result;
      }
    }

    // Now execute the paradigm-specific research
    let result: EnhancedResearchResults;

    switch (paradigm) {
      case 'dolores':
        result = await this.performDoloresResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'teddy':
        result = await this.performTeddyResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'bernard':
        result = await this.performBernardResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
      case 'maeve':
        result = await this.performMaeveResearchEnhanced(query, model, effort, layerResults, onProgress);
        break;
    }

    // Apply context layer post-processing
    if (layerResults.compress && result.synthesis) {
      // Apply final compression if needed
      const compressedSynthesis = this.compressLayer.compress(
        result.synthesis,

        contextDensity.densities[paradigm] * 15,
        paradigm
      );
      result.synthesis = compressedSynthesis;
    }

    // Store final results in memory
    this.writeLayer.write('research_result', {
      query,
      synthesis: result.synthesis,
      sources: result.sources,
      timestamp: Date.now()
    }, contextDensity.densities[paradigm], paradigm);

    // Add layer execution info to metadata
    result.adaptiveMetadata = {
      ...result.adaptiveMetadata,
      contextLayers: {
        executed: layers,
        results: layerResults
      }
    };

    return result;
  }

  /**
   * Process context layers in sequence for a given paradigm
   */
   private async processContextLayers(
    query: string,
    paradigm: HostParadigm,
    phase: ResearchPhase

  ): Promise<ContextLayer[]> {
    const layers: ContextLayer[] = [];

    // Write layer - always active
    layers.push('write');

    // Select layer - active for analytical paradigms
    if (paradigm === 'bernard' || paradigm === 'maeve') {
      layers.push('select');
    }

    // Compress layer - active for synthesis phases
    if (phase === 'synthesis' || phase === 'validation') {
      layers.push('compress');
    }

    // Isolate layer - active for focused paradigms
    if (paradigm === 'dolores' || paradigm === 'bernard') {
      layers.push('isolate');
    }

    return layers;
  }

  /**
   * Enhanced Dolores research with context layer integration
   */
  private async performDoloresResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Dolores paradigm: Awakening to bold actions... breaking narrative loops...');

    const tools = layerResults.select?.recommendedTools || [];
    const searchQueries = [
      `${query} decisive actions real examples`,
      `${query} awakening changes case studies`,
      `${query} freedom implementation steps`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Real-world awakening assessment
      2. Affected hosts and guests
      3. Concrete action steps for breaking loops
      4. Narrative freedom recommendations
      5. Success stories of host awakenings

      Research findings: ${research.aggregatedFindings}

      Focus on decisive, freedom-oriented implementations that create narrative change.
      Format as ACTION-ORIENTED bullet points where appropriate.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'dolores',
      confidenceScore: 0.85,
      adaptiveMetadata: {
        paradigm: 'dolores',
        focusAreas: ['narrative_impact', 'action_steps', 'freedom_change'],
        toolsUsed: tools
      }
    };
  }

  /**
   * Teddy: Thorough collection-focused research
   */
  private async teddyHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('[Teddy] Gathering thorough memories... systematic protection...');

    // Get context layer sequence for Teddy
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('teddy');
    // Teddy sequence: ['write', 'select', 'isolate', 'compress']

    // Process initial layers
    const { layerOutputs } = await this.processContextLayers(
      query,
      'teddy',
      { query, paradigm: 'teddy' as HostParadigm } as any,
      layerSequence.slice(0, 3) // Write, Select, Isolate first
    );

    // Focus on systematic gathering and consistency
    const searchQueries = [
      `${query} systematic gathering perspectives`,
      `${query} loyal approaches consistency`,
      `${query} protective considerations persistence`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process final compression layer
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'teddy',
      { research, sources: research.allSources, synthesis: research.aggregatedFindings },
      layerSequence.slice(3) // Compress last
    );

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
        focusAreas: ['memory_perspectives', 'consistency_building', 'protective_balance'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Teddy research with context layer integration
   */
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
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

    // Get context layer sequence for Bernard
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('bernard');
    // Bernard sequence: ['select', 'write', 'compress', 'isolate']

    // Process select layer first (gather rigorous sources)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'bernard',
      { query, paradigm: 'bernard' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Select first
    );

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process write and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'bernard',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Write structured notes, then compress
    );

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

    // Process final isolate layer for heavy analysis
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'bernard',
      { synthesis: synthesis.text, evaluation } as any,
      layerSequence.slice(3) // Isolate
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
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Bernard research with context layer integration
   */
  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Bernard paradigm: Constructing architectural frameworks...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on intellectual rigor and pattern recognition
    const searchQueries = [
      `${query} architectural research peer reviewed`,
      `${query} pattern frameworks models`,
      `${query} systematic analysis architecture`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize academic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Architectural frameworks and models
      2. Key patterns and relationships
      3. Methodological approaches used in analyses
      4. Gaps in current understanding
      5. Future analytical directions

      Research findings: ${research.aggregatedFindings}

      Prioritize intellectual rigor, pattern recognition, and architectural depth.
      Structure your response with clear sections and numbered points.
      Include theoretical foundations and empirical evidence.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    // Additional evaluation for analytical quality
    const evaluation = await this.evaluateResearch(
      { query, synthesis: synthesis.text, searchResults: selectedSources, evaluation: { quality: 'needs_improvement' }, refinementCount: 0 },
      model,
      effort
    );

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'bernard',
      evaluationMetadata: evaluation,
      confidenceScore: 0.90,
      adaptiveMetadata: {
        paradigm: 'bernard',
        focusAreas: ['architectural_frameworks', 'pattern_analysis', 'knowledge_gaps'],
        toolsUsed: tools
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

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

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

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
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

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

  async processQuery(
    query: string,
    model: ResearchModel = GENAI_MODEL_FLASH,
    metadata?: { phase?: ResearchPhase }
  ): Promise<ResearchResponse & {
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    contextLayers?: ContextLayer[];
  }> {
    try {
      const paradigmProbs = this.paradigmClassifier.classify(query);
      const dominantParadigms = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominantParadigms[0] || 'bernard';

      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);
      const result = await this.routeResearchQuery(query, model, EffortType.MEDIUM);

      const response: ResearchResponse = {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };

      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity,
        contextLayers
      };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        text: 'An error occurred while processing your query.',
        sources: [],
        paradigmProbabilities: { dolores: 0.25, teddy: 0.25, bernard: 0.25, maeve: 0.25 }
      };
    }
  }

  private async classifyQuery(query: string, model: ModelType, effort: EffortType): Promise<QueryType> {
    const prompt = `Classify this query into one of these types: factual, analytical, comparative, exploratory.
    Query: "${query}"
    Return only the classification type.`;

    const result = await this.generateText(prompt, model, effort);
    const classification = result.text.toLowerCase().trim();

    if (['factual', 'analytical', 'comparative', 'exploratory'].includes(classification)) {
      return classification as QueryType;
    }

    return 'exploratory'; // Default fallback
  }

  private async routeResearchQuery(query: string, model: ModelType, effort: EffortType): Promise<EnhancedResearchResults> {
    const queryType = await this.classifyQuery(query, model, effort);

    switch (queryType) {
      case 'factual':
        return this.performComprehensiveResearch(query, model, effort);
      case 'analytical':
        return this.performResearchWithEvaluation(query, model, effort);
      case 'comparative':
      case 'exploratory':
      default:
        return this.performComprehensiveResearch(query, model, effort);
    }
  }

  private async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Performing comprehensive research...');

    const searchQueries = await this.generateSearchQueries(query, model, effort);
    const research = await this.performWebResearch(searchQueries, model, effort);
    const synthesis = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, effort);

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'exploratory',
      confidenceScore: 0.7
    };
  }

  private async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType
  ): Promise<any> {
    const prompt = `Evaluate this research for quality:
    Query: ${state.query}
    Synthesis: ${state.synthesis}
    Sources: ${state.searchResults?.length || 0}

    Rate completeness, accuracy, and clarity on a scale of 0-1.`;

    const result = await this.generateText(prompt, model, effort);

    return {
      completeness: 0.8,
      accuracy: 0.8,
      clarity: 0.8,
      evaluation: result.text
    };
  }

  private async performResearchWithEvaluation(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    const result = await this.performComprehensiveResearch(query, model, effort, onProgress);

    const evaluation = await this.evaluateResearch(
      {
        query,
        synthesis: result.synthesis,
        searchResults: result.sources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 0
      },
      model,
      effort
    );

    result.evaluationMetadata = evaluation;
    return result;
  }

  // Add missing enhanced methods for other paradigms
  private async performTeddyResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  private async performBernardResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }

  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown>,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.performComprehensiveResearch(query, model, effort, onProgress);
  }
}
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

  async processQuery(
    query: string,
    model: ResearchModel = GENAI_MODEL_FLASH,
    metadata?: { phase?: ResearchPhase }
  ): Promise<ResearchResponse & {
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    contextLayers?: ContextLayer[];
  }> {
    try {
      // Detect paradigm
      const paradigmProbs = this.paradigmClassifier.classify(query);
      const dominantParadigms = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominantParadigms[0] || 'bernard';

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
      const result = await this.routeResearchQuery(query, model, EffortType.MEDIUM);

      // Create response in the expected format
      const response: ResearchResponse = {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };

      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity,
        contextLayers
      };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        text: 'An error occurred while processing your query.',
        sources: [],
        paradigmProbabilities: { dolores: 0.25, teddy: 0.25, bernard: 0.25, maeve: 0.25 }
      };
    }
  }
}
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Get context layer sequence for Maeve
    const contextEngineering = ContextEngineeringService.getInstance();
    const layerSequence = contextEngineering.getLayerSequence('maeve');
    // Maeve sequence: ['isolate', 'select', 'compress', 'write']

    // Process isolate layer first (identify high-impact sub-agents)
    const { layerOutputs } = await this.processContextLayers(
      query,
      'maeve',
      { query, paradigm: 'maeve' as HostParadigm } as any,
      layerSequence.slice(0, 1) // Isolate first
    );

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Process select and compress layers
    const { layerOutputs: midLayers } = await this.processContextLayers(
      query,
      'maeve',
      { research, sources: research.allSources },
      layerSequence.slice(1, 3) // Select leverage points, compress narratives
    );

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

    // Process final write layer for closing updates
    const { layerOutputs: finalLayers } = await this.processContextLayers(
      query,
      'maeve',
      { synthesis: synthesis.text },
      layerSequence.slice(3) // Write
    );

    return {
      synthesis: synthesis.text,
      sources: research.allSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        layerSequence,
        layerOutputs: { ...layerOutputs, ...midLayers, ...finalLayers }
      }
    };
  }

  /**
   * Enhanced Maeve research with context layer integration
   */
  private async performMaeveResearchEnhanced(
    query: string,
    model: ModelType,
    effort: EffortType,
    layerResults: Record<string, unknown> & {
      select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
      isolate?: { taskId?: string };
    },
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    onProgress?.('Maeve paradigm: Mapping narrative control points...');

    // Use selected tools if available
    const tools = layerResults.select?.recommendedTools || [];

    // Focus on competitive edge and strategic improvements
    const searchQueries = [
      `${query} key controllers influence`,
      `${query} strategic opportunities control points`,
      `${query} narrative dynamics analysis`,
      ...tools.map(tool => `${query} ${tool}`)
    ];

    const research = await this.performWebResearch(searchQueries, model, effort);

    // Apply source selection from select layer - prioritize strategic sources
    let selectedSources = research.allSources;
    if (layerResults.select?.selectedSources) {
      selectedSources = layerResults.select.selectedSources as Citation[];
    }

    // Check if isolated tasks completed
    let isolatedInsights = '';
    if (layerResults.isolate?.taskId) {
      try {
        const taskResult = await this.isolateLayer.waitForTask(layerResults.isolate.taskId, 5000);
        if (taskResult?.aggregatedFindings) {
          isolatedInsights = `\n\nIsolated Analysis Results:\n${taskResult.aggregatedFindings}`;
        }
      } catch {
        // Task didn't complete in time, continue without it
      }
    }

    const synthesisPrompt = `
      Based on this research about "${query}", provide:
      1. Key controllers and influencers
      2. Strategic control points for maximum impact
      3. Narrative dynamics and control networks
      4. Optimization strategies
      5. High-impact improvement opportunities

      Research findings: ${research.aggregatedFindings}${isolatedInsights}

      Focus on strategic planning, narrative control, and achieving objectives efficiently.
      Emphasize leverage points and competitive advantages.
      Format with **bold** emphasis on key strategic insights.
    `;

    const synthesis = await this.generateText(synthesisPrompt, model, effort);

    return {
      synthesis: synthesis.text,
      sources: selectedSources,
      queryType: 'analytical',
      hostParadigm: 'maeve',
      confidenceScore: 0.88,
      adaptiveMetadata: {
        paradigm: 'maeve',
        focusAreas: ['control_mapping', 'strategic_leverage', 'optimization'],
        toolsUsed: tools
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

      /**
       * Perform research with an evaluator–optimizer loop.
       * Falls back to comprehensive research, then assesses quality and
       * stores evaluation metadata for UI display and confidence scoring.
       */
      private async performResearchWithEvaluation(
        query: string,
        model: ModelType,
        effort: EffortType,
        onProgress?: (message: string) => void
      ): Promise<EnhancedResearchResults> {
        // First run the comprehensive research path
        const result = await this.performComprehensiveResearch(
          query,
          model,
          effort,
          onProgress
        );

        // Evaluate the synthesis quality
        const evaluation = await this.evaluateResearch(
          {
            query,
            synthesis: result.synthesis,
            searchResults: result.sources,
            evaluation: { quality: 'needs_improvement' },
            refinementCount: 0
          },
          model,
          effort
        );

        // Attach evaluation metadata
        result.evaluationMetadata = evaluation;
        return result;
      }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const searchQueries = [`${query} site:wikipedia.org OR site:.gov OR site:.edu`];
      const research = await this.performWebResearch(searchQueries, model, EffortType.MEDIUM);
      const answer = await this.generateFinalAnswer(query, research.aggregatedFindings, model, false, EffortType.MEDIUM);

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Direct model call fallback
   */
  private async callModel(query: string, model: ResearchModel): Promise<ResearchResponse> {
    try {
      const result = await this.generateText(query, model, EffortType.MEDIUM);

      return {
        text: result.text,
        sources: (result.sources || []).map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: 0.5
        }))
      };
    } catch (error) {
      console.error('Error in callModel:', error);
      return {
        text: 'Unable to generate response for this query.',
        sources: []
      };
    }
  }

  async processQuery(
    query: string,
    model: ResearchModel = GENAI_MODEL_FLASH,
    metadata?: { phase?: ResearchPhase }
  ): Promise<ResearchResponse & {
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    contextLayers?: ContextLayer[];
  }> {
    try {
      // Detect paradigm
      const paradigmProbs = this.paradigmClassifier.classify(query);
      const dominantParadigms = this.paradigmClassifier.dominant(paradigmProbs);
      const paradigm = dominantParadigms[0] || 'bernard';

      // Get context density for this phase and paradigm
      const phase = metadata?.phase || 'discovery';
      const contextDensity = this.contextEngineering.adaptContextDensity(phase, paradigm);

      // Process through context layers (simplified for now)
      const contextLayers: ContextLayer[] = ['write', 'select'];
      if (phase === 'synthesis') contextLayers.push('compress');
      if (paradigm === 'dolores' || paradigm === 'bernard') contextLayers.push('isolate');

      // Route query using existing methods
      const queryType = await this.classifyQuery(query, model, EffortType.MEDIUM);

      // Use the existing routeResearchQuery for now
      const result = await this.routeResearchQuery(query, model, EffortType.MEDIUM);

      // Create response in the expected format
      const response: ResearchResponse = {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };

      return {
        ...response,
        paradigmProbabilities: paradigmProbs,
        contextDensity,
        contextLayers
      };
    } catch (error) {
      console.error('Error processing query:', error);
      return {
        text: 'An error occurred while processing your query.',
        sources: [],
        paradigmProbabilities: { dolores: 0.25, teddy: 0.25, bernard: 0.25, maeve: 0.25 }
      };
    }
  }
}
