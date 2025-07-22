import { EffortType, Citation } from '@/types';
import { getEnv } from '@/utils/getEnv';
import { RateLimiter, estimateTokens } from './rateLimiter';

export interface GrokResponse {
  text: string;
  sources?: Citation[];
  citations?: Citation[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
}

export class GrokService {
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1';
  private static instance: GrokService;
  private rateLimiter = RateLimiter.getInstance();

  private constructor() {
    // Resolve API key via unified helper
    const apiKey = getEnv('VITE_XAI_API_KEY', 'XAI_API_KEY');

    if (!apiKey) {
      throw new Error('XAI API key is required. Set VITE_XAI_API_KEY or XAI_API_KEY');
    }
    this.apiKey = apiKey;
  }

  /**
   * Quick availability probe – mirrors the pattern used by other providers
   * (e.g. AzureOpenAIService.isAvailable).  Having this helper makes it easy
   * for callers to check whether the Grok provider can be used without
   * instantiating the service (and therefore without throwing when the API
   * key is missing).
   */
  public static isAvailable(): boolean {
    try {
      const apiKey = getEnv('VITE_XAI_API_KEY', 'XAI_API_KEY');
      return !!apiKey;
    } catch {
      return false;
    }
  }

  public static getInstance(): GrokService {
    if (!GrokService.instance) {
      GrokService.instance = new GrokService();
    }
    return GrokService.instance;
  }

