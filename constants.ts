/// <reference types="vite/client" />
import { EffortType, ModelType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from './types';

// Check if Grok API key is available
const isGrokAvailable = () => {
  try {
    return !!(import.meta.env.VITE_XAI_API_KEY ||
             (typeof process !== 'undefined' && process.env?.XAI_API_KEY));
  } catch {
    return false;
  }
};

// Check if Azure OpenAI is available - check for environment variables
const isAzureOpenAIAvailable = () => {
  try {
    // In production, this should be determined server-side
    if (typeof window !== 'undefined') {
      // Browser environment - Azure OpenAI is never available client-side
      return false;
    }

    // Server environment - check for API key
    return !!(import.meta.env.VITE_AZURE_OPENAI_API_KEY ||
             (typeof process !== 'undefined' && process.env?.AZURE_OPENAI_API_KEY));
  } catch {
    return false;
  }
};

// Default model selection logic
export const DEFAULT_MODEL: ModelType = (() => {
  if (isAzureOpenAIAvailable()) return AZURE_O3_MODEL;
  if (isGrokAvailable()) return GROK_MODEL_4;
  return GENAI_MODEL_FLASH;
})();

export const DEFAULT_EFFORT: EffortType = EffortType.MEDIUM;

/**
 * Default Context Window Density metrics inspired by the "Context Engineering Effectiveness" infographic.
 * These values can be tuned later but provide initial guidance for UI visualizations or agent heuristics.
 */
import { ContextWindowMetrics, ResearchPhase } from './types';

export const DEFAULT_CONTEXT_WINDOW_METRICS: ContextWindowMetrics[] = [
  {
    phase: 'problem_definition' as ResearchPhase,
    gryffindor: 60,
    hufflepuff: 80,
    ravenclaw: 70,
    slytherin: 85,
  },
  {
    phase: 'data_collection' as ResearchPhase,
    gryffindor: 70,
    hufflepuff: 90,
    ravenclaw: 85,
    slytherin: 60,
  },
  {
    phase: 'analysis' as ResearchPhase,
    gryffindor: 50,
    hufflepuff: 70,
    ravenclaw: 95,
    slytherin: 80,
  },
  {
    phase: 'synthesis' as ResearchPhase,
    gryffindor: 80,
    hufflepuff: 85,
    ravenclaw: 90,
    slytherin: 70,
  },
  {
    phase: 'action' as ResearchPhase,
    gryffindor: 95,
    hufflepuff: 75,
    ravenclaw: 60,
    slytherin: 90,
  },
];

// Export availability checks for UI
export const GROK_AVAILABLE = isGrokAvailable();
export const AZURE_OPENAI_AVAILABLE = isAzureOpenAIAvailable();
