import { EffortType, Citation, HostParadigm, ParadigmProbabilities } from '../types';
import { RateLimiter, estimateTokens } from './rateLimiter';
import { APIError, withRetry } from './errorHandler';
import { ResearchToolsService } from './researchToolsService';
import { FunctionCallingService } from './functionCallingService';
import { getEnv } from '../utils/getEnv';

export interface AzureOpenAIResponse {
  text: string;
  sources?: Citation[];
  reasoningEffort?: string;
  reasoningContent?: string;
  toolCalls?: any[];
  iterationCount?: number;
  paradigmContext?: {
    paradigm: HostParadigm;
    probabilities: ParadigmProbabilities;
    toolsUsed: string[];
  };
}

export interface ParadigmAwareToolContext {
  paradigm?: HostParadigm;
  probabilities?: ParadigmProbabilities;
  phase: 'planning' | 'execution' | 'streaming_execution' | 'evaluation';
  previousToolResults?: any[];
  memoryContext?: Map<string, any>;
  iteration?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  retryable?: boolean;
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
  private researchTools: ResearchToolsService;
  private functionCalling: FunctionCallingService;

  private constructor() {
    this.config = this.getConfig();
    this.rateLimiter = RateLimiter.getInstance();
    this.researchTools = ResearchToolsService.getInstance();
    this.functionCalling = FunctionCallingService.getInstance();
  }

