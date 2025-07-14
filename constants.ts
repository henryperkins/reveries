import { EffortType, ModelType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from './types';

// Check if Grok API key is available
const isGrokAvailable = () => {
  try {
    return !!(import.meta.env.VITE_GROK_API_KEY || import.meta.env.VITE_XAI_API_KEY);
  } catch {
    return false;
  }
};

// Check if Azure OpenAI is available - always false in browser
const isAzureOpenAIAvailable = () => {
  return false; // Azure OpenAI is server-side only
};

// Default model selection logic
export const DEFAULT_MODEL: ModelType = (() => {
  if (isAzureOpenAIAvailable()) return AZURE_O3_MODEL;
  if (isGrokAvailable()) return GROK_MODEL_4;
  return GENAI_MODEL_FLASH;
})();

export const DEFAULT_EFFORT: EffortType = EffortType.MEDIUM;

// Export availability checks for UI
export const GROK_AVAILABLE = isGrokAvailable();
export const AZURE_OPENAI_AVAILABLE = isAzureOpenAIAvailable();
export const AZURE_OPENAI_AVAILABLE = isAzureOpenAIAvailable();
