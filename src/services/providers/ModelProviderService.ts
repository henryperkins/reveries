/**
 * Model Provider Service
 * Handles all AI model interactions (Gemini, Grok, Azure OpenAI)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelType, EffortType, Citation, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from '../../types';
import { AzureOpenAIService } from '../azureOpenAIService';
import { APIError, withRetry } from '../errorHandler';
import { FunctionCallingService, FunctionCall } from '../functionCallingService';

// Environment variable getters
const getGeminiApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new APIError(
      "Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env.local file."
    );
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
    throw new APIError(
      'XAI_API_KEY environment variable is not set. Please configure it in .env.local file.',
      'AUTH_ERROR',
      false,
      401
    );
  }
  return apiKey;
};

export class ModelProviderService {
  private static instance: ModelProviderService;
  private geminiAI: GoogleGenerativeAI;
  private azureOpenAI: AzureOpenAIService | null = null;
  private functionCallingService: FunctionCallingService;

  private constructor() {
    this.geminiAI = new GoogleGenerativeAI(getGeminiApiKey());
    this.functionCallingService = FunctionCallingService.getInstance();

    // Initialize Azure OpenAI if available
    if (AzureOpenAIService.isAvailable()) {
      try {
        this.azureOpenAI = AzureOpenAIService.getInstance();
      } catch (error) {
        console.warn('Azure OpenAI initialization failed:', error);
      }
    }
  }

  public static getInstance(): ModelProviderService {
    if (!ModelProviderService.instance) {
      ModelProviderService.instance = new ModelProviderService();
    }
    return ModelProviderService.instance;
  }

  /**
   * Generate text using the specified model
   */
  async generateText(
    prompt: string,
    model: ModelType,
    effort: EffortType,
    useSearch: boolean = false
  ): Promise<{ text: string; sources: Citation[] }> {
    switch (model) {
      case GENAI_MODEL_FLASH:
        return this.generateTextWithGemini(prompt, model, effort, useSearch);
      case GROK_MODEL_4:
        return this.generateTextWithGrok(prompt, model, effort, useSearch);
      case AZURE_O3_MODEL:
        return this.generateTextWithAzureOpenAI(prompt, model, effort);
      default:
        throw new APIError(`Unsupported model: ${model}`);
    }
  }

  /**
   * Generate text using Gemini
   */
  private async generateTextWithGemini(
    prompt: string,
    model: ModelType,
    effort: EffortType,
    useSearch: boolean = false
  ): Promise<{ text: string; sources: Citation[] }> {
    try {
      const geminiModel = this.geminiAI.getGenerativeModel({
        model,
        generationConfig: {
          temperature: effort === EffortType.LOW ? 0.3 : effort === EffortType.HIGH ? 0.9 : 0.7,
          maxOutputTokens: effort === EffortType.HIGH ? 8192 : 4096,
        },
        tools: useSearch ? [{
          googleSearch: {}
        }] : undefined
      });

      const result = await withRetry(
        async () => geminiModel.generateContent(prompt),
        3,
        1000
      );

      const response = result.response;
      const text = response.text();
      const sources: Citation[] = [];

      // Extract grounding metadata if available
      if ((response as any).groundingMetadata?.groundingChunks) {
        const chunks = (response as any).groundingMetadata.groundingChunks;
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            sources.push({
              url: chunk.web.uri,
              title: chunk.web.title || 'Web Source',
              snippet: chunk.web.snippet || '',
              relevanceScore: chunk.relevanceScore || 0.5
            });
          }
        }
      }

      return { text, sources };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new APIError(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        true,
        500
      );
    }
  }

  /**
   * Generate text using Grok
   */
  private async generateTextWithGrok(
    prompt: string,
    model: ModelType,
    effort: EffortType,
    useSearch: boolean = false
  ): Promise<{ text: string; sources: Citation[] }> {
    const temperature = effort === EffortType.LOW ? 0.3 : effort === EffortType.HIGH ? 0.9 : 0.7;
    const max_tokens = effort === EffortType.HIGH ? 8192 : 4096;

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful research assistant. Provide comprehensive, well-structured answers.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestBody: any = {
      messages,
      model,
      temperature,
      max_completion_tokens: max_tokens,
      stream: false
    };

    // Add search tools if requested
    if (useSearch) {
      requestBody.tools = [{
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for relevant information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            },
            required: ['query']
          }
        }
      }];
      requestBody.tool_choice = 'auto';
    }

    try {
      const response = await withRetry(
        async () => fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getGrokApiKey()}`
          },
          body: JSON.stringify(requestBody)
        }),
        3,
        1000
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(
          `Grok API error: ${response.status} - ${errorText}`,
          'API_ERROR',
          true,
          response.status
        );
      }

      const data = await response.json();
      
      // Handle tool calls if present
      if (data.choices[0]?.message?.tool_calls) {
        return this.handleGrokToolCalls(data, messages, model, temperature, max_tokens);
      }

      const text = data.choices[0]?.message?.content || '';
      const sources: Citation[] = [];

      // Extract citations if available
      if (data.choices[0]?.message?.metadata?.citations) {
        data.choices[0].message.metadata.citations.forEach((citation: any) => {
          sources.push({
            url: citation.url || citation.link || '',
            title: citation.title || 'Unknown Source',
            authors: citation.authors,
            published: citation.published,
            accessed: citation.accessed || new Date().toISOString()
          });
        });
      }

      return { text, sources };
    } catch (error) {
      console.error('Grok API error:', error);
      throw new APIError(
        `Grok API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        true,
        500
      );
    }
  }

  /**
   * Handle Grok tool calls
   */
  private async handleGrokToolCalls(
    initialResponse: any,
    messages: any[],
    model: ModelType,
    temperature: number,
    max_tokens: number
  ): Promise<{ text: string; sources: Citation[] }> {
    const executeTool = async (name: string, args: any): Promise<any> => {
      switch (name) {
        case 'web_search':
          // Simulate web search results
          return {
            results: [
              {
                title: 'Search Result',
                snippet: `Information about ${args.query}`,
                url: `https://example.com/search?q=${encodeURIComponent(args.query)}`
              }
            ]
          };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    };

    // Continue conversation with tool results
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const choice = initialResponse.choices[0];
      if (!choice) throw new Error('Grok returned no choices');

      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
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

        // Continue conversation
        const continueResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getGrokApiKey()}`
          },
          body: JSON.stringify({
            messages,
            model,
            temperature,
            max_completion_tokens: max_tokens,
            stream: false,
            tools: [{
              type: 'function',
              function: {
                name: 'web_search',
                description: 'Search the web for relevant information',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'The search query'
                    }
                  },
                  required: ['query']
                }
              }
            }],
            tool_choice: 'auto'
          })
        });

        if (!continueResponse.ok) {
          throw new Error(`Grok API error: ${continueResponse.status}`);
        }

        initialResponse = await continueResponse.json();
        continue;
      }

      // Normal response
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
   * Generate text using Azure OpenAI
   */
  private async generateTextWithAzureOpenAI(
    prompt: string,
    model: ModelType,
    effort: EffortType
  ): Promise<{ text: string; sources: Citation[] }> {
    if (!this.azureOpenAI) {
      throw new APIError('Azure OpenAI is not configured', 'CONFIG_ERROR', false, 500);
    }

    try {
      const temperature = effort === EffortType.LOW ? 0.3 : effort === EffortType.HIGH ? 0.9 : 0.7;
      const maxTokens = effort === EffortType.HIGH ? 8192 : 4096;

      const result = await this.azureOpenAI.generateResponse(
        prompt,
        effort,
        true,
        temperature,
        maxTokens
      );

      return {
        text: result.text || '',
        sources: result.sources || []
      };
    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      throw new APIError(
        `Azure OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        true,
        500
      );
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelType[] {
    const models: ModelType[] = [];

    // Gemini is always available if API key is set
    try {
      getGeminiApiKey();
      models.push(GENAI_MODEL_FLASH);
    } catch {}

    // Check Grok availability
    try {
      getGrokApiKey();
      models.push(GROK_MODEL_4);
    } catch {}

    // Check Azure OpenAI availability
    if (this.azureOpenAI) {
      models.push(AZURE_O3_MODEL);
    }

    return models;
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(model: ModelType): boolean {
    return this.getAvailableModels().includes(model);
  }
}
