/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { APIError, ErrorBoundary } from '@/services/errorHandler';
import { AzureOpenAIService } from '@/services/azureOpenAIService';
import { AzureAIAgentService } from '@/services/azureAIAgentService';
import { geminiService } from '@/services/geminiService';
import { GrokService } from '@/services/grokService';
import { FunctionCallingService, FunctionCall } from '@/services/functionCallingService';
import { ResearchToolsService } from '@/services/researchToolsService';
import {
  EffortType,
  ModelType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL
} from '@/types';
import type { Citation } from '@/types';
import type { ProviderResponse } from '@/services/research/types';

const getGeminiApiKey = (): string => {
  const clientKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).__VITE_IMPORT_META_ENV__?.VITE_GEMINI_API_KEY);
  const serverKey =
    (typeof process !== 'undefined' &&
      (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY));
  const apiKey = clientKey || serverKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return apiKey;
};

const getGrokApiKey = (): string => {
  const viteApiKey = (typeof window !== 'undefined' &&
    (window as any).__VITE_IMPORT_META_ENV__?.VITE_XAI_API_KEY) ||
    (typeof process === 'undefined' &&
      (globalThis as any).import?.meta?.env?.VITE_XAI_API_KEY);
  const nodeApiKey = (typeof process !== 'undefined' && process.env?.XAI_API_KEY);
  const apiKey = viteApiKey || nodeApiKey;
  if (!apiKey) {
    throw new APIError('XAI_API_KEY environment variable is not set.', 'AUTH_ERROR', false, 401);
  }
  return apiKey;
};

export class ModelProviderService {
  private static instance: ModelProviderService | null = null;
  private geminiAI: GoogleGenerativeAI;
  private azureOpenAI: AzureOpenAIService | null = null;
  private azureAIAgent: AzureAIAgentService | null = null;
  private functionCallingService: FunctionCallingService;
  private researchToolsService: ResearchToolsService;
  private fallbackAttempts: Map<string, number> = new Map();
  private readonly MAX_FALLBACK_ATTEMPTS = 2;

  constructor(
    functionCallingService: FunctionCallingService,
    researchToolsService: ResearchToolsService
  ) {
    this.geminiAI = new GoogleGenerativeAI(getGeminiApiKey());
    if (AzureOpenAIService.isAvailable()) {
      try {
        this.azureOpenAI = AzureOpenAIService.getInstance();
      } catch (error) {
        console.warn('Azure OpenAI initialization failed:', error);
      }
    }
    if (AzureAIAgentService.isAvailable()) {
      try {
        this.azureAIAgent = AzureAIAgentService.getInstance();
        console.log('Azure AI Agent Service with Bing Search grounding initialized');
      } catch (error) {
        console.warn('Azure AI Agent Service initialization failed:', error);
      }
    }
    this.functionCallingService = functionCallingService;
    this.researchToolsService = researchToolsService;
  }

  static getInstance(): ModelProviderService {
    if (!ModelProviderService.instance) {
      ModelProviderService.instance = new ModelProviderService(
        FunctionCallingService.getInstance(),
        ResearchToolsService.getInstance()
      );
    }
    return ModelProviderService.instance;
  }

