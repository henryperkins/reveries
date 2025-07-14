/* Browser stub: always reports "not available". Only the methods that are
   referenced from the client-side code are included. */

import { EffortType, Citation } from '../types';
import { APIError } from './errorHandler';

export interface AzureOpenAIResponse {
  text: string;
  sources?: Citation[];
  reasoningEffort?: string;
  reasoningContent?: string;
}

export class AzureOpenAIService {
  private static instance: AzureOpenAIService;

  private constructor() {
    throw new APIError(
      'Azure OpenAI is not available in browser builds. Please use the server API.',
      'NOT_AVAILABLE',
      false
    );
  }

  public static getInstance(): AzureOpenAIService {
    throw new APIError(
      'Azure OpenAI is not available in browser builds. Please use the server API.',
      'NOT_AVAILABLE',
      false
    );
  }

  public static isAvailable(): boolean {
    return false;
  }

  async generateResponse(): Promise<AzureOpenAIResponse> {
    throw new APIError(
      'Azure OpenAI is not available in browser builds',
      'NOT_AVAILABLE',
      false
    );
  }

  async generateText(): Promise<AzureOpenAIResponse> {
    throw new APIError(
      'Azure OpenAI is not available in browser builds',
      'NOT_AVAILABLE',
      false
    );
  }

  async generateResponseWithTools(): Promise<AzureOpenAIResponse> {
    throw new APIError(
      'Azure OpenAI is not available in browser builds',
      'NOT_AVAILABLE',
      false
    );
  }

  async streamResponse(): Promise<void> {
    throw new APIError(
      'Azure OpenAI is not available in browser builds',
      'NOT_AVAILABLE',
      false
    );
  }
}
