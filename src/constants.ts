/// <reference types="vite/client" />
import { EffortType, ModelType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from './types';
import { getEnv } from './utils/getEnv';

// Check if Grok API key is available
const isGrokAvailable = () => {
  return !!getEnv('VITE_XAI_API_KEY', 'XAI_API_KEY');
};

// Check if Gemini API key is available
const isGeminiAvailable = () => {
  return !!getEnv('VITE_GEMINI_API_KEY', 'GEMINI_API_KEY');
};

// Check if Azure OpenAI is available - updated to check for client-side env vars
const isAzureOpenAIAvailable = () => {
  const apiKey = getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY');
  const endpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT');
  return !!(apiKey && endpoint);
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

// Comprehensive timeout configurations for all operations
export const TIMEOUTS = {
  // Progress state machine timeouts
  PROGRESS_ANALYSIS: 30000,        // 30s for query analysis
  PROGRESS_ROUTING: 15000,         // 15s for paradigm routing
  PROGRESS_RESEARCH: 60000,        // 60s for web research
  PROGRESS_EVALUATION: 30000,      // 30s for quality evaluation
  PROGRESS_SYNTHESIS: 30000,       // 30s for synthesis
  PROGRESS_RESET: 1000,            // 1s progress reset delay
  
  // Global research timeouts
  GLOBAL_RESEARCH: 600000,         // 10min global research timeout
  TOOL_FALLBACK: 10000,            // 10s tool fallback timeout
  
  // Research agent adaptive timeouts (base values)
  RESEARCH_DISCOVERY: 120000,      // 2min discovery phase
  RESEARCH_EXPLORATION: 180000,    // 3min exploration phase
  RESEARCH_SYNTHESIS: 240000,      // 4min synthesis phase  
  RESEARCH_VALIDATION: 150000,     // 2.5min validation phase
  RESEARCH_MIN: 30000,             // 30s minimum research timeout
  RESEARCH_MAX: 480000,            // 8min maximum research timeout
  RESEARCH_EXTENSION_MAX: 120000,  // 2min max timeout extension
  
  // Azure OpenAI service timeouts
  AZURE_BACKGROUND_POLLING: 600000, // 10min background task polling
  AZURE_TOOL_BASE: 30000,          // 30s base tool timeout
  AZURE_TOOL_WEB_SEARCH: 20000,    // 20s web search
  AZURE_TOOL_ACADEMIC: 25000,      // 25s academic papers
  AZURE_TOOL_STATISTICS: 15000,    // 15s analyze statistics
  AZURE_TOOL_KNOWLEDGE_GRAPH: 45000, // 45s knowledge graph
  AZURE_TOOL_VISUALIZATION: 20000, // 20s visualization
  
  // Context layer timeouts  
  CONTEXT_SANDBOX_DEFAULT: 30000,  // 30s default sandbox timeout
  CONTEXT_DOLORES: 15000,          // 15s action-oriented (Dolores)
  CONTEXT_TEDDY: 45000,            // 45s comprehensive analysis (Teddy)
  CONTEXT_BERNARD: 60000,          // 60s deep analytical (Bernard)
  CONTEXT_MAEVE: 30000,            // 30s strategic optimization (Maeve)
  CONTEXT_WAIT_TASK: 30000,        // 30s wait for task completion
  
  // Search provider timeouts
  SEARCH_CACHE_TTL: 3600000,       // 1hr search cache timeout
  
  // Context layer TTLs
  SCRATCHPAD_TTL: 600000,          // 10min scratchpad TTL
  MEMORY_TTL: 86400000,            // 24hr memory TTL
  
  // Rate limiter defaults
  RATE_LIMIT_WAIT_MIN: 1000,       // 1s minimum wait time
  
  // Database retry delay
  DB_RETRY_DELAY: 1000,            // 1s database retry delay
  
  // Component timeouts
  ERROR_AUTO_RELOAD: 30000,        // 30s auto-reload on error
  PROMPT_DEBOUNCE: 300,            // 300ms prompt suggestion debounce
  HEALTH_CHECK_INTERVAL: 30000,    // 30s health check interval
  SYNC_STORAGE_INTERVAL: 10000,    // 10s storage sync interval
} as const;

// Feature flag for refactored ResearchAgentService
export const USE_REFACTORED_RESEARCH_SERVICE = (() => {
  try {
    // Check both client and server environments
    const clientFlag = import.meta.env.VITE_USE_REFACTORED_RESEARCH === 'true';
    const serverFlag = typeof process !== 'undefined' && process.env?.USE_REFACTORED_RESEARCH === 'true';
    return clientFlag || serverFlag;
  } catch {
    return false; // Default to old implementation
  }
})();