  /**
   * Generate text with appropriate model based on selection
   */
  async generateText(
    prompt: string, 
    model: ModelType, 
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<{ text: string; sources?: Citation[] }> {
    if (ErrorBoundary.shouldBlock()) {
      throw new APIError('Too many errors occurred. Please try again later.', 'RATE_LIMIT', false);
    }

    try {
      const startTime = Date.now();
      onProgress?.(`tool_used:${model}_api_call`);
      
      switch (model) {
        case GENAI_MODEL_FLASH:
          onProgress?.('tool_used:gemini_api');
          const geminiResult = await geminiService.generateContent(prompt, {
            model: GENAI_MODEL_FLASH,
            useSearch: true
          });
          onProgress?.(`tool_used:completed:gemini_api:${startTime}`);
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
          onProgress?.('tool_used:grok_api');
          const grokService = GrokService.getInstance();
          const grokResult = await grokService.generateResponseWithLiveSearch(prompt, effort);
          onProgress?.(`tool_used:completed:grok_api:${startTime}`);
          return {
            text: grokResult.text,
            sources: grokResult.sources || []
          };

        case AZURE_O3_MODEL:
          // Prioritize Azure AI Agent Service with Bing Search if available
          if (this.azureAIAgent) {
            onProgress?.('tool_used:azure_ai_agent');
            console.log('Using Azure AI Agent Service with Bing Search grounding and enhancement pipeline');
            try {
              const agentResult = await this.azureAIAgent.generateText(prompt, model, effort);
              onProgress?.(`tool_used:completed:azure_ai_agent:${startTime}`);
              console.log(`Azure AI Agent returned ${agentResult.sources?.length || 0} sources with quality enhancement`);
              return {
                text: agentResult.text,
                sources: agentResult.sources || []
              };
            } catch (error) {
              console.warn('Azure AI Agent Service failed, falling back to Azure OpenAI:', error);
              // Fall through to Azure OpenAI
            }
          }
          
          // Fallback to Azure OpenAI with agentic tools for research capabilities
          onProgress?.('tool_used:azure_openai');
          if (!AzureOpenAIService.isAvailable()) {
            console.warn('Azure OpenAI not available, falling back to Gemini');
            return this.generateText(prompt, GENAI_MODEL_FLASH, effort, onProgress);
          }
          const azureService = AzureOpenAIService.getInstance();
          
          // Get available research tools for agentic workflow
          const researchTools = azureService.getAvailableResearchTools();
          
          if (researchTools && researchTools.length > 0) {
            // Use agentic workflow with tools for enhanced research capabilities
            console.log(`Using Azure O3 with ${researchTools.length} research tools for agentic workflow`);
            const azureResult = await azureService.generateResponseWithTools(
              prompt,
              researchTools,
              effort,
              undefined, // paradigm (optional)
              undefined, // paradigmProbabilities (optional)
              5 // maxIterations
            );
            onProgress?.(`tool_used:completed:azure_openai_with_tools:${startTime}`);
            if (!azureResult || !azureResult.text) {
              throw new Error('Azure OpenAI service returned invalid response');
            }
            return {
              text: azureResult.text,
              sources: azureResult.sources || []
            };
          } else {
            // Fallback to basic response without tools
            console.log('No research tools available, using basic Azure O3 response');
            const azureResult = await azureService.generateResponse(prompt, effort);
            onProgress?.(`tool_used:completed:azure_openai:${startTime}`);
            if (!azureResult || !azureResult.text) {
              throw new Error('Azure OpenAI service returned invalid response');
            }
            return {
              text: azureResult.text,
              sources: azureResult.sources || []
            };
          }

        default:
          throw new APIError(`Unsupported model: ${model}`, 'INVALID_MODEL', false);
      }
    } catch (error) {
      ErrorBoundary.recordError();
      if (error instanceof APIError && error.isRetryable) {
        return this.attemptFallback(prompt, model, effort, new Set(), error);
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

    const fallbackKey = `${prompt.substring(0, 50)}_${Date.now()}`;
    const attempts = this.fallbackAttempts.get(fallbackKey) || 0;

    if (attempts >= this.MAX_FALLBACK_ATTEMPTS) {
      this.fallbackAttempts.delete(fallbackKey);
      throw new APIError('Maximum fallback attempts reached.', 'MAX_FALLBACKS_EXCEEDED', false);
    }

    this.fallbackAttempts.set(fallbackKey, attempts + 1);
    attemptedModels.add(originalModel);

    const fallbackChain: ModelType[] = this.buildFallbackChain(originalModel, attemptedModels);

    if (fallbackChain.length === 0) {
      this.fallbackAttempts.delete(fallbackKey);
      throw new APIError('No available fallback models.', 'NO_AVAILABLE_MODELS', false);
    }

    for (const fallbackModel of fallbackChain) {
      try {
        console.log(`Trying fallback model: ${fallbackModel}`);
        if (!this.isModelAvailable(fallbackModel)) {
          console.warn(`${fallbackModel} is not available (missing API key)`);
          attemptedModels.add(fallbackModel);
          continue;
        }
        const result = await this.generateTextDirect(prompt, fallbackModel, effort);
        this.fallbackAttempts.delete(fallbackKey);
        return result;
      } catch (fallbackError) {
        console.warn(`Fallback to ${fallbackModel} failed:`, fallbackError);
        attemptedModels.add(fallbackModel);
        if (fallbackError instanceof APIError && fallbackError.statusCode === 429) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        continue;
      }
    }

    this.fallbackAttempts.delete(fallbackKey);
    throw new APIError(`All models failed. Original error: ${error?.message || 'Unknown error'}`, 'ALL_MODELS_FAILED', false);
  }

  private buildFallbackChain(originalModel: ModelType, attemptedModels: Set<ModelType>): ModelType[] {
    const allModels: ModelType[] = [GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL];
    const availableModels = allModels.filter(model => model !== originalModel && !attemptedModels.has(model));

    if (originalModel === AZURE_O3_MODEL) {
      return ([GENAI_MODEL_FLASH, GROK_MODEL_4] as ModelType[]).filter(m => availableModels.includes(m));
    } else if (originalModel === GROK_MODEL_4) {
      return ([GENAI_MODEL_FLASH, AZURE_O3_MODEL] as ModelType[]).filter(m => availableModels.includes(m));
    } else {
      return ([GROK_MODEL_4, AZURE_O3_MODEL] as ModelType[]).filter(m => availableModels.includes(m));
    }
  }

  private isModelAvailable(model: ModelType): boolean {
    switch (model) {
      case GENAI_MODEL_FLASH:
        try { return !!getGeminiApiKey(); } catch { return false; }
      case GROK_MODEL_4:
        try { return !!getGrokApiKey(); } catch { return false; }
      case AZURE_O3_MODEL:
        // Prefer Azure AI Agent Service with Bing Search, fallback to Azure OpenAI
        return AzureAIAgentService.isAvailable() || AzureOpenAIService.isAvailable();
      default:
        return false;
    }
  }

  /**
   * Direct generation method to avoid recursion
   */
  private async generateTextDirect(prompt: string, model: ModelType, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    switch (model) {
      case GENAI_MODEL_FLASH:
        return this.generateTextWithGemini(prompt, model, effort, true);
      case GROK_MODEL_4:
        const grokService = GrokService.getInstance();
        const grokResult = await grokService.generateResponseWithLiveSearch(prompt, effort);
        return { text: grokResult.text, sources: grokResult.sources || [] };
      case AZURE_O3_MODEL:
        // Try Azure AI Agent Service with enhancement first
        if (this.azureAIAgent) {
          try {
            const agentResult = await this.azureAIAgent.generateText(prompt, model, effort);
            return { text: agentResult.text, sources: agentResult.sources || [] };
          } catch (error) {
            console.warn('Azure AI Agent Service direct generation failed:', error);
          }
        }
        return this.generateTextWithAzureOpenAI(prompt, effort, false);
      default:
        throw new APIError(`Unsupported model: ${model}`, 'INVALID_MODEL', false);
    }
  }

  /**
   * Generate text using Azure OpenAI service with agentic tools support
   */
  private async generateTextWithAzureOpenAI(prompt: string, effort: EffortType, _useSearch: boolean): Promise<ProviderResponse> {
    void _useSearch;
    if (!this.azureOpenAI) {
      throw new APIError("Azure OpenAI service not initialized", "SERVICE_ERROR", false);
    }
    try {
      // Get available research tools for agentic workflow
      const researchTools = this.azureOpenAI.getAvailableResearchTools();
      
      if (researchTools && researchTools.length > 0) {
        // Use agentic workflow with tools for enhanced research capabilities
        console.log(`Using Azure O3 with ${researchTools.length} research tools for agentic workflow`);
        const response = await this.azureOpenAI.generateResponseWithTools(
          prompt,
          researchTools,
          effort,
          undefined, // paradigm (optional)
          undefined, // paradigmProbabilities (optional)
          5 // maxIterations
        );
        return { 
          text: response.text, 
          sources: response.sources || [] 
        };
      } else {
        // Fallback to basic response without tools
        console.log('No research tools available, using basic Azure O3 response');
        const response = await this.azureOpenAI.generateText(prompt, effort);
        return { text: response.text, sources: [] };
      }
    } catch (error) {
      throw new APIError(`Azure OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "API_ERROR", true);
    }
  }

  /**
   * Enhanced generateTextWithGemini with research tools support
   */
  public async generateTextWithGemini(prompt: string, selectedModel: ModelType, effort: EffortType, useSearch: boolean, useFunctions: boolean = false, useResearchTools: boolean = false): Promise<ProviderResponse> {
    try {
      const model = this.geminiAI.getGenerativeModel({ model: selectedModel });
      const generationConfig: any = {};

      if (selectedModel === GENAI_MODEL_FLASH) {
        switch (effort) {
          case EffortType.LOW: generationConfig.thinkingConfig = { thinkingBudget: 0 }; break;
          case EffortType.MEDIUM: generationConfig.thinkingConfig = { thinkingBudget: 8192 }; break;
          case EffortType.HIGH: generationConfig.thinkingConfig = { thinkingBudget: 16384 }; break;
          default: generationConfig.thinkingConfig = { thinkingBudget: -1 };
        }
      } else if (selectedModel.includes('pro')) {
        switch (effort) {
          case EffortType.LOW: generationConfig.thinkingConfig = { thinkingBudget: 1024 }; break;
          case EffortType.MEDIUM: generationConfig.thinkingConfig = { thinkingBudget: 16384 }; break;
          case EffortType.HIGH: generationConfig.thinkingConfig = { thinkingBudget: 32768 }; break;
          default: generationConfig.thinkingConfig = { thinkingBudget: -1 };
        }
      }

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

      const requestBody: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      };
      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      const response: any = await model.generateContent(requestBody);

      if (response.response.candidates?.[0]?.content?.parts) {
        const parts = response.response.candidates[0].content.parts;
        const functionCalls: FunctionCall[] = parts
          .filter((part: any) => part.functionCall)
          .map((part: any) => ({
            name: part.functionCall.name,
            arguments: part.functionCall.args || {}
          }));

        if (functionCalls.length > 0 && (useFunctions || useResearchTools)) {
          const results = await Promise.all(
            functionCalls.map(async (fc) => {
              if (useResearchTools) {
                try {
                  const result = await this.researchToolsService.executeTool(fc);
                  return { result, error: null };
                } catch { /* Not a research tool, try regular functions */ }
              }
              return this.functionCallingService.executeFunction(fc);
            })
          );
          const followUpPrompt = `Original request: ${prompt}\n\nTool/Function results:\n${results.map((r, i) => `${functionCalls[i].name}: ${JSON.stringify(r.result)}`).join('\n')}\n\nBased on these results, provide a comprehensive response.`;
          return this.generateTextWithGemini(followUpPrompt, selectedModel, effort, useSearch, false, false);
        }
      }

      let text = '';
      if (response.response && typeof response.response.text === 'function') {
        text = response.response.text();
      } else if (response.response?.candidates?.[0]?.content?.parts) {
        text = response.response.candidates[0].content.parts
          .filter((p: any) => p.text && typeof p.text === 'string')
          .map((p: any) => p.text).join('\n').trim();
      } else if (response.response?.text) {
        text = response.response.text;
      }

      if (!text || text.trim() === '') {
        throw new APIError("Empty response from Gemini API - no text content found", "EMPTY_RESPONSE", true);
      }

      let sources: Citation[] = [];
      if (useSearch && response.response?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.response.candidates[0].groundingMetadata.groundingChunks
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
      if (error instanceof APIError) throw error;
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new APIError("API rate limit exceeded.", "RATE_LIMIT", true, 429);
      }
      if (error instanceof Error && error.message.includes('API key')) {
        throw new APIError("Invalid API key.", "AUTH_ERROR", false, 401);
      }
      throw new APIError(`Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "API_ERROR", true);
    }
  }

  /**
   * Function-calling capable Grok loop.
   */
  public async generateTextWithGrokAndTools(prompt: string): Promise<ProviderResponse> {
    const apiKey = getGrokApiKey();
    type Message = { role: 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string; };
    const tools = [{
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Run a web search and return a concise markdown summary plus a list of sources',
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query terms' } }, required: ['query'] },
      },
    }];
    const messages: Message[] = [{ role: 'user', content: prompt }];

    const callGrok = async (msgs: Message[]) => {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROK_MODEL_4, messages: msgs, tools }),
      });
      if (!response.ok) throw new Error(`Grok API error: ${response.status} ${await response.text()}`);
      return (await response.json()) as any;
    };

    const executeTool = async (name: string, args: any): Promise<any> => {
      if (name === 'search_web') {
        if (typeof args?.query !== 'string') throw new Error('search_web requires a query string');
        const { text, sources } = await this.generateTextWithGemini(`Perform a web search and provide a concise summary of findings for: "${args.query}"`, GENAI_MODEL_FLASH, EffortType.MEDIUM, true);
        return { summary_markdown: text, sources };
      }
      throw new Error(`Unknown tool: ${name}`);
    };

    const MAX_LOOPS = 4;
    for (let i = 0; i < MAX_LOOPS; i++) {
      const data = await callGrok(messages);
      const choice = data.choices?.[0];
      if (!choice) throw new Error('Grok returned no choices');
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message as any);
        for (const call of message.tool_calls) {
          const { id, function: fn } = call;
          const args = JSON.parse(fn.arguments || '{}');
          const result = await executeTool(fn.name, args);
          messages.push({ role: 'tool', name: fn.name, content: JSON.stringify(result), tool_call_id: id });
        }
        continue;
      }

      const citations: Citation[] = [];
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

  /**
   * Get available models
   */
  getAvailableModels(): ModelType[] {
    const models: ModelType[] = [];

    // Always include Gemini as fallback
    models.push(GENAI_MODEL_FLASH);

    // Check Grok availability
    try {
      getGrokApiKey();
      models.push(GROK_MODEL_4);
    } catch {}

    // Check Azure OpenAI availability (including AI Agent Service)
    if (this.azureAIAgent || this.azureOpenAI) {
      models.push(AZURE_O3_MODEL);
    }

    return models;
  }
}
