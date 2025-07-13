
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType, EffortType, GENAI_MODEL_FLASH, GROK_MODEL_4 } from "../types";
import { APIError, withRetry, ErrorBoundary } from "./errorHandler";

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

// Fallback to the provided key if the env var is not set. This is NOT recommended for production.
const GROK_FALLBACK_KEY = 'xai-aNBkbA7BpoY5z1GKASMjMG1mwccTwRRltSN8eYJ90yabtau7EF8JJ6JCcwUGN9djPuUdihor4Vv5xhfW';

const getGrokApiKey = (): string => {
  const apiKeyFromEnv = (typeof process !== 'undefined' && process.env?.GROK_API_KEY) ? process.env.GROK_API_KEY : null;
  return apiKeyFromEnv || GROK_FALLBACK_KEY;
};


export class ResearchAgentService {
  private static instance: ResearchAgentService;
  private geminiAI: GoogleGenAI;

  private constructor() {
    // Currently only Gemini needs an SDK client. Grok is called via fetch.
    this.geminiAI = new GoogleGenAI({ apiKey: getGeminiApiKey() });
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
      if (selectedModel === GROK_MODEL_4) {
        return this.generateTextWithGrok(prompt);
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
    const prompt = `Based on the user query: "${userQuery}", generate a short list of 2-3 concise search queries or key topics that would help in researching an answer. Return them as a comma-separated list. For example: query1, query2, query3`;
    const result = await this.generateText(prompt, model, effort);
    return result.text.split(',').map(q => q.trim()).filter(q => q.length > 0);
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
}
