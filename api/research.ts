// import { AzureOpenAIService } from '../src/services/azureOpenAIService';
import { ResearchAgentService } from '../src/services';
import { ModelType, EffortType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from '../src/types';

export interface ResearchRequest {
  prompt: string;
  model: ModelType;
  effort: EffortType;
  stream?: boolean;
}

export interface ResearchResponse {
  text: string;
  sources?: { name: string; url?: string }[];
  metadata?: {
    model: string;
    reasoningEffort?: string;
    processingTime: number;
  };
}

export async function handleResearchRequest(req: ResearchRequest): Promise<ResearchResponse> {
  const startTime = Date.now();

  // Validate request
  if (!req.prompt || typeof req.prompt !== 'string') {
    throw new Error('Invalid prompt');
  }

  const validModels = [GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL];
  if (!req.model || !validModels.includes(req.model)) {
    throw new Error(`Invalid model. Valid models: ${validModels.join(', ')}`);
  }

  try {
    const researchAgent = ResearchAgentService.getInstance();
    const result = await researchAgent.generateText(req.prompt, req.model, req.effort);

    return {
      text: result.text,
      sources: result.sources,
      metadata: {
        model: req.model,
        reasoningEffort: req.model === AZURE_O3_MODEL ? req.effort.toLowerCase() : undefined,
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error('Research API error:', error);
    if (error instanceof Error) {
      throw new Error(`Research failed: ${error.message}`);
    }
    throw new Error('Unknown research error occurred');
  }
}

// Example Express/Fastify handler
export function createResearchHandler() {
  return async (req: { body: ResearchRequest }, res: { status: (code: number) => { json: (data: unknown) => void } }) => {
    try {
      const result = await handleResearchRequest(req.body);
      res.status(200).json(result);
    } catch (error: unknown) {
      const errorObj = error as { message?: string; code?: string };
      res.status(500).json({
        error: errorObj.message || 'Internal server error',
        code: errorObj.code || 'UNKNOWN_ERROR'
      });
    }
  };
}
