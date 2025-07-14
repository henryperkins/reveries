import { EffortType, ModelType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from './types';
import { AzureOpenAIService } from './services/azureOpenAIService';

// Check if Grok API key is available
const isGrokAvailable = () => {
  try {
    return !!(typeof process !== 'undefined' && process.env?.GROK_API_KEY);
  } catch {
    return false;
  }
};

// Check if Azure OpenAI is available
const isAzureOpenAIAvailable = () => {
  return AzureOpenAIService.isAvailable();
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
