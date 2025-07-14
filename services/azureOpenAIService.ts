import { EffortType, Citation } from '../types';
import { RateLimiter, estimateTokens } from './rateLimiter';
import { APIError, withRetry } from './errorHandler';

export interface AzureOpenAIResponse {
  text: string;
  sources?: Citation[];
  reasoningEffort?: string;
  reasoningContent?: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export class AzureOpenAIService {
  private static instance: AzureOpenAIService;
  private config: AzureOpenAIConfig;
  private rateLimiter: RateLimiter;

  private constructor() {
    this.config = this.getConfig();
    this.rateLimiter = RateLimiter.getInstance();
  }

  private getConfig(): AzureOpenAIConfig {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT ||
                    (typeof process !== 'undefined' && process.env?.AZURE_OPENAI_ENDPOINT);
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY ||
                   (typeof process !== 'undefined' && process.env?.AZURE_OPENAI_API_KEY);
    const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT ||
                          (typeof process !== 'undefined' && process.env?.AZURE_OPENAI_DEPLOYMENT) ||
                          'o3';
    // Updated API version for o3 support
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION ||
                      (typeof process !== 'undefined' && process.env?.AZURE_OPENAI_API_VERSION) ||
                      '2025-04-01-preview';

    if (!endpoint || !apiKey) {
      throw new APIError(
        'Azure OpenAI configuration missing. Please set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY',
        'CONFIG_ERROR',
        false
      );
    }

    return { endpoint, apiKey, deploymentName, apiVersion };
  }

  public static getInstance(): AzureOpenAIService {
    if (!AzureOpenAIService.instance) {
      AzureOpenAIService.instance = new AzureOpenAIService();
    }
    return AzureOpenAIService.instance;
  }

  public static isAvailable(): boolean {
    try {
      // Check for both client-side (VITE_) and server-side env vars
      const hasClientVars = !!(
        import.meta.env.VITE_AZURE_OPENAI_API_KEY &&
        import.meta.env.VITE_AZURE_OPENAI_ENDPOINT
      );
      const hasServerVars = !!(
        typeof process !== 'undefined' &&
        process.env?.AZURE_OPENAI_API_KEY &&
        process.env?.AZURE_OPENAI_ENDPOINT
      );

      return hasClientVars || hasServerVars;
    } catch {
      return false;
    }
  }

  async generateResponse(
    prompt: string,
    effort: EffortType = EffortType.MEDIUM,
    useReasoningEffort: boolean = true,
    temperature: number = 0.7,
    maxTokens: number = 32000
  ): Promise<AzureOpenAIResponse> {
    return withRetry(async () => {
      const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

      const requestBody: any = {
        messages: [
          {
            role: "system",
            content: "You are a helpful AI research assistant. Provide comprehensive, accurate responses with appropriate detail."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        // Use max_completion_tokens for o3 models
        max_completion_tokens: maxTokens,
        response_format: { type: "text" }
      };

      // Only add temperature for non-o3 models
      if (!this.config.deploymentName.includes('o3')) {
        requestBody.temperature = temperature;
      }

      // Add reasoning effort for o3 models
      if (useReasoningEffort && this.config.deploymentName.includes('o3')) {
        requestBody.reasoning_effort = this.mapEffortToReasoning(effort);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Enhanced error handling for o3-specific errors
        if (response.status === 400 && errorData.error?.code === 'invalid_api_version') {
          throw new APIError(
            'Azure OpenAI API version not supported. Please use 2025-04-01-preview or later for o3 models.',
            'VERSION_ERROR',
            false,
            response.status
          );
        }

        throw new APIError(
          `Azure OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          'API_ERROR',
          response.status === 429 || response.status >= 500,
          response.status
        );
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new APIError(
          'Empty response from Azure OpenAI API',
          'EMPTY_RESPONSE',
          true
        );
      }

      const result: AzureOpenAIResponse = {
        text: data.choices[0].message.content,
        reasoningEffort: requestBody.reasoning_effort
      };

      // Extract reasoning content if available
      if (data.choices[0].message.reasoning_content) {
        result.reasoningContent = data.choices[0].message.reasoning_content;
      }

      // Extract token usage for o3 models
      if (data.usage?.completion_tokens_details?.reasoning_tokens) {
        console.log(`O3 reasoning tokens used: ${data.usage.completion_tokens_details.reasoning_tokens}`);
      }

      return result;
    }, 3, (attempt, error) => {
      console.warn(`Azure OpenAI retry attempt ${attempt}:`, error.message);
    });
  }

  async generateText(prompt: string, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    // Estimate tokens for rate limiting
    const estimatedPromptTokens = estimateTokens(prompt);
    const estimatedCompletionTokens = 2000; // Conservative estimate
    const totalEstimatedTokens = estimatedPromptTokens + estimatedCompletionTokens;

    // Wait for rate limit capacity
    await this.rateLimiter.waitForCapacity(totalEstimatedTokens);

    return withRetry(
      async () => {
        try {
          const response = await this.createChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            reasoning_effort: this.mapEffortToReasoning(effort),
            max_completion_tokens: 4096
          });

          return {
            text: response.choices[0]?.message?.content || '',
            sources: [] // Azure doesn't provide sources directly
          };
        } catch (error) {
          // Enhanced error handling
          if (this.isRateLimitError(error)) {
            const retryAfter = this.extractRetryAfter(error);
            throw new APIError(
              `Azure OpenAI rate limit exceeded. Please wait ${retryAfter || 60} seconds.`,
              'RATE_LIMIT',
              true,
              429
            );
          }

          if (this.isQuotaError(error)) {
            throw new APIError(
              'Azure OpenAI quota exceeded for this period. Falling back to other models.',
              'QUOTA_EXCEEDED',
              false,
              429
            );
          }

          throw error;
        }
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 60000,
        backoffFactor: 3, // More aggressive backoff for rate limits
        jitterMs: 1000
      },
      (attempt, error) => {
        console.log(`Azure OpenAI retry attempt ${attempt}: ${error.message}`);
      }
    );
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 ||
           error?.response?.status === 429 ||
           error?.message?.includes('rate limit');
  }

  private isQuotaError(error: any): boolean {
    return error?.message?.includes('quota') ||
           error?.error?.code === 'quota_exceeded';
  }

  private extractRetryAfter(error: any): number | null {
    const retryAfter = error?.headers?.['retry-after'] ||
                      error?.response?.headers?.['retry-after'];
    return retryAfter ? parseInt(retryAfter, 10) : null;
  }

  async generateResponseWithTools(
    prompt: string,
    tools: any[],
    effort: EffortType = EffortType.MEDIUM
  ): Promise<AzureOpenAIResponse> {
    return withRetry(async () => {
      const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

      const messages = [
        {
          role: "system",
          content: "You are a helpful AI research assistant with access to tools. Use them when needed to provide accurate information."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const requestBody: any = {
        messages,
        tools,
        tool_choice: "auto",
        max_completion_tokens: 32000
      };

      // Only add temperature for non-o3 models
      if (!this.config.deploymentName.includes('o3')) {
        requestBody.temperature = 0.7;
      }

      if (this.config.deploymentName.includes('o3')) {
        requestBody.reasoning_effort = this.mapEffortToReasoning(effort);
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          `Azure OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          'API_ERROR',
          response.status === 429 || response.status >= 500,
          response.status
        );
      }

      let data = await response.json();
      const assistantMessage = data.choices?.[0]?.message;

      if (assistantMessage) {
        messages.push(assistantMessage);
      }

      // Handle tool calls if present
      if (assistantMessage?.tool_calls) {
        // Return with tool calls for external handling
        return {
          text: '',
          toolCalls: assistantMessage.tool_calls
        } as any;
      }

      return {
        text: assistantMessage?.content || '',
        reasoningContent: assistantMessage?.reasoning_content
      };
    });
  }

  private mapEffortToReasoning(effort: EffortType): string {
    switch (effort) {
      case EffortType.LOW:
        return 'low';
      case EffortType.MEDIUM:
        return 'medium';
      case EffortType.HIGH:
        return 'high';
      default:
        return 'medium';
    }
  }

  async streamResponse(
    prompt: string,
    effort: EffortType = EffortType.MEDIUM,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const requestBody: any = {
      messages: [
        {
          role: "system",
          content: "You are a helpful AI research assistant."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      stream: true,
      max_completion_tokens: 2000
    };

    // Only add temperature for non-o3 models
    if (!this.config.deploymentName.includes('o3')) {
      requestBody.temperature = 0.7;
    }

    if (this.config.deploymentName.includes('o3')) {
      requestBody.reasoning_effort = this.mapEffortToReasoning(effort);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new APIError(
          `Azure OpenAI streaming error: ${response.status}`,
          'STREAM_ERROR',
          true,
          response.status
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new APIError('No response body available', 'STREAM_ERROR', false);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete();
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } else {
        throw error;
      }
    }
  }
}
