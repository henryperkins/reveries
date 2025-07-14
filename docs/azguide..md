# Azure OpenAI o3 Integration Guide for Reveries

## Current Implementation Status

Based on the described file structure, the Reveries application appears to have **partial Azure OpenAI implementation** with the following components:

### Already Implemented
- **Basic Azure OpenAI service structure** (`services/azureOpenAIService.ts`)
- **Browser compatibility stub** (`services/azureOpenAIStub.ts`)
- **Environment configuration** (`.env` with Azure OpenAI keys)
- **Vite configuration** for environment variable handling
- **Research agent orchestration** (`services/researchAgentService.ts`)
- **TypeScript definitions** (`types.ts`)
- **Model selection UI** (`components/Controls.tsx`)
- **Application constants** (`constants.ts`)

### Missing Components
- **o3 model-specific implementation** (requires 2025-04-01-preview API version)
- **Reasoning effort configuration** (low/medium/high settings)
- **Streaming response handling** for o3 model
- **Fallback mechanisms** between Gemini, Grok, and Azure OpenAI
- **Production-ready security patterns**
- **Error handling for o3-specific limitations**

## Implementation Guide

### 1. Azure OpenAI Service Enhancement

**Update `services/azureOpenAIService.ts`:**

```typescript
import { AzureOpenAI } from 'openai';
import { AzureOpenAIConfig, O3ChatCompletionRequest, O3ChatCompletionResponse } from '../types';

export class AzureOpenAIService {
  private client: AzureOpenAI;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    this.client = new AzureOpenAI({
      azure_endpoint: config.endpoint,
      api_key: config.apiKey,
      api_version: '2025-04-01-preview', // Required for o3 models
    });
  }

  async generateResponse(request: O3ChatCompletionRequest): Promise<O3ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages: request.messages,
        max_completion_tokens: request.maxCompletionTokens || 5000,
        reasoning_effort: request.reasoningEffort || 'medium',
        stream: false,
      });

      return {
        id: response.id,
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason,
      };
    } catch (error) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Azure OpenAI API error: ${error.message}`);
    }
  }

  async streamResponse(request: O3ChatCompletionRequest): Promise<AsyncGenerator<string>> {
    const stream = await this.client.chat.completions.create({
      model: this.config.deploymentName,
      messages: request.messages,
      max_completion_tokens: request.maxCompletionTokens || 5000,
      reasoning_effort: request.reasoningEffort || 'medium',
      stream: true,
    });

    return this.processStream(stream);
  }

  private async* processStream(stream: any): AsyncGenerator<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }
}
```

### 2. TypeScript Definitions Update

**Enhance `types.ts`:**

```typescript
// Azure OpenAI o3 specific types
export interface O3ChatCompletionRequest {
  messages: ChatMessage[];
  maxCompletionTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  stream?: boolean;
}

export interface O3ChatCompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    completion_tokens_details?: {
      reasoning_tokens: number;
    };
  };
  finishReason: string | null;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'gemini' | 'grok';
  capabilities: string[];
  maxTokens: number;
  contextWindow: number;
}

export interface ResearchAgentConfig {
  selectedModel: AIModel;
  fallbackModels: AIModel[];
  maxRetries: number;
  timeoutMs: number;
}
```

### 3. Research Agent Service Integration

**Update `services/researchAgentService.ts`:**

```typescript
import { AzureOpenAIService } from './azureOpenAIService';
import { GeminiService } from './geminiService';
import { GrokService } from './grokService';

export class ResearchAgentService {
  private azureOpenAI: AzureOpenAIService;
  private gemini: GeminiService;
  private grok: GrokService;
  private currentModel: AIModel;

  constructor(config: ResearchAgentConfig) {
    this.azureOpenAI = new AzureOpenAIService({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
    });

    this.gemini = new GeminiService();
    this.grok = new GrokService();
    this.currentModel = config.selectedModel;
  }

