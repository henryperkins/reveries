import { EffortType, Citation, HostParadigm, ParadigmProbabilities } from '@/types';
import { RateLimiter, estimateTokens } from './rateLimiter';
import { APIError, withRetry } from './errorHandler';
import { ResearchToolsService } from './researchToolsService';
import { FunctionCallingService } from './functionCallingService';
import { getEnv } from '@/utils/getEnv';

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

  /**
   * Validate function_call_output structure according to Responses API spec
   */
  private validateFunctionCallOutput(output: any): boolean {
    const validationErrors: string[] = [];
    
    if (!output) {
      validationErrors.push('Output is null or undefined');
    } else if (typeof output !== 'object') {
      validationErrors.push(`Output is not an object, got: ${typeof output}`);
    } else {
      if (output.type !== 'function_call_output') {
        validationErrors.push(`Invalid type: expected 'function_call_output', got '${output.type}'`);
      }
      if (typeof output.call_id !== 'string') {
        validationErrors.push(`Invalid call_id: expected string, got ${typeof output.call_id}`);
      } else if (output.call_id.length === 0) {
        validationErrors.push('call_id is empty string');
      }
      if (typeof output.output !== 'string') {
        validationErrors.push(`Invalid output: expected string, got ${typeof output.output}`);
      }
    }
    
    if (validationErrors.length > 0) {
      console.warn('🚨 O3 Tool Output Validation Failed:', {
        errors: validationErrors,
        receivedOutput: output,
        expectedFormat: {
          type: 'function_call_output',
          call_id: 'string (non-empty)',
          output: 'string (JSON serialized result)'
        }
      });
      return false;
    }
    
    return true;
  }

  private getConfig(): AzureOpenAIConfig {
    const endpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT');
    const apiKey = getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY');
    const deploymentName = getEnv('VITE_AZURE_OPENAI_DEPLOYMENT', 'AZURE_OPENAI_DEPLOYMENT') || 'o3';
    // Updated API version for o3 support
    // The new Responses API is currently available under the "preview" API
    // version. Allow overriding via env but default to "preview" so users
    // automatically pick up the latest capabilities.
    const apiVersion = getEnv('VITE_AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_API_VERSION') || '2025-04-01-preview';

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
    useReasoningEffort = true,
    temperature = 0.7,
    maxTokens = 4096
  ): Promise<AzureOpenAIResponse> {
    const requestId = `o3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🎯 O3 Azure OpenAI generateResponse called:', {
      requestId,
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length,
      effort,
      useReasoningEffort,
      temperature: this.config.deploymentName.includes('o3') ? 'N/A (deterministic)' : temperature,
      maxTokens,
      deployment: this.config.deploymentName,
      timestamp: new Date().toISOString()
    });
    
    try {
      return await withRetry(async () => {
        // Wait for rate-limit capacity before dispatching the request
        const estimatedPromptTokens = estimateTokens(prompt);
        const estimatedCompletionTokens = maxTokens;
        const totalEstimatedTokens = estimatedPromptTokens + estimatedCompletionTokens;
        
        console.log(`📊 O3 Token Estimation [${requestId}]:`, {
          promptTokens: estimatedPromptTokens,
          maxCompletionTokens: estimatedCompletionTokens,
          totalEstimated: totalEstimatedTokens
        });
        
        await this.rateLimiter.waitForCapacity(totalEstimatedTokens);

        let data: any;
        // ── Azure Responses API (preview) ──────────────────────────
        const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`;

        const requestBody: any = {
          model: this.config.deploymentName,
          input: prompt,
          max_output_tokens: maxTokens,
        };

        // Temperature is still honoured by the Responses API, but omit for
        // o3-style models where deterministic reasoning is preferred.
        if (!this.config.deploymentName.includes('o3')) {
          requestBody.temperature = temperature;
        }

        // Reasoning effort for paradigmatic models now sits under a
        // top-level `reasoning` object.
        if (useReasoningEffort && this.config.deploymentName.includes('o3')) {
          const reasoningEffort = this.mapEffortToReasoning(effort);
          requestBody.reasoning = { effort: reasoningEffort } as any;
          console.log(`🧠 O3 Reasoning Configuration [${requestId}]:`, {
            effort: reasoningEffort,
            mapping: `${effort} → ${reasoningEffort}`
          });
        }

        console.log(`🚀 O3 API Request [${requestId}]:`, {
          url,
          method: 'POST',
          apiVersion: this.config.apiVersion,
          deployment: this.config.deploymentName,
          hasReasoning: !!requestBody.reasoning
        });
        console.log(`📋 O3 Request Body [${requestId}]:`, {
          ...requestBody,
          input: requestBody.input.substring(0, 100) + '...'
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey
          },
          body: JSON.stringify(requestBody)
        });

        console.log(`📨 O3 Response Status [${requestId}]:`, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'content-type': response.headers.get('content-type'),
            'operation-location': response.headers.get('operation-location'),
            'retry-after': response.headers.get('retry-after')
          }
        });

        // ── Background-task shortcut ─────────────────────────────
        if (response.status === 202) {
          const operationUrl = response.headers.get('operation-location');
          if (!operationUrl) {
            console.error(`❌ O3 Background Task Error [${requestId}]: No operation-location header`);
            throw new APIError(
              'Azure returned 202 but no operation-location header.',
              'BACKGROUND_TASK_ERROR',
              false,
              500,
            );
          }
          console.log(`⏳ O3 Background Task Started [${requestId}]:`, {
            operationUrl,
            status: 'accepted',
            message: 'Long-running operation initiated'
          });
          
          // Enhanced timeout for O3 models which can take significantly longer
          const isO3Model = this.config.deploymentName.includes('o3');
          const timeout = isO3Model ? 30 * 60 * 1000 : 10 * 60 * 1000; // 30min for O3, 10min for others
          
          console.log(`⏱️ O3 Background Task Configuration [${requestId}]:`, {
            isO3Model,
            timeoutMinutes: timeout / 60000,
            pollStrategy: 'exponential-backoff-with-retry'
          });
          
          // Retry logic for background task timeouts
          let backgroundTaskAttempt = 0;
          const maxBackgroundTaskAttempts = 2;
          
          while (backgroundTaskAttempt < maxBackgroundTaskAttempts) {
            try {
              backgroundTaskAttempt++;
              console.log(`🔄 O3 Background Task Attempt ${backgroundTaskAttempt}/${maxBackgroundTaskAttempts} [${requestId}]`);
              
              data = await this.pollBackgroundTask(operationUrl, timeout, (message) => {
                console.log(`📊 O3 Background Task Progress [${requestId}]: ${message}`);
              });
              
              // Success - break out of retry loop
              break;
              
            } catch (taskError) {
              if (taskError instanceof APIError && taskError.code === 'BACKGROUND_TASK_TIMEOUT' && backgroundTaskAttempt < maxBackgroundTaskAttempts) {
                console.warn(`⚠️ O3 Background Task Timeout - Retrying [${requestId}]:`, {
                  attempt: backgroundTaskAttempt,
                  willRetry: true,
                  operationUrl
                });
                // Continue to next attempt
              } else {
                // Non-timeout error or max attempts reached
                throw taskError;
              }
            }
          }
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

        // The Responses API returns the assistant content inside the
        // `output` array. We extract the first `output_text` item for
        // convenience so downstream callers can continue to expect a
        // simple `text` field.

        // Find the message output (not reasoning output)
        const messageOutput = Array.isArray(data.output)
          ? data.output.find((item: any) => item.type === 'message')
          : null;

        let assistantText: string | undefined;

        // Parse the assistant message content
        if (messageOutput?.content && Array.isArray(messageOutput.content)) {
          const textPart = messageOutput.content.find((p: any) => p.type === 'output_text');
          if (textPart && typeof textPart.text === 'string') {
            assistantText = textPart.text;
          }
        }

        if (!assistantText) {
          console.error('Empty or invalid response structure:', data);
          console.error('Full output array:', JSON.stringify(data.output, null, 2));
          throw new APIError(
            'Empty response from Azure OpenAI Responses API',
            'EMPTY_RESPONSE',
            true
          );
        }

        const result: AzureOpenAIResponse = {
          text: assistantText,
          reasoningEffort: requestBody.reasoning?.effort
        };

        // Extract reasoning content if available (encrypted or plaintext)
        if (data.reasoning?.content || data.reasoning?.encrypted_content) {
          result.reasoningContent = data.reasoning.content || data.reasoning.encrypted_content;
        }

        // Extract token usage when provided by the service
        if (data.usage?.output_tokens_details?.reasoning_tokens) {
          console.log(`O3 reasoning tokens used: ${data.usage.output_tokens_details.reasoning_tokens}`);
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
    onProgress?: (message: string) => void
  ): Promise<any> {
    const pollId = `poll-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    let backoffMs = 1000;          // initial back-off = 1 s
    const maxBackoffMs = 60_000;   // cap back-off at 60 s
    let attempt = 0;

    console.log(`🔄 O3 Background Polling Started [${pollId}]:`, {
      operationUrl,
      timeoutMs,
      timeoutMinutes: timeoutMs / 60000,
      startTime: new Date(startTime).toISOString()
    });

    onProgress?.('O3 model processing in background, polling for completion...');

    while (true) {
      attempt++;
      const elapsedMs = Date.now() - startTime;
      const elapsedSec = Math.round(elapsedMs / 1000);

      console.log(`🔍 O3 Poll Attempt #${attempt} [${pollId}]:`, {
        elapsedTime: `${elapsedSec}s`,
        elapsedMinutes: (elapsedMs / 60000).toFixed(2),
        remainingTimeMs: timeoutMs - elapsedMs
      });

      // Abort if we exceed the timeout window
      if (elapsedMs > timeoutMs) {
        console.error(`❌ O3 Background Task Timeout [${pollId}]:`, {
          attempts: attempt,
          elapsedMinutes: (elapsedMs / 60000).toFixed(2),
          timeoutMinutes: timeoutMs / 60000,
          operationUrl,
          suggestion: 'Task may still be processing - retry or check later'
        });
        
        // For O3 models, provide more context about long processing times
        const isO3 = this.config.deploymentName.includes('o3');
        const timeoutMessage = isO3 
          ? `O3 background task polling timed out after ${timeoutMs / 60000} minutes. O3 models may require extended processing time for complex reasoning tasks.`
          : `Background task polling timed out after ${timeoutMs / 1000}s`;
        
        throw new APIError(
          timeoutMessage,
          'BACKGROUND_TASK_TIMEOUT',
          true, // Make it retryable
          504,
        );
      }

      const resp = await fetch(operationUrl, {
        method: 'GET',
        headers: { 'api-key': this.config.apiKey },
      });

      console.log(`📡 O3 Poll Response #${attempt} [${pollId}]:`, {
        status: resp.status,
        statusText: resp.statusText,
        headers: {
          'retry-after': resp.headers.get('retry-after'),
          'content-type': resp.headers.get('content-type')
        }
      });

      // 202 → still processing, no body
      if (resp.status === 202) {
        const retryAfter = parseInt(resp.headers.get('retry-after') ?? '0', 10);
        const waitMs = (retryAfter > 0 ? retryAfter * 1000 : backoffMs);
        
        console.log(`⏳ O3 Still Processing [${pollId}]:`, {
          attempt,
          elapsedSeconds: elapsedSec,
          nextPollIn: `${waitMs / 1000}s`,
          usingRetryAfter: retryAfter > 0,
          backoffMs: retryAfter > 0 ? 'N/A' : backoffMs
        });
        
        onProgress?.(`O3 model still processing (${elapsedSec}s elapsed), waiting ${waitMs / 1000}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        continue;
      }

      // 200-level → body with status
      if (resp.ok) {
        const body: any = await resp.json().catch(() => ({}));
        const status = (body?.status ?? '').toString().toLowerCase();

        console.log(`📋 O3 Task Status [${pollId}]:`, {
          attempt,
          status,
          hasBody: !!body,
          bodyKeys: Object.keys(body || {}),
          elapsedSeconds: elapsedSec
        });

        switch (status) {
          case 'notstarted':
          case 'running': {
            const retryAfter = parseInt(resp.headers.get('retry-after') ?? '0', 10);
            const waitMs = (retryAfter > 0 ? retryAfter * 1000 : backoffMs);
            
            console.log(`🔄 O3 Task ${status.charAt(0).toUpperCase() + status.slice(1)} [${pollId}]:`, {
              status,
              nextCheckIn: `${waitMs / 1000}s`,
              progressPercentage: body?.percentComplete || 'unknown'
            });
            
            onProgress?.(`O3 model ${status} (${elapsedSec}s elapsed), checking again in ${waitMs / 1000}s...`);
            await new Promise(r => setTimeout(r, waitMs));
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
            continue;
          }

          case 'succeeded':
            console.log(`✅ O3 Task Succeeded [${pollId}]:`, {
              totalAttempts: attempt,
              totalDurationSeconds: elapsedSec,
              totalDurationMinutes: (elapsedMs / 60000).toFixed(2),
              hasOutput: !!body.output,
              hasUsage: !!body.usage,
              reasoningTokens: body?.usage?.output_tokens_details?.reasoning_tokens || 'N/A'
            });
            return body;

          case 'failed':
          case 'cancelled':
          case 'canceled': // some SDKs spell it this way
            console.error(`❌ O3 Task ${status} [${pollId}]:`, {
              status,
              error: body?.error || 'Unknown error',
              attempts: attempt,
              elapsedMinutes: (elapsedMs / 60000).toFixed(2)
            });
            throw new APIError(
              `Background task ${status}: ${body?.error?.message || 'Unknown error'}`,
              'BACKGROUND_TASK_ERROR',
              false,
              500,
            );

          default:
            // Unknown status → treat as failure
            console.error(`❓ O3 Unknown Task Status [${pollId}]:`, {
              status: status || '(empty)',
              body,
              attempts: attempt
            });
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
    maxIterations = 5,
    onToolUse?: (toolName: string) => void // Add this parameter
  ): Promise<AzureOpenAIResponse> {
    return withRetry(async () => {
      let iterationCount = 0;
      const toolsUsed: string[] = [];
      let previousResponseId: string | undefined;

      // Build paradigm-aware system prompt
      const systemPrompt = this.buildParadigmAwareSystemPrompt(paradigm, paradigmProbabilities);

      // Filter tools based on paradigm preferences
      const filteredTools = this.filterToolsByParadigm(tools, paradigm);

      // Build initial input for Responses API
      const initialInput: any[] = [
        {
          type: "message",
          role: "system",
          content: systemPrompt
        },
        {
          type: "message",
          role: "user",
          content: prompt
        }
      ];

      // Main conversation loop with tool calling
      while (iterationCount < maxIterations) {
        iterationCount++;

        // Guard against Azure rate limits
        const estimatedPromptTokens = estimateTokens(JSON.stringify(initialInput));
        const estimatedCompletionTokens = 4096;
        await this.rateLimiter.waitForCapacity(estimatedPromptTokens + estimatedCompletionTokens);

        const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`;

        const requestBody: any = {
          model: this.config.deploymentName,
          max_output_tokens: 32000
        };

        // Handle input vs previous_response_id properly
        if (iterationCount === 1) {
          requestBody.input = initialInput;
        } else {
          requestBody.previous_response_id = previousResponseId;
        }

        // Add tools if available
        if (filteredTools.length > 0) {
          requestBody.tools = filteredTools;
          console.log('🔧 O3 Tool Format Validation:', {
            totalTools: filteredTools.length,
            firstTool: filteredTools[0],
            toolNames: filteredTools.map(t => t.function?.name || t.name || 'unknown'),
            toolStructure: {
              hasFunction: !!filteredTools[0].function,
              hasName: !!(filteredTools[0].function?.name || filteredTools[0].name),
              hasDescription: !!(filteredTools[0].function?.description || filteredTools[0].description),
              hasParameters: !!(filteredTools[0].function?.parameters || filteredTools[0].parameters)
            }
          });
          console.log('📋 O3 First Tool Full Format:', JSON.stringify(filteredTools[0], null, 2));
        }

        // Only add temperature for non-o3 models
        if (!this.config.deploymentName.includes('o3')) {
          requestBody.temperature = 0.7;
        }

        if (this.config.deploymentName.includes('o3')) {
          requestBody.reasoning = { effort: this.mapEffortToReasoning(effort) };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey
          },
          body: JSON.stringify(requestBody)
        });

        // Handle background tasks (202 status)
        let data: any;
        if (response.status === 202) {
          const operationUrl = response.headers.get('operation-location');
          if (!operationUrl) {
            throw new APIError(
              'Azure returned 202 but no operation-location header.',
              'BACKGROUND_TASK_ERROR',
              false,
              500
            );
          }
          console.log(`Background task started → polling ${operationUrl}`);
          data = await this.pollBackgroundTask(operationUrl);
        } else if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Extract retry-after header for rate limits
          let retryAfter: number | undefined;
          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('retry-after');
            if (retryAfterHeader) {
              retryAfter = parseInt(retryAfterHeader, 10);
              console.log(`Rate limit hit. Retry after ${retryAfter} seconds`);
              this.rateLimiter.penalize(retryAfter);
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
        } else {
          data = await response.json();
        }

        this.updateLimitsFromHeaders(response.headers);

        // Record actual token usage when available
        if (data.usage?.total_tokens) {
          this.rateLimiter.recordTokensUsed(data.usage.total_tokens);
        }

        // Store response ID for chaining
        previousResponseId = data.id;

        // Extract assistant message from output array
        const assistantOutput = data.output?.find((item: any) => item.type === 'message' && item.role === 'assistant');
        if (!assistantOutput) {
          throw new APIError('No assistant message in response', 'EMPTY_RESPONSE', true);
        }

        // Handle tool calls if present in output
        const toolCalls = data.output?.filter((item: any) => item.type === 'function_call') || [];
        if (toolCalls.length > 0) {
          console.log(`Processing ${toolCalls.length} tool calls...`);

          // Build input for next iteration with tool results
          const toolResultsInput: any[] = [];

          // Execute each tool call
          for (const toolCall of toolCalls) {
            try {
              const toolName = toolCall.name;
              const toolArgs = typeof toolCall.arguments === 'string' ? JSON.parse(toolCall.arguments) : toolCall.arguments;

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

                // Notify about tool usage
                onToolUse?.(toolName);

                // Add tool result for next iteration
                const callId = toolCall.call_id || toolCall.id;
                if (!callId) {
                  console.error('🚨 O3 Tool Call ID Missing:', {
                    toolCall,
                    availableFields: Object.keys(toolCall),
                    toolName,
                    error: 'Tool call must have either call_id or id field'
                  });
                  continue;
                }
                const toolResult = {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify(executionResult.result)
                };
                if (this.validateFunctionCallOutput(toolResult)) {
                  toolResultsInput.push(toolResult);
                } else {
                  console.error('🚨 O3 Tool Result Validation Failed:', {
                    toolName,
                    callId,
                    validationPassed: false,
                    toolResult
                  });
                }
              } else {
                // Add error result
                const callId = toolCall.call_id || toolCall.id;
                if (!callId) {
                  console.warn('Tool call missing call_id, skipping error result');
                  continue;
                }
                const errorResult = {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify({
                    error: executionResult.error,
                    success: false,
                    retryable: executionResult.retryable
                  })
                };
                if (this.validateFunctionCallOutput(errorResult)) {
                  toolResultsInput.push(errorResult);
                } else {
                  console.warn('Invalid error result format, skipping:', errorResult);
                }
              }

            } catch (error) {
              console.error(`Tool execution failed for ${toolCall.name}:`, error);

              // Add error result
              const callId = toolCall.call_id || toolCall.id;
              if (!callId) {
                console.warn('Tool call missing call_id, skipping error result');
                continue;
              }
              const errorResult = {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({
                  error: error instanceof Error ? error.message : 'Tool execution failed',
                  success: false
                })
              };
              if (this.validateFunctionCallOutput(errorResult)) {
                toolResultsInput.push(errorResult);
              } else {
                console.warn('Invalid error result format, skipping:', errorResult);
              }
            }
          }

          // Update input for next iteration to include tool results
          initialInput.length = 0; // Clear for next iteration
          initialInput.push(...toolResultsInput);

          // Continue the loop to get the next response
          continue;
        }

        // No tool calls, we have our final response
        // Extract text content from assistant output
        let finalText = '';
        if (assistantOutput.content && Array.isArray(assistantOutput.content)) {
          const textContent = assistantOutput.content.find((c: any) => c.type === 'output_text');
          if (textContent) {
            finalText = textContent.text;
          }
        } else if (typeof assistantOutput.content === 'string') {
          finalText = assistantOutput.content;
        }

        const finalResponse: AzureOpenAIResponse = {
          text: finalText,
          reasoningContent: data.reasoning?.content || data.reasoning?.encrypted_content,
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
      return {
        text: 'Maximum iterations reached without completion.',
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
    console.log('🎯 O3 Tool Filtering:', {
      paradigm: paradigm || 'none',
      inputToolCount: tools.length,
      toolFormats: tools.map(t => ({
        hasFunction: !!t.function,
        name: t.function?.name || t.name || 'unknown',
        type: t.type || 'function'
      }))
    });
    
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
    const sortedTools = tools.sort((a, b) => {
      // Handle both tool formats: { function: { name: ... } } and { name: ... }
      const aName = a.function?.name || a.name;
      const bName = b.function?.name || b.name;
      const aPreferred = preferredTools.includes(aName) ? 1 : 0;
      const bPreferred = preferredTools.includes(bName) ? 1 : 0;
      return bPreferred - aPreferred;
    });
    
    console.log('📋 O3 Tool Priority Order:', {
      paradigm,
      preferredTools,
      finalOrder: sortedTools.map(t => t.function?.name || t.name || 'unknown')
    });
    
    return sortedTools;
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
    // Always delete the entry on success, even if it was expired
    this.toolFailures.delete(toolName);
  }

  private recordToolFailure(toolName: string): void {
    const now = Date.now();
    const existing = this.toolFailures.get(toolName);

    // If entry exists but is expired, start fresh count
    if (existing && (now - existing.lastFailure > this.CIRCUIT_BREAKER_RESET_TIME)) {
      this.toolFailures.set(toolName, { count: 1, lastFailure: now });
    } else {
      const failures = existing || { count: 0, lastFailure: 0 };
      failures.count++;
      failures.lastFailure = now;
      this.toolFailures.set(toolName, failures);
    }
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
    tools?: any[] // Add tools parameter for streaming tool support
  ): Promise<void> {
    // Throttle streaming calls as well
    await this.rateLimiter.waitForCapacity(estimateTokens(prompt) + 4096);
    const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`;

    const requestBody: any = {
      model: this.config.deploymentName,
      input: [
        {
          type: "message",
          role: "system",
          content: this.buildParadigmAwareSystemPrompt(paradigm, paradigmProbabilities)
        },
        {
          type: "message",
          role: "user",
          content: prompt
        }
      ],
      stream: true,
      max_output_tokens: 2000
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      const filteredTools = this.filterToolsByParadigm(tools, paradigm);
      requestBody.tools = filteredTools;
      // Note: tool_choice is not used in Responses API - tools are automatically used when provided
    }

    // Only add temperature for non-o3 models
    if (!this.config.deploymentName.includes('o3')) {
      requestBody.temperature = 0.7;
    }

    if (this.config.deploymentName.includes('o3')) {
      requestBody.reasoning = { effort: this.mapEffortToReasoning(effort) };
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

                // Handle Responses API streaming events
                if (parsed.type === 'response.output_text.delta') {
                  const content = parsed.delta;
                  if (content) {
                    // Include paradigm metadata with chunks
                    const metadata = paradigm ? { paradigm } : undefined;
                    onChunk(content, metadata);
                  }
                } else if (parsed.type === 'response.function_call.delta' && onToolCall) {
                  // Handle streaming function calls
                  onToolCall({
                    id: parsed.call_id,
                    name: parsed.name,
                    arguments: parsed.delta
                  });
                } else if (parsed.type === 'response.done') {
                  onComplete();
                  return;
                }
              } catch (_e) {
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
      previousResponseId?: string;
      toolResults?: any[];
    },
    callbacks: {
      onChunk: (chunk: string, metadata?: any) => void;
      onToolCall?: (toolCall: any, result?: any) => void;
      onComplete: () => void;
      onError?: (error: Error) => void;
    },
    maxIterations: number,
    toolResultsInput?: any[]
  ): Promise<void> {
    if (context.iterations >= maxIterations) {
      callbacks.onComplete();
      return;
    }

    context.iterations++;

    // Rate limiting
    const estimatedTokens = estimateTokens(JSON.stringify(messages)) + 4096;
    await this.rateLimiter.waitForCapacity(estimatedTokens);

    const url = `${this.config.endpoint}/openai/v1/responses?api-version=${this.config.apiVersion}`;

    // Convert messages to Responses API format for first iteration
    const inputArray: any[] = [];
    if (context.iterations === 1) {
      for (const msg of messages) {
        inputArray.push({
          type: "message",
          role: msg.role,
          content: msg.content
        });
      }
    }

    const requestBody: any = {
      model: this.config.deploymentName,
      stream: true,
      max_output_tokens: 4096
    };

    // Handle input vs previous_response_id properly
    if (toolResultsInput && toolResultsInput.length > 0) {
      // Tool results from previous iteration
      requestBody.input = toolResultsInput;
      requestBody.previous_response_id = context.previousResponseId;
    } else if (context.iterations === 1) {
      // First iteration - use initial input
      requestBody.input = inputArray;
    } else {
      // Subsequent iteration without tool results
      requestBody.previous_response_id = context.previousResponseId;
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      // Note: tool_choice is not used in Responses API - tools are automatically used when provided
    }

    if (!this.config.deploymentName.includes('o3')) {
      requestBody.temperature = 0.7;
    }

    if (this.config.deploymentName.includes('o3')) {
      requestBody.reasoning = { effort: this.mapEffortToReasoning(effort) };
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
    const currentMessage = { content: '', tool_calls: [] as any[] };
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

              // Store response ID for chaining
              if (parsed.id && !context.previousResponseId) {
                context.previousResponseId = parsed.id;
              }

              // Handle Responses API streaming events
              if (parsed.type === 'response.output_text.delta') {
                currentMessage.content += parsed.delta;
                const metadata = {
                  paradigm: context.paradigm,
                  phase: isCollectingToolCalls ? 'tool_preparation' : 'response'
                };
                callbacks.onChunk(parsed.delta, metadata);
              } else if (parsed.type === 'response.function_call.delta') {
                isCollectingToolCalls = true;
                // Find or create tool call by call_id
                let toolCall = currentMessage.tool_calls.find((tc: any) => tc.id === parsed.call_id);
                if (!toolCall) {
                  toolCall = {
                    id: parsed.call_id,
                    name: parsed.name || '',
                    arguments: ''
                  };
                  currentMessage.tool_calls.push(toolCall);
                }

                if (parsed.delta) {
                  toolCall.arguments += parsed.delta;
                }
              } else if (parsed.type === 'response.done') {
                // Response completed
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
                  return;
                }

                if (currentMessage.content) {
                  messages.push({
                    role: "assistant",
                    content: currentMessage.content
                  });
                }

                callbacks.onComplete();
                return;
              }
            } catch (_e) {
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
        const toolName = toolCall.name || toolCall.function?.name;
        const toolArgs = JSON.parse(toolCall.arguments || toolCall.function?.arguments);

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

          // Add tool result to conversation - need to convert to input array for next response
          // Store tool result for building next request input
          context.toolResults = context.toolResults || [];
          const toolResult = {
            type: "function_call_output",
            call_id: toolCall.id,
            output: JSON.stringify(executionResult.result)
          };
          if (this.validateFunctionCallOutput(toolResult)) {
            context.toolResults.push(toolResult);
          } else {
            console.warn('Invalid streaming tool result format:', toolResult);
          }
        } else {
          // Handle execution failure
          if (callbacks.onToolCall) {
            callbacks.onToolCall(toolCall, { error: executionResult.error });
          }

          // Add error to conversation - need to convert to input array for next response
          context.toolResults = context.toolResults || [];
          const errorResult = {
            type: "function_call_output",
            call_id: toolCall.id,
            output: JSON.stringify({
              error: executionResult.error,
              success: false,
              retryable: executionResult.retryable
            })
          };
          if (this.validateFunctionCallOutput(errorResult)) {
            context.toolResults.push(errorResult);
          } else {
            console.warn('Invalid streaming error result format:', errorResult);
          }

          // Retry if possible and retryable
          if (executionResult.retryable && context.iterations < 3) {
            console.log(`Retrying tool ${toolName} due to retryable error`);
            // The error will be handled in the next iteration
          }
        }

      } catch (error) {
        console.error(`Tool execution failed for ${toolCall.function.name}:`, error);

        // Add error result to conversation - need to convert to input array for next response
        context.toolResults = context.toolResults || [];
        const errorResult = {
          type: "function_call_output",
          call_id: toolCall.id,
          output: JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed',
            success: false
          })
        };
        if (this.validateFunctionCallOutput(errorResult)) {
          context.toolResults.push(errorResult);
        } else {
          console.warn('Invalid streaming error result format:', errorResult);
        }
      }
    }

    // Continue streaming conversation with tool results
    // For tool continuation, we need to send the tool results as input array
    const nextInput: any[] = context.toolResults || [];
    context.toolResults = []; // Clear for next iteration

    // Update the conversation to send tool results
    const nextContext = {
      ...context
      // iterations will be incremented in the function call below
    };

    await this.streamConversationWithTools(
      messages,
      tools,
      effort,
      nextContext,
      callbacks,
      maxIterations,
      nextInput // Pass tool results as input
    );
  }

  /**
   * Summarizes content using the Responses API
   * This replaces the database-level summarization that used azure_openai.create_chat_completion
   */
  async summarizeContent(content: string, maxSentences = 3): Promise<string> {
    const prompt = `Summarize the following research content in ${maxSentences} sentences. Focus on key findings, insights, and important information.

Content:
${content}

Summary:`;

    try {
      const response = await this.generateResponse(
        prompt,
        EffortType.LOW,
        false, // No reasoning effort needed for simple summarization
        0.7,
        500 // Max tokens for summary
      );
      return response.text.trim();
    } catch (error) {
      console.error('Failed to summarize content:', error);
      // Return first few sentences as fallback
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      return sentences.slice(0, maxSentences).join('. ') + '.';
    }
  }
}