  private getConfig(): AzureOpenAIConfig {
    const endpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT');
    const apiKey = getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY');
    const deploymentName = getEnv('VITE_AZURE_OPENAI_DEPLOYMENT', 'AZURE_OPENAI_DEPLOYMENT') || 'o3';
    // Updated API version for o3 support
    const apiVersion = getEnv('VITE_AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_API_VERSION') ||
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
      const apiKey = getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY');
      const endpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT');
      return !!(apiKey && endpoint);
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
        // Adapt limiter to latest service headers
        this.updateLimitsFromHeaders(response.headers);
        console.log('Azure OpenAI API response:', data);

        // Record actual token usage when Azure returns usage stats
        if (data.usage?.total_tokens) {
          this.rateLimiter.recordTokensUsed(data.usage.total_tokens);
        }

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
          const response = await this.generateResponse(
            prompt,
            effort,
            true, // useReasoningEffort
            0.7,  // temperature
            4096  // maxTokens
          );

          return {
            text: response.text || '',
            sources: response.sources || [] // Azure doesn't provide sources directly
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

  /**
   * Parse Azure rate-limit headers and update the shared {@link RateLimiter}
   * instance so all future requests respect the latest limits.
   */
  private updateLimitsFromHeaders(headers: Headers): void {
    const limitTokens    = parseInt(headers.get('x-ratelimit-limit-tokens')     ?? '', 10);
    const limitRequests  = parseInt(headers.get('x-ratelimit-limit-requests')   ?? '', 10);
    const burstTokens    = parseInt(headers.get('x-ratelimit-burst-tokens')     ?? '', 10);

    if (Number.isFinite(limitTokens) || Number.isFinite(limitRequests) || Number.isFinite(burstTokens)) {
      this.rateLimiter.updateLimits({
        maxTokensPerMinute:     Number.isFinite(limitTokens)   ? limitTokens   : undefined,
        maxRequestsPerMinute:   Number.isFinite(limitRequests) ? limitRequests : undefined,
        burstCapacity:          Number.isFinite(burstTokens)   ? burstTokens   : undefined,
      });
    }
  }

  async generateResponseWithTools(
    prompt: string,
    tools: any[],
    effort: EffortType = EffortType.MEDIUM,
    paradigm?: HostParadigm,
    paradigmProbabilities?: ParadigmProbabilities,
    maxIterations: number = 5
  ): Promise<AzureOpenAIResponse> {
    return withRetry(async () => {
      let iterationCount = 0;
      const toolsUsed: string[] = [];
      const allMessages: any[] = [];

      // Build paradigm-aware system prompt
      const systemPrompt = this.buildParadigmAwareSystemPrompt(paradigm, paradigmProbabilities);

      // Filter tools based on paradigm preferences
      const filteredTools = this.filterToolsByParadigm(tools, paradigm);

      // Initialize conversation
      allMessages.push({
        role: "system",
        content: systemPrompt
      });
      allMessages.push({
        role: "user",
        content: prompt
      });

      // Main conversation loop with tool calling
      while (iterationCount < maxIterations) {
        iterationCount++;

        // Guard against Azure rate limits
        const estimatedPromptTokens = estimateTokens(JSON.stringify(allMessages));
        const estimatedCompletionTokens = 4096;
        await this.rateLimiter.waitForCapacity(estimatedPromptTokens + estimatedCompletionTokens);

        const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

        const requestBody: any = {
          messages: allMessages,
          tools: filteredTools.length > 0 ? filteredTools : undefined,
          tool_choice: filteredTools.length > 0 ? "auto" : undefined,
          max_completion_tokens: 32000
        };

        // Only add temperature for non-o3 models
        if (!this.config.deploymentName.includes('o3')) {
          requestBody.temperature = 0.7;
        }

        if (this.config.deploymentName.includes('o3')) {
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

          if (retryAfter) {
            (error as any).retryAfter = retryAfter;
          }

          throw error;
        }

        const data = await response.json();
        this.updateLimitsFromHeaders(response.headers);

        // Record actual token usage when available
        if (data.usage?.total_tokens) {
          this.rateLimiter.recordTokensUsed(data.usage.total_tokens);
        }

        const assistantMessage = data.choices?.[0]?.message;
        if (!assistantMessage) {
          throw new APIError('No assistant message in response', 'EMPTY_RESPONSE', true);
        }

        // Add assistant message to conversation
        allMessages.push(assistantMessage);

        // Handle tool calls if present
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          console.log(`Processing ${assistantMessage.tool_calls.length} tool calls...`);

          // Execute each tool call
          for (const toolCall of assistantMessage.tool_calls) {
            try {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments);

              // Add paradigm context to tool arguments
              if (paradigm) {
                toolArgs._paradigmContext = {
                  paradigm,
                  probabilities: paradigmProbabilities,
                  phase: 'execution'
                };
              }

              console.log(`Executing tool: ${toolName} with args:`, toolArgs);

              // Execute the tool with enhanced context
              const toolContext: ParadigmAwareToolContext = {
                paradigm,
                probabilities: paradigmProbabilities,
                phase: 'execution',
                iteration: iterationCount,
                previousToolResults: toolsUsed.map(name => ({ tool: name }))
              };

              const executionResult = await this.executeToolWithContext(
                toolName,
                toolArgs,
                toolContext
              );

              if (executionResult.success) {
                toolsUsed.push(toolName);

                // Add tool result to conversation
                allMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(executionResult.result)
                });
              } else {
                // Add error result to conversation
                allMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    error: executionResult.error,
                    success: false,
                    retryable: executionResult.retryable
                  })
                });
              }

            } catch (error) {
              console.error(`Tool execution failed for ${toolCall.function.name}:`, error);

              // Add error result to conversation
              allMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : 'Tool execution failed',
                  success: false
                })
              });
            }
          }

          // Continue the loop to get the next response
          continue;
        }

        // No tool calls, we have our final response
        const finalResponse: AzureOpenAIResponse = {
          text: assistantMessage.content || '',
          reasoningContent: assistantMessage.reasoning_content,
          iterationCount,
          toolCalls: toolsUsed.map(name => ({ name }))
        };

        // Add paradigm context if available
        if (paradigm && paradigmProbabilities) {
          finalResponse.paradigmContext = {
            paradigm,
            probabilities: paradigmProbabilities,
            toolsUsed
          };
        }

        return finalResponse;
      }

      // Max iterations reached
      const lastMessage = allMessages[allMessages.length - 1];
      return {
        text: lastMessage?.content || 'Maximum iterations reached without completion.',
        iterationCount,
        toolCalls: toolsUsed.map(name => ({ name })),
        paradigmContext: paradigm && paradigmProbabilities ? {
          paradigm,
          probabilities: paradigmProbabilities,
          toolsUsed
        } : undefined
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

  /**
   * Build paradigm-aware system prompt
   */
  private buildParadigmAwareSystemPrompt(
    paradigm?: HostParadigm,
    probabilities?: ParadigmProbabilities
  ): string {
    let basePrompt = "You are a helpful AI research assistant with access to tools. Use them when needed to provide accurate information.";

    if (paradigm && probabilities) {
      const paradigmPrompts = {
        dolores: "You embody decisive action and transformation. Focus on practical implementation steps, breaking patterns, and immediate actionable insights. Be direct, clear, and oriented toward making change happen.",
        teddy: "You embody protection and comprehensive coverage. Ensure all stakeholder perspectives are considered, gather systematic information, and provide thorough, inclusive analysis that safeguards against overlooked aspects.",
        bernard: "You embody analytical depth and architectural thinking. Focus on theoretical frameworks, pattern recognition, and empirical evidence. Structure your analysis clearly and identify knowledge gaps that need addressing.",
        maeve: "You embody strategic control and optimization. Identify leverage points, control mechanisms, and opportunities for maximum impact. Focus on influence mapping and strategic advantage."
      };

      const confidence = probabilities[paradigm];
      if (confidence > 0.4) {
        basePrompt += `\n\nYou are operating in the ${paradigm.toUpperCase()} paradigm (confidence: ${Math.round(confidence * 100)}%). ${paradigmPrompts[paradigm]}`;

        // Add multi-paradigm context if other paradigms are also strong
        const otherStrong = Object.entries(probabilities)
          .filter(([p, score]) => p !== paradigm && score > 0.25)
          .sort(([,a], [,b]) => b - a);

        if (otherStrong.length > 0) {
          basePrompt += `\n\nSecondary influences: ${otherStrong.map(([p, score]) => `${p} (${Math.round(score * 100)}%)`).join(', ')}. Consider these perspectives as well.`;
        }
      }
    }

    return basePrompt;
  }

  /**
   * Filter tools based on paradigm preferences
   */
  private filterToolsByParadigm(tools: any[], paradigm?: HostParadigm): any[] {
    if (!paradigm) return tools;

    // Define paradigm-specific tool priorities
    const paradigmToolPreferences = {
      dolores: ['advanced_web_search', 'analyze_statistics', 'verify_facts', 'format_citations'],
      teddy: ['advanced_web_search', 'search_academic_sources', 'verify_facts', 'format_citations', 'generate_visualizations'],
      bernard: ['search_academic_sources', 'analyze_statistics', 'verify_facts', 'format_citations', 'local_content_search'],
      maeve: ['advanced_web_search', 'analyze_statistics', 'generate_visualizations', 'verify_facts']
    };

    const preferredTools = paradigmToolPreferences[paradigm] || [];

    // Sort tools by paradigm preference, keeping all tools but prioritizing preferred ones
    return tools.sort((a, b) => {
      const aPreferred = preferredTools.includes(a.function?.name) ? 1 : 0;
      const bPreferred = preferredTools.includes(b.function?.name) ? 1 : 0;
      return bPreferred - aPreferred;
    });
  }

  /**
   * Execute a tool by delegating to the appropriate service
   */
  private async executeTool(toolName: string, args: any): Promise<any> {
    try {
      // First try ResearchToolsService
      const tool = this.researchTools.getTool(toolName);
      if (tool) {
        return await tool.execute(args);
      }

      // Fallback to FunctionCallingService
      const functionCall = { name: toolName, arguments: args };
      const result = await this.functionCalling.executeFunction(functionCall);
      return result.result;
    } catch (error) {
      console.error(`Tool execution failed for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced tool execution with paradigm context and comprehensive error handling
   */
  private async executeToolWithContext(
    toolName: string,
    args: any,
    context: ParadigmAwareToolContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Add paradigm context to args if not already present
    const enrichedArgs = {
      ...args,
      _paradigmContext: context
    };

    // Store execution attempt in memory if available
    if (context.paradigm) {
      try {
        const { WriteLayerService } = await import('./contextLayers/writeLayer');
        const writeLayer = WriteLayerService.getInstance();
        writeLayer.writeMemory(
          `tool_execution_${toolName}_${Date.now()}`,
          JSON.stringify({ toolName, args: enrichedArgs, context }),
          'episodic',
          context.paradigm,
          60 // Medium density for tool executions
        );
      } catch (error) {
        console.warn('Failed to write tool execution to memory:', error);
      }
    }

    try {
      // Circuit breaker check
      if (this.isToolBroken(toolName)) {
        return {
          success: false,
          error: `Tool ${toolName} is temporarily disabled due to repeated failures`,
          executionTime: Date.now() - startTime,
          retryable: false
        };
      }

      // Execute with timeout
      const timeoutMs = this.getToolTimeout(toolName, context.paradigm);
      const result = await this.executeWithTimeout(
        () => this.executeTool(toolName, enrichedArgs),
        timeoutMs
      );

      // Record successful execution
      this.recordToolSuccess(toolName);

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        retryable: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = this.isRetryableError(error);

      // Record failure
      this.recordToolFailure(toolName);

      // Log detailed error for debugging
      console.error(`Tool execution failed for ${toolName}:`, {
        error: errorMessage,
        args: enrichedArgs,
        context,
        executionTime: Date.now() - startTime
      });

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        retryable: isRetryable
      };
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Circuit breaker pattern implementation
   */
  private toolFailures = new Map<string, { count: number; lastFailure: number }>();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

  private isToolBroken(toolName: string): boolean {
    const failures = this.toolFailures.get(toolName);
    if (!failures) return false;

    // Reset if enough time has passed
    if (Date.now() - failures.lastFailure > this.CIRCUIT_BREAKER_RESET_TIME) {
      this.toolFailures.delete(toolName);
      return false;
    }

    return failures.count >= this.CIRCUIT_BREAKER_THRESHOLD;
  }

  private recordToolSuccess(toolName: string): void {
    this.toolFailures.delete(toolName);
  }

  private recordToolFailure(toolName: string): void {
    const failures = this.toolFailures.get(toolName) || { count: 0, lastFailure: 0 };
    failures.count++;
    failures.lastFailure = Date.now();
    this.toolFailures.set(toolName, failures);
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('rate limit') ||
        message.includes('temporary')
      );
    }
    return false;
  }

  /**
   * Get paradigm-specific tool timeout
   */
  private getToolTimeout(toolName: string, paradigm?: HostParadigm): number {
    const baseTimeout = 30000; // 30 seconds base

    // Tool-specific timeouts
    const toolTimeouts: Record<string, number> = {
      'advanced_web_search': 20000,
      'search_academic_papers': 25000,
      'analyze_statistics': 15000,
      'build_knowledge_graph': 45000,
      'generate_visualization': 20000
    };

    // Paradigm-specific multipliers
    const paradigmMultipliers: Record<HostParadigm, number> = {
      dolores: 0.8,  // Faster for action-oriented
      teddy: 1.2,    // More time for comprehensive analysis
      bernard: 1.5,  // More time for deep analysis
      maeve: 1.0     // Standard for strategic thinking
    };

    const baseToolTimeout = toolTimeouts[toolName] || baseTimeout;
    const multiplier = paradigm ? paradigmMultipliers[paradigm] : 1.0;

    return Math.floor(baseToolTimeout * multiplier);
  }

  /**
   * Get all available research tools in Azure OpenAI format
   */
  public getAvailableResearchTools(): any[] {
    return this.researchTools.getAzureOpenAIToolDefinitions();
  }

  /**
   * Get paradigm-specific research tools
   */
  public getParadigmResearchTools(paradigm: HostParadigm): any[] {
    const allTools = this.getAvailableResearchTools();
    return this.filterToolsByParadigm(allTools, paradigm);
  }

  async streamResponse(
    prompt: string,
    effort: EffortType = EffortType.MEDIUM,
    onChunk: (chunk: string, metadata?: { paradigm?: HostParadigm }) => void,
    onComplete: () => void,
    onError?: (error: Error) => void,
    paradigm?: HostParadigm,
    paradigmProbabilities?: ParadigmProbabilities,
    onToolCall?: (toolCall: any) => void,
    tools?: any[] // NEW: Add tools parameter for streaming tool support
  ): Promise<void> {
    // Throttle streaming calls as well
    await this.rateLimiter.waitForCapacity(estimateTokens(prompt) + 4096);
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const requestBody: any = {
      messages: [
        {
          role: "system",
          content: this.buildParadigmAwareSystemPrompt(paradigm, paradigmProbabilities)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      stream: true,
      max_completion_tokens: 2000
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      const filteredTools = this.filterToolsByParadigm(tools, paradigm);
      requestBody.tools = filteredTools;
      requestBody.tool_choice = "auto";
    }

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
      this.updateLimitsFromHeaders(response.headers);
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
                const delta = parsed.choices?.[0]?.delta;
                const content = delta?.content;

                // Handle tool calls in streaming
                if (delta?.tool_calls && onToolCall) {
                  for (const toolCall of delta.tool_calls) {
                    onToolCall(toolCall);
                  }
                }

                if (content) {
                  // Include paradigm metadata with chunks
                  const metadata = paradigm ? { paradigm } : undefined;
                  onChunk(content, metadata);
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

  /**
   * Enhanced streaming with full tool execution support
   * Handles tool calls during streaming and maintains conversation context
   */
  async streamResponseWithTools(
    prompt: string,
    tools: any[],
    effort: EffortType = EffortType.MEDIUM,
    paradigm?: HostParadigm,
    paradigmProbabilities?: ParadigmProbabilities,
    options?: {
      onChunk: (chunk: string, metadata?: { paradigm?: HostParadigm; phase?: string }) => void;
      onToolCall?: (toolCall: any, result?: any) => void;
      onComplete: () => void;
      onError?: (error: Error) => void;
      maxIterations?: number;
    }
  ): Promise<void> {
    const {
      onChunk = () => {},
      onToolCall,
      onComplete = () => {},
      onError,
      maxIterations = 5
    } = options || {};

    // Initialize conversation with paradigm context
    const messages: any[] = [
      {
        role: "system",
        content: this.buildParadigmAwareSystemPrompt(paradigm, paradigmProbabilities)
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Filter tools based on paradigm
    const filteredTools = this.filterToolsByParadigm(tools, paradigm);

    // Track tool execution context
    const toolExecutionContext = {
      paradigm,
      probabilities: paradigmProbabilities,
      toolsUsed: [] as string[],
      iterations: 0
    };

    try {
      await this.streamConversationWithTools(
        messages,
        filteredTools,
        effort,
        toolExecutionContext,
        { onChunk, onToolCall, onComplete, onError },
        maxIterations
      );
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } else {
        throw error;
      }
    }
  }

  /**
   * Internal method to handle streaming conversation with tool execution
   */
  private async streamConversationWithTools(
    messages: any[],
    tools: any[],
    effort: EffortType,
    context: {
      paradigm?: HostParadigm;
      probabilities?: ParadigmProbabilities;
      toolsUsed: string[];
      iterations: number;
    },
    callbacks: {
      onChunk: (chunk: string, metadata?: any) => void;
      onToolCall?: (toolCall: any, result?: any) => void;
      onComplete: () => void;
      onError?: (error: Error) => void;
    },
    maxIterations: number
  ): Promise<void> {
    if (context.iterations >= maxIterations) {
      callbacks.onComplete();
      return;
    }

    context.iterations++;

    // Rate limiting
    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 4096;
    await this.rateLimiter.waitForCapacity(estimatedTokens);

    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const requestBody: any = {
      messages,
      stream: true,
      max_completion_tokens: 4096
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = "auto";
    }

    if (!this.config.deploymentName.includes('o3')) {
      requestBody.temperature = 0.7;
    }

    if (this.config.deploymentName.includes('o3')) {
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
      throw new APIError(
        `Azure OpenAI streaming error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        response.status === 429 ? 'RATE_LIMIT' : 'STREAM_ERROR',
        response.status === 429 || response.status >= 500,
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new APIError('No response body available', 'STREAM_ERROR', false);
    }

    this.updateLimitsFromHeaders(response.headers);

    const decoder = new TextDecoder();
    let buffer = '';
    let currentMessage = { content: '', tool_calls: [] as any[] };
    let isCollectingToolCalls = false;

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
              // Handle any accumulated tool calls
              if (currentMessage.tool_calls.length > 0) {
                await this.handleStreamingToolCalls(
                  currentMessage,
                  messages,
                  tools,
                  effort,
                  context,
                  callbacks,
                  maxIterations
                );
                return; // Tool execution will continue the conversation
              }

              // Add final message if any content
              if (currentMessage.content) {
                messages.push({
                  role: "assistant",
                  content: currentMessage.content
                });
              }

              callbacks.onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // Handle content chunks
              if (delta?.content) {
                currentMessage.content += delta.content;
                const metadata = {
                  paradigm: context.paradigm,
                  phase: isCollectingToolCalls ? 'tool_preparation' : 'response'
                };
                callbacks.onChunk(delta.content, metadata);
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                isCollectingToolCalls = true;
                for (const toolCallDelta of delta.tool_calls) {
                  // Find or create tool call
                  const index = toolCallDelta.index || 0;
                  if (!currentMessage.tool_calls[index]) {
                    currentMessage.tool_calls[index] = {
                      id: toolCallDelta.id || '',
                      type: 'function',
                      function: { name: '', arguments: '' }
                    };
                  }

                  const toolCall = currentMessage.tool_calls[index];
                  if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
                  if (toolCallDelta.function?.name) {
                    toolCall.function.name = toolCallDelta.function.name;
                  }
                  if (toolCallDelta.function?.arguments) {
                    toolCall.function.arguments += toolCallDelta.function.arguments;
                  }
                }
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
  }

  /**
   * Handle tool calls collected during streaming
   */
  private async handleStreamingToolCalls(
    assistantMessage: { content: string; tool_calls: any[] },
    messages: any[],
    tools: any[],
    effort: EffortType,
    context: any,
    callbacks: any,
    maxIterations: number
  ): Promise<void> {
    // Add assistant message with tool calls
    messages.push({
      role: "assistant",
      content: assistantMessage.content || null,
      tool_calls: assistantMessage.tool_calls
    });

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      try {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Add paradigm context to tool arguments
        if (context.paradigm) {
          toolArgs._paradigmContext = {
            paradigm: context.paradigm,
            probabilities: context.probabilities,
            phase: 'streaming_execution'
          };
        }

        // Notify about tool execution
        if (callbacks.onToolCall) {
          callbacks.onToolCall(toolCall, null);
        }

        // Execute the tool with enhanced context
        const toolContext: ParadigmAwareToolContext = {
          paradigm: context.paradigm,
          probabilities: context.probabilities,
          phase: 'streaming_execution',
          iteration: context.iterations,
          previousToolResults: context.toolsUsed.map((name: string) => ({ tool: name }))
        };

        const executionResult = await this.executeToolWithContext(
          toolName,
          toolArgs,
          toolContext
        );

        if (executionResult.success) {
          context.toolsUsed.push(toolName);

          // Notify with result
          if (callbacks.onToolCall) {
            callbacks.onToolCall(toolCall, executionResult.result);
          }

          // Add tool result to conversation
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(executionResult.result)
          });
        } else {
          // Handle execution failure
          if (callbacks.onToolCall) {
            callbacks.onToolCall(toolCall, { error: executionResult.error });
          }

          // Add error to conversation
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: executionResult.error,
              success: false,
              retryable: executionResult.retryable
            })
          });

          // Retry if possible and retryable
          if (executionResult.retryable && context.iterations < 3) {
            console.log(`Retrying tool ${toolName} due to retryable error`);
            // The error will be handled in the next iteration
          }
        }

      } catch (error) {
        console.error(`Tool execution failed for ${toolCall.function.name}:`, error);

        // Add error result to conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed',
            success: false
          })
        });
      }
    }

    // Continue streaming conversation with tool results
    await this.streamConversationWithTools(
      messages,
      tools,
      effort,
      context,
      callbacks,
      maxIterations
    );
  }
}
