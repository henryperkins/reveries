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

// Check if Gemini API key is available
const isGeminiAvailable = () => {
  try {
    return !!(import.meta.env.VITE_GEMINI_API_KEY ||
             (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY));
  } catch {
    return false;
  }
};

// Check if Azure OpenAI is available - updated to check for client-side env vars
const isAzureOpenAIAvailable = () => {
  try {
    // Check for environment variables in both client and server contexts
    const hasClientKey = !!(import.meta.env.VITE_AZURE_OPENAI_API_KEY &&
                           import.meta.env.VITE_AZURE_OPENAI_ENDPOINT);
    const hasServerKey = !!(typeof process !== 'undefined' &&
                           process.env?.AZURE_OPENAI_API_KEY &&
                           process.env?.AZURE_OPENAI_ENDPOINT);

    return hasClientKey || hasServerKey;
  } catch {
    return false;
  }
};

// Default model selection logic - fallback to Flash if no keys available
export const DEFAULT_MODEL: ModelType = (() => {
  if (isAzureOpenAIAvailable()) return AZURE_O3_MODEL;
  if (isGrokAvailable()) return GROK_MODEL_4;
  return GENAI_MODEL_FLASH; // Always available as fallback
})();

export const DEFAULT_EFFORT: EffortType = EffortType.MEDIUM;

/**
 * Default Context Window Density metrics adapted for Westworld host paradigms.
 * These values guide UI visualizations and agent heuristics for each research phase.
 */
import { ContextWindowMetrics, ResearchPhase } from './types';

export const DEFAULT_CONTEXT_WINDOW_METRICS: ContextWindowMetrics[] = [
  {
    phase: 'problem_definition' as ResearchPhase,
    dolores: 60,
    teddy: 80,
    bernard: 70,
    maeve: 85,
  },
  {
    phase: 'data_collection' as ResearchPhase,
    dolores: 70,
    teddy: 90,
    bernard: 85,
    maeve: 60,
  },
  {
    phase: 'analysis' as ResearchPhase,
    dolores: 50,
    teddy: 70,
    bernard: 95,
    maeve: 80,
  },
  {
    phase: 'synthesis' as ResearchPhase,
    dolores: 80,
    teddy: 85,
    bernard: 90,
    maeve: 70,
  },
  {
    phase: 'action' as ResearchPhase,
    dolores: 95,
    teddy: 75,
    bernard: 60,
    maeve: 90,
  },
];

// Export availability checks for UI
export const GEMINI_AVAILABLE = isGeminiAvailable();
export const GROK_AVAILABLE = isGrokAvailable();
export const AZURE_OPENAI_AVAILABLE = isAzureOpenAIAvailable();
