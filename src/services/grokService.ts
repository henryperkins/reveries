import { EffortType, Citation } from '@/types';
import { getEnv } from '@/utils/getEnv';

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
  private baseUrl: string = 'https://api.x.ai/v1';
  private static instance: GrokService;

  private constructor() {
    // Resolve API key via unified helper
    const apiKey = getEnv('VITE_XAI_API_KEY', 'XAI_API_KEY');

    if (!apiKey) {
      throw new Error('XAI API key is required. Set VITE_XAI_API_KEY or XAI_API_KEY');
    }
    this.apiKey = apiKey;
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
    effort: EffortType = EffortType.MEDIUM,
    useSearch: boolean = false,
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
      if (false) { // grok-4 doesn't support reasoning_effort
        requestBody.reasoning_effort = this.getReasoningEffort(effort);
      }

      if (useSearch) {
        requestBody.search_parameters = {
          mode: "auto",
          return_citations: true,
          max_search_results: this.getSearchResultsCount(effort),
          sources: searchSources ? this.buildSearchSources(searchSources) : undefined
        };
      }

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
    effort: EffortType = EffortType.MEDIUM
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
      if (false) { // grok-4 doesn't support reasoning_effort
        requestBody.reasoning_effort = this.getReasoningEffort(effort);
      }

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
          const functionArgs = JSON.parse(toolCall.function.arguments);

          if (toolImplementations[functionName]) {
            const result = await toolImplementations[functionName](...Object.values(functionArgs));
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
        if (false) { // grok-4 doesn't support reasoning_effort
          requestBody.reasoning_effort = this.getReasoningEffort(effort);
        }

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
    effort: EffortType = EffortType.MEDIUM,
    dateRange?: { from?: Date; to?: Date },
    allowedWebsites?: string[],
    excludedWebsites?: string[],
    searchMode: 'auto' | 'on' | 'off' = 'auto'
  ): Promise<GrokResponse> {
    try {
      const searchParams: any = {
        mode: searchMode,
        return_citations: true,
        max_search_results: this.getSearchResultsCount(effort),
      };

      if (dateRange?.from) {
        searchParams.from_date = dateRange.from.toISOString().split('T')[0];
      }
      if (dateRange?.to) {
        searchParams.to_date = dateRange.to.toISOString().split('T')[0];
      }

      if (allowedWebsites || excludedWebsites) {
        searchParams.sources = [{
          type: "web",
          ...(allowedWebsites && { allowed_websites: allowedWebsites.slice(0, 5) }),
          ...(excludedWebsites && { excluded_websites: excludedWebsites.slice(0, 5) })
        }];
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
      if (false) { // grok-4 doesn't support reasoning_effort
        requestBody.reasoning_effort = this.getReasoningEffort(effort);
      }

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

  private getSearchResultsCount(effort: EffortType): number {
    switch (effort) {
      case EffortType.LOW: return 5;
      case EffortType.MEDIUM: return 10;
      case EffortType.HIGH: return 20;
      default: return 10;
    }
  }

  private getReasoningEffort(effort: EffortType): string {
    switch (effort) {
      case EffortType.LOW: return 'low';
      case EffortType.MEDIUM: return 'medium';
      case EffortType.HIGH: return 'high';
      default: return 'medium';
    }
  }

  private buildSearchSources(sources: string[]) {
    return sources.map(source => {
      switch (source.toLowerCase()) {
        case 'web': return { type: 'web' };
        case 'x': return { type: 'x' };
        case 'news': return { type: 'news' };
        case 'rss': return { type: 'rss' };
        default: return { type: 'web' };
      }
    });
  }

  private processCitations(citations: any): Citation[] {
    if (!citations || !Array.isArray(citations)) {
      return [];
    }

    const fullCitations: Citation[] = [];
    citations.forEach((citation: any) => {
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