  /**
   * Basic chat completion with Grok-4
   */
  async generateResponse(
    prompt: string,
    _effort: EffortType = EffortType.MEDIUM,
    useSearch = false,
    searchSources?: string[]
  ): Promise<GrokResponse> {
    try {
      const requestBody: any = {
        model: "grok-4",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      };

      // Only add reasoning_effort for supported models
      // grok-4 doesn't support reasoning_effort
      // [if (supported) { requestBody.reasoning_effort = this.getReasoningEffort(effort); }]

      // Live-search parameters follow the latest xAI spec.  Only include the
      // block if search is explicitly requested – otherwise the request will
      // defer to the model's default behaviour (which is equivalent to
      // `mode: "off"`).
      if (useSearch) {
        const searchParams: Record<string, any> = {
          // Use "auto" so the model can decide whether to query external
          // sources.  Callers wanting deterministic behaviour can switch this
          // via the `useSearch` / `searchSources` flags in the future.
          mode: 'auto'
        };

        // The latest public docs (https://docs.x.ai/docs/guides/live-search)
        // state that `sources` is an *array of strings* (e.g. ["web", "x"]).
        if (searchSources && searchSources.length > 0) {
          searchParams.sources = searchSources.map(src => src.toLowerCase());
        }

        requestBody.search_parameters = searchParams;
      }

      // Apply rate limiting for Grok API call
      const estimatedTokens = estimateTokens(prompt) + 1000; // Add overhead for completion
      await this.rateLimiter.waitForCapacity(estimatedTokens);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        text: content,
        sources: this.processCitations(data.citations),
        citations: this.processCitations(data.citations)
      };
    } catch (error) {
      console.error('Grok API error:', error);
      throw new Error(`Grok API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate response with function calling capabilities
   */
  async generateResponseWithTools(
    prompt: string,
    tools: ToolDefinition[],
    toolImplementations: Record<string, (...args: any[]) => any>,
    _effort: EffortType = EffortType.MEDIUM
  ): Promise<GrokResponse> {
    try {
      const messages = [{ role: "user", content: prompt }];

      let requestBody: any = {
        model: "grok-4",
        messages: messages,
        tools: tools.map(t => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        })),
        tool_choice: "auto"
      };

      // Only add reasoning_effort for supported models
      // grok-4 doesn't support reasoning_effort
      // [if (supported) { requestBody.reasoning_effort = this.getReasoningEffort(effort); }]

      // Apply rate limiting for initial tool call
      const estimatedTokens = estimateTokens(prompt) + 1000;
      await this.rateLimiter.waitForCapacity(estimatedTokens);

      let response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();
      const assistantMessage = data.choices?.[0]?.message;

      if (assistantMessage) {
        messages.push(assistantMessage);
      }

      // Handle tool calls
      if (assistantMessage?.tool_calls) {
        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          // The API may return arguments as a JSON string or already-parsed
          // object depending on the request format.  Normalise to an object
          // here so we can pass it straight to the implementation.
          let functionArgs: Record<string, any> = {};
          try {
            functionArgs = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments || {};
          } catch (err) {
            console.warn('Failed to parse tool arguments – passing raw value', err);
            functionArgs = toolCall.function.arguments || {};
          }

          if (toolImplementations[functionName]) {
            // Prefer an object-based invocation so implementations can use
            // named parameters.  Fall back to spreading positional values for
            // legacy handlers.
            const impl = toolImplementations[functionName];
            let result;
            try {
              result = await impl(functionArgs);
            } catch {
              result = await impl(...Object.values(functionArgs));
            }
            messages.push({
              role: "tool",
              content: JSON.stringify(result),
              tool_call_id: toolCall.id
            } as any);
          }
        }

        // Get final response after tool execution
        requestBody = {
          model: "grok-4",
          messages: messages
        };

        // Only add reasoning_effort for supported models
        // grok-4 doesn't support reasoning_effort
        // [if (supported) { requestBody.reasoning_effort = this.getReasoningEffort(effort); }]

        // Apply rate limiting for follow-up response
        await this.rateLimiter.waitForCapacity(500); // Smaller estimate for follow-up

        response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      }

      const content = data.choices?.[0]?.message?.content || '';

      return {
        text: content,
        sources: this.processCitations(data.citations),
        citations: this.processCitations(data.citations)
      };
    } catch (error) {
      console.error('Grok function calling error:', error);
      throw new Error(`Grok function calling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate response with live search
   */
  async generateResponseWithLiveSearch(
    prompt: string,
    _effort: EffortType = EffortType.MEDIUM,
    dateRange?: { from?: Date; to?: Date },
    allowedWebsites?: string[],
    excludedWebsites?: string[],
    searchMode: 'auto' | 'on' | 'off' = 'auto'
  ): Promise<GrokResponse> {
    try {
      // Compose the `search_parameters` object in line with the public spec.
      const searchParams: Record<string, any> = {
        mode: searchMode
      };

      if (dateRange?.from) {
        searchParams.from_date = dateRange.from.toISOString().split('T')[0];
      }
      if (dateRange?.to) {
        searchParams.to_date = dateRange.to.toISOString().split('T')[0];
      }

      // Custom website allow/deny lists are currently not part of the public
      // xAI spec, but we leave the logic in place behind a feature-test so
      // that callers relying on it continue to work against internal /
      // future builds where the capability exists.  If neither list is
      // provided we fall back to a generic "web" source.
      if (allowedWebsites || excludedWebsites) {
        searchParams.sources = ['web'];

        if (allowedWebsites && allowedWebsites.length > 0) {
          (searchParams as any).allowed_websites = allowedWebsites.slice(0, 5);
        }
        if (excludedWebsites && excludedWebsites.length > 0) {
          (searchParams as any).excluded_websites = excludedWebsites.slice(0, 5);
        }
      }

      const requestBody: any = {
        model: "grok-4",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        search_parameters: searchParams
      };

        // Only add reasoning_effort for supported models
        // grok-4 doesn't support reasoning_effort
        // [if (supported) { requestBody.reasoning_effort = this.getReasoningEffort(effort); }]

      // Apply rate limiting for search request
      const estimatedTokens = estimateTokens(prompt) + 1000;
      await this.rateLimiter.waitForCapacity(estimatedTokens);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        text: content,
        sources: this.processCitations(data.citations),
        citations: this.processCitations(data.citations)
      };
    } catch (error) {
      console.error('Grok live search error:', error);
      throw new Error(`Grok live search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  private getReasoningEffort(_effort: EffortType): string {
    switch (_effort) {
      case EffortType.LOW: return 'low';
      case EffortType.MEDIUM: return 'medium';
      case EffortType.HIGH: return 'high';
      default: return 'medium';
    }
  }


  private processCitations(_citations: any): Citation[] {
    if (!_citations || !Array.isArray(_citations)) {
      return [];
    }

    const fullCitations: Citation[] = [];
    _citations.forEach((citation: any) => {
      if (typeof citation === 'string') {
        // Handle legacy string citations
        fullCitations.push({ url: citation });
      } else if (citation && typeof citation === 'object') {
        // Handle rich citation objects from X-AI API
        const richCitation: Citation = {
          url: citation.url || citation.link || '',
          title: citation.title,
          authors: citation.authors,
          published: citation.published,
          accessed: citation.accessed || new Date().toISOString()
        };
        if (richCitation.url) {
          fullCitations.push(richCitation);
        }
      }
    });

    return fullCitations;
  }
}