  async generateResearchResponse(prompt: string): Promise<string> {
    const fallbackChain = this.buildFallbackChain();

    for (const service of fallbackChain) {
      try {
        return await this.executeWithService(service, prompt);
      } catch (error) {
        console.warn(`${service.name} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All AI services failed');
  }

  private buildFallbackChain(): Array<{name: string, service: any}> {
    const services = [
      { name: 'azure-o3', service: this.azureOpenAI },
      { name: 'gemini', service: this.gemini },
      { name: 'grok', service: this.grok },
    ];

    // Put current model first
    return services.sort((a, b) =>
      a.name === this.currentModel.id ? -1 :
      b.name === this.currentModel.id ? 1 : 0
    );
  }

  private async executeWithService(serviceConfig: any, prompt: string): Promise<string> {
    switch (serviceConfig.name) {
      case 'azure-o3':
        const response = await serviceConfig.service.generateResponse({
          messages: [{ role: 'user', content: prompt }],
          reasoningEffort: 'high', // Use high reasoning for research tasks
          maxCompletionTokens: 8000,
        });
        return response.content;

      case 'gemini':
        return await serviceConfig.service.generateText(prompt);

      case 'grok':
        return await serviceConfig.service.generateText(prompt);

      default:
        throw new Error(`Unknown service: ${serviceConfig.name}`);
    }
  }
}
```

### 4. UI Controls Enhancement

**Update `components/Controls.tsx`:**

```typescript
import React, { useState } from 'react';
import { AIModel } from '../types';

interface ControlsProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  onReasoningEffortChange: (effort: 'low' | 'medium' | 'high') => void;
  reasoningEffort: 'low' | 'medium' | 'high';
}

export const Controls: React.FC<ControlsProps> = ({
  selectedModel,
  onModelChange,
  onReasoningEffortChange,
  reasoningEffort,
}) => {
  const models: AIModel[] = [
    {
      id: 'azure-o3',
      name: 'Azure OpenAI o3',
      provider: 'azure',
      capabilities: ['reasoning', 'analysis', 'code'],
      maxTokens: 100000,
      contextWindow: 200000,
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'gemini',
      capabilities: ['multimodal', 'reasoning'],
      maxTokens: 32000,
      contextWindow: 128000,
    },
    {
      id: 'grok-1',
      name: 'Grok 1',
      provider: 'grok',
      capabilities: ['reasoning', 'current-events'],
      maxTokens: 25000,
      contextWindow: 100000,
    },
  ];

  return (
    <div className="controls-westworld">
      <div className="model-selector">
        <h3>Neural Architecture</h3>
        {models.map((model) => (
          <button
            key={model.id}
            className={`model-option ${selectedModel.id === model.id ? 'selected' : ''}`}
            onClick={() => onModelChange(model)}
          >
            <span className="model-name">{model.name}</span>
            <span className="model-provider">{model.provider}</span>
            <span className="model-capabilities">
              {model.capabilities.join(', ')}
            </span>
          </button>
        ))}
      </div>

      {selectedModel.provider === 'azure' && (
        <div className="reasoning-controls">
          <h3>Cognitive Load</h3>
          <div className="reasoning-options">
            {['low', 'medium', 'high'].map((effort) => (
              <button
                key={effort}
                className={`reasoning-option ${reasoningEffort === effort ? 'selected' : ''}`}
                onClick={() => onReasoningEffortChange(effort as any)}
              >
                {effort.charAt(0).toUpperCase() + effort.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5. Configuration Requirements

**Update `.env` file:**

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=your-o3-deployment
AZURE_OPENAI_API_VERSION=2025-04-01-preview

# Gemini Configuration
GEMINI_API_KEY=your-gemini-key

# Grok Configuration
GROK_API_KEY=your-grok-key

# Application Settings
DEFAULT_MODEL=azure-o3
ENABLE_FALLBACK=true
MAX_RETRIES=3
REQUEST_TIMEOUT=30000
```

**Update `constants.ts`:**

```typescript
export const AI_MODELS = {
  AZURE_O3: 'azure-o3',
  GEMINI_PRO: 'gemini-pro',
  GROK_1: 'grok-1',
} as const;

export const REASONING_EFFORTS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const MODEL_CAPABILITIES = {
  REASONING: 'reasoning',
  ANALYSIS: 'analysis',
  CODE: 'code',
  MULTIMODAL: 'multimodal',
  CURRENT_EVENTS: 'current-events',
} as const;

export const WESTWORLD_THEME = {
  PRIMARY_COLOR: '#D4AF37',
  SECONDARY_COLOR: '#8B4513',
  ACCENT_COLOR: '#FF6B35',
  BACKGROUND_COLOR: '#1A1A1A',
} as const;
```

### 6. Security Best Practices

**Server-side proxy implementation:**

```typescript
// pages/api/research.ts (Next.js example)
import { NextApiRequest, NextApiResponse } from 'next';
import { ResearchAgentService } from '../../services/researchAgentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model, reasoningEffort } = req.body;

  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  try {
    const researchAgent = new ResearchAgentService({
      selectedModel: model,
      fallbackModels: [],
      maxRetries: 3,
      timeoutMs: 30000,
    });

    const response = await researchAgent.generateResearchResponse(prompt);

    res.status(200).json({ response });
  } catch (error) {
    console.error('Research API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 7. Error Handling and Fallback

**Error handling hook:**

```typescript
import { useState, useCallback } from 'react';

export const useAIErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((error: any, context: string) => {
    let userMessage = 'An error occurred. Please try again.';

    if (error.message.includes('Rate limit')) {
      userMessage = 'System is at capacity. Please wait a moment and try again.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('All AI services failed')) {
      userMessage = 'AI systems are temporarily unavailable. Please try again later.';
    }

    setError(userMessage);

    // Log detailed error for debugging
    console.error(`Error in ${context}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, isRetrying, handleError, clearError, setIsRetrying };
};
```

### 8. Testing Strategy

**Service testing:**

```typescript
// __tests__/services/azureOpenAIService.test.ts
import { AzureOpenAIService } from '../../services/azureOpenAIService';

describe('AzureOpenAIService', () => {
  const mockConfig = {
    endpoint: 'https://test.openai.azure.com',
    apiKey: 'test-key',
    deploymentName: 'test-deployment',
  };

  beforeEach(() => {
    // Mock Azure OpenAI client
    jest.clearAllMocks();
  });

  test('generates response successfully', async () => {
    const service = new AzureOpenAIService(mockConfig);
    const request = {
      messages: [{ role: 'user', content: 'Hello' }],
      reasoningEffort: 'medium' as const,
    };

    const response = await service.generateResponse(request);

    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('usage');
  });

  test('handles rate limiting gracefully', async () => {
    // Mock 429 response
    const service = new AzureOpenAIService(mockConfig);

    await expect(service.generateResponse({
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Rate limit exceeded');
  });
});
```

### 9. Performance Optimization

**Streaming response hook:**

```typescript
import { useState, useCallback } from 'react';

export const useStreamingResponse = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const streamResponse = useCallback(async (prompt: string, model: string) => {
    setIsLoading(true);
    setContent('');

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulated += chunk;
        setContent(accumulated);
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { content, isLoading, streamResponse };
};
```

### 10. Deployment Considerations

**Vite configuration for production:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
});
```

## Summary of Remaining Tasks

1. **Implement o3-specific API calls** with proper error handling
2. **Add reasoning effort controls** to the UI
3. **Set up server-side proxy** for secure API key handling
4. **Implement comprehensive fallback chain** across all models
5. **Add streaming support** for real-time responses
6. **Deploy with proper security configurations**
7. **Set up monitoring and logging** for production use
8. **Add comprehensive tests** for all AI integrations
9. **Implement performance optimizations** for large responses
10. **Configure proper CORS and security headers**

This implementation guide provides a complete roadmap for integrating Azure OpenAI o3 as a first-class option in the Reveries application, maintaining the Westworld theme while ensuring enterprise-grade security and performance.
