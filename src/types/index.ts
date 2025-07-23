/**
 * Central type definitions for the Reverie Engine
 * This file consolidates and re-exports all types from across the codebase
 */

// Core types from src/types.ts
export {
  // Model constants
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL,
  
  // Enums
  ResearchStepType,
  EffortType,
  
  // Constants
  effortOptions,
  modelOptions,
} from '../types';

export type {
  // Core interfaces
  Citation,
  ResearchSource,
  ResearchParadigm,
  ResearchStep,
  ResearchDataState,
  ServiceCallConfig,
  ResearchSection,
  ResearchState,
  FunctionCallHistory,
  ResearchResponse,
  ContextDensity,
  ContextWindowMetrics,
  EnhancedResearchResults,
  ResponsesRequest,
  ResponsesResponse,
  O3ChatCompletionRequest,
  O3ChatCompletionResponse,
  AIModel,
  ParadigmProbabilities,
  ResearchAgentConfig,
  ResearchMetadata,
  ExportedResearchData,
  
  // Type aliases
  ModelType,
  QueryType,
  HostParadigm,
  HouseParadigm,
  PyramidLayer,
  ResearchPhase,
  ResearchModel,
  ContextLayer,
  EdgeType,
} from '../types';

export { ResearchGraphManager } from '../types';

// Theme types from src/theme/types.ts
export type {
  ThemeMode,
  UnifiedTheme,
  ThemeContextType,
  ParadigmTheme,
} from '../theme/types';

export { PARADIGM_COLORS } from '../theme/types';

// Component types from src/components/types.ts
export {
  GraphError,
} from '../components/types';

// FunctionCallDock types from src/components/FunctionCallDock/types.ts
export type {
  LiveFunctionCall,
  FunctionCall,
} from '../components/FunctionCallDock/types';

// Context layer types from src/services/contextLayers/types.ts
export type {
  ContextLayerExecutionContext,
  ContextLayerResult,
  EnhancedResearchMetadata,
  ExtendedResearchResponse,
  LayerFallbackConfig,
  SchedulingTaskConfig,
  LayerExecutionOptions,
} from '../services/contextLayers/types';

// Research service types from src/services/research/types.ts
export type {
  ProviderResponse,
  ResearchMemoryEntry,
  CachedResult,
  FallbackContext,
  HealingStrategy,
  LayerExecutionContext,
  ResearchConfig,
  WebResearchResult,
  ContextLayerContext,
  LayerResult,
  ParadigmResearchContext,
  EvaluationMetadata,
} from '../services/research/types';

// Import types needed for utility functions
import { GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL, type HostParadigm, type HouseParadigm, type ResearchPhase, type ContextLayer, type ModelType } from '../types';

// Type guards and utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ValueOf<T> = T[keyof T];

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// Utility function to check if a value is a valid HostParadigm
export function isHostParadigm(value: unknown): value is HostParadigm {
  return typeof value === 'string' && 
    ['dolores', 'teddy', 'bernard', 'maeve'].includes(value);
}

// Utility function to check if a value is a valid ResearchPhase
export function isResearchPhase(value: unknown): value is ResearchPhase {
  return typeof value === 'string' && 
    ['discovery', 'exploration', 'synthesis', 'validation'].includes(value);
}

// Utility function to check if a value is a valid ContextLayer
export function isContextLayer(value: unknown): value is ContextLayer {
  return typeof value === 'string' && 
    ['write', 'select', 'compress', 'isolate'].includes(value);
}

// Utility function to check if a value is a valid ModelType
export function isModelType(value: unknown): value is ModelType {
  return typeof value === 'string' && 
    [GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL].includes(value as ModelType);
}

// Paradigm to House mapping utility
export function paradigmToHouse(paradigm: HostParadigm): HouseParadigm {
  const mapping: Record<HostParadigm, HouseParadigm> = {
    dolores: 'gryffindor',
    teddy: 'hufflepuff',
    bernard: 'ravenclaw',
    maeve: 'slytherin',
  };
  return mapping[paradigm];
}

// House to Paradigm mapping utility
export function houseToParadigm(house: HouseParadigm): HostParadigm {
  const mapping: Record<HouseParadigm, HostParadigm> = {
    gryffindor: 'dolores',
    hufflepuff: 'teddy',
    ravenclaw: 'bernard',
    slytherin: 'maeve',
  };
  return mapping[house];
}