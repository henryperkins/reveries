/* Browser stub: always reports "not available". Only the methods that are
   referenced from the client-side code are included. */

import type { EffortType, Citation } from '../types';

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
  static isAvailable(): boolean {
    return false;
  }

  static getInstance(): AzureOpenAIService {
    throw new Error('AzureOpenAIService is not available in the browser.');
  }

  /* eslint-disable @typescript-eslint/no-empty-function */
  private constructor() {}

  async generateResponse(
    prompt: string,
    effort?: EffortType,
    useReasoningEffort?: boolean,
    temperature?: number,
    maxTokens?: number
  ): Promise<AzureOpenAIResponse> {
    throw new Error('AzureOpenAIService is not available in the browser.');
  }

  async generateText(
    prompt: string,
    effort?: EffortType
  ): Promise<AzureOpenAIResponse> {
    throw new Error('AzureOpenAIService is not available in the browser.');
  }

  async streamResponse(
    prompt: string,
    effort: EffortType,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    throw new Error('AzureOpenAIService is not available in the browser.');
  }
  /* eslint-enable */
}
