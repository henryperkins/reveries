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
    maxTokens: number = 4096
  ): Promise<AzureOpenAIResponse> {
    console.log('generateResponse called with:', { prompt: prompt.substring(0, 100), effort, useReasoningEffort });
    try {
      return await withRetry(async () => {
        // Wait for rate-limit capacity before dispatching the request
        const estimatedPromptTokens = estimateTokens(prompt);
        const estimatedCompletionTokens = maxTokens;
        const totalEstimatedTokens = estimatedPromptTokens + estimatedCompletionTokens;
        await this.rateLimiter.waitForCapacity(totalEstimatedTokens);

        let data: any;
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

        console.log('Making Azure OpenAI request to:', url);
        console.log('Request body:', requestBody);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Azure OpenAI response status:', response.status);

        // ── Background-task shortcut ─────────────────────────────
        if (response.status === 202) {
          const operationUrl = response.headers.get('operation-location');
          if (!operationUrl) {
            throw new APIError(
              'Azure returned 202 but no operation-location header.',
              'BACKGROUND_TASK_ERROR',
              false,
              500,
            );
          }
          console.log(`Background task started → polling ${operationUrl}`);
          data = await this.pollBackgroundTask(operationUrl);
        } else

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

          // Extract retry-after header for rate limits
          let retryAfter: number | undefined;
          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('retry-after');
            if (retryAfterHeader) {
              retryAfter = parseInt(retryAfterHeader, 10);
              console.log(`Rate limit hit. Retry after ${retryAfter}s`);
              this.rateLimiter.penalize(retryAfter);     // NEW: slow down callers
            }
          }

          const error = new APIError(
            `Azure OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
            response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
            response.status === 429 || response.status >= 500,
            response.status
          );

          // Attach retry-after to error for smarter retry handling
          if (retryAfter) {
            (error as any).retryAfter = retryAfter;
          }

          throw error;
        }

        data = await response.json();
        console.log('Azure OpenAI API response:', data);

        if (!data.choices?.[0]?.message?.content) {
          console.error('Empty or invalid response structure:', data);
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
    }, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    }, (attempt, error) => {
      console.warn(`Azure OpenAI retry attempt ${attempt}:`, error.message);
    });
    } catch (error) {
      console.error('Error in generateResponse:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof APIError ? error.code : undefined
      });
      throw error;
    }
  }

  /**
   * Polls Azure OpenAI "background task" endpoint until completion.
   * Ref: https://learn.microsoft.com/azure/ai-foundry/openai/how-to/responses#background-tasks
   */
  /**
   * Polls the Azure background-task endpoint until completion, following
   * guidance from MS docs:
   * https://learn.microsoft.com/azure/ai-foundry/openai/how-to/responses#background-tasks
   *
   * Behaviour:
   *   • Honors `retry-after` header when provided
   *   • Uses exponential back-off capped at 60 s when header missing
   *   • Parses JSON body for a `status` field (`notStarted`, `running`,
   *     `succeeded`, `failed`, `cancelled`)
   *   • Aborts after `timeoutMs` (default 10 min)
   */
  private async pollBackgroundTask(
    operationUrl: string,
    timeoutMs = 10 * 60 * 1000,
  ): Promise<any> {
    const startTime = Date.now();
    let backoffMs = 1000;          // initial back-off = 1 s
    const maxBackoffMs = 60_000;   // cap back-off at 60 s
    let attempt = 0;

    while (true) {
      attempt++;

      // Abort if we exceed the timeout window
      if (Date.now() - startTime > timeoutMs) {
        throw new APIError(
          `Background task polling timed out after ${timeoutMs / 1000}s`,
          'BACKGROUND_TASK_TIMEOUT',
          false,
          504,
        );
      }

      const resp = await fetch(operationUrl, {
        method: 'GET',
        headers: { 'api-key': this.config.apiKey },
      });

      // 202 → still processing, no body
      if (resp.status === 202) {
        const retryAfter = parseInt(resp.headers.get('retry-after') ?? '0', 10);
        const waitMs = (retryAfter > 0 ? retryAfter * 1000 : backoffMs);
        console.log(`Background task 202 (attempt ${attempt}) – waiting ${waitMs / 1000}s`);
        await new Promise(r => setTimeout(r, waitMs));
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        continue;
      }

      // 200-level → body with status
      if (resp.ok) {
        const body: any = await resp.json().catch(() => ({}));
        const status = (body?.status ?? '').toString().toLowerCase();

        switch (status) {
          case 'notstarted':
          case 'running': {
            const retryAfter = parseInt(resp.headers.get('retry-after') ?? '0', 10);
            const waitMs = (retryAfter > 0 ? retryAfter * 1000 : backoffMs);
            console.log(`Background task ${status} (attempt ${attempt}) – waiting ${waitMs / 1000}s`);
            await new Promise(r => setTimeout(r, waitMs));
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
            continue;
          }

          case 'succeeded':
            return body;

          case 'failed':
          case 'cancelled':
          case 'canceled': // some SDKs spell it this way
            throw new APIError(
              `Background task ${status}`,
              'BACKGROUND_TASK_ERROR',
              false,
              500,
            );

          default:
            // Unknown status → treat as failure
            throw new APIError(
              `Unrecognized background-task status: ${status || '(empty)'}`,
              'BACKGROUND_TASK_ERROR',
              false,
              500,
            );
        }
      }

      // Any non-OK HTTP code ⇒ failure
      const textBody = await resp.text();
      throw new APIError(
        `Background task polling failed (${resp.status}): ${textBody}`,
        'BACKGROUND_TASK_ERROR',
        resp.status >= 500,
        resp.status,
      );
    }
  }

  async generateText(prompt: string, effort: EffortType): Promise<{ text: string; sources?: Citation[] }> {
    // Estimate tokens for rate limiting
    const estimatedPromptTokens = estimateTokens(prompt);
    const estimatedCompletionTokens = 4096; // Align with default max tokens
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
      // Guard against Azure rate limits
      const estimatedPromptTokens = estimateTokens(prompt);
      const estimatedCompletionTokens = 4096; // align with max_completion_tokens in body
      await this.rateLimiter.waitForCapacity(estimatedPromptTokens + estimatedCompletionTokens);

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

        // Extract retry-after header for rate limits
        let retryAfter: number | undefined;
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          if (retryAfterHeader) {
            retryAfter = parseInt(retryAfterHeader, 10);
            console.log(`Rate limit hit. Retry after ${retryAfter} seconds`);
          }
        }

        const error = new APIError(
          `Azure OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
          response.status === 429 || response.status >= 500,
          response.status
        );

        // Attach retry-after to error for smarter retry handling
        if (retryAfter) {
          (error as any).retryAfter = retryAfter;
        }

        throw error;
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
    // Throttle streaming calls as well
    await this.rateLimiter.waitForCapacity(estimateTokens(prompt) + 4096);
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
        const errorData = await response.json().catch(() => ({}));

        // Extract retry-after header for rate limits
        let retryAfter: number | undefined;
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          if (retryAfterHeader) {
            retryAfter = parseInt(retryAfterHeader, 10);
          }
        }

        const error = new APIError(
          `Azure OpenAI streaming error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          response.status === 429 ? 'RATE_LIMIT' : 'STREAM_ERROR',
          response.status === 429 || response.status >= 500,
          response.status
        );

        if (retryAfter) {
          (error as any).retryAfter = retryAfter;
        }

        throw error;
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
