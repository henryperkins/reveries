/**
 * Research-specific types and interfaces extracted from ResearchAgentService
 */

import { Citation, QueryType, HostParadigm, ModelType, EffortType, EnhancedResearchResults } from '@/types';

export interface ProviderResponse {
  text: string;
  sources?: Citation[];
}

export interface ResearchMemoryEntry {
  queries: string[];
  patterns: QueryType[];
  timestamp: number;
}

export interface CachedResult {
  result: EnhancedResearchResults;
  timestamp: number;
}

export interface FallbackContext {
  originalModel: ModelType;
  attemptedModels: Set<ModelType>;
  prompt: string;
  effort: EffortType;
}

export interface HealingStrategy {
  type: 'dolores_action_expansion' | 'teddy_comprehensive_expansion' | 'bernard_analytical_deepening' | 'maeve_strategic_optimization' | 'default_expansion';
  confidence: number;
}

export interface LayerExecutionContext {
  query: string;
  paradigm: HostParadigm;
  density: number;
  sources?: Citation[];
  content?: string;
  model: ModelType;
  effort: EffortType;
  onProgress?: (message: string) => void;
}

export interface ResearchConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  memoryTTL: number;
  maxFallbackAttempts: number;
  confidenceThreshold: number;
}

// Re-export commonly used types from main types file
export type {
  Citation,
  ResearchState,
  HostParadigm,
  ModelType,
  EffortType,
  QueryType,
  ResearchPhase,
  ContextLayer,
  ResearchSection,
  EnhancedResearchResults,
  ParadigmProbabilities
} from '@/types';

export interface WebResearchResult {
  aggregatedFindings: string;
  allSources: Citation[];
}

export interface ContextLayerContext {
  query: string;
  paradigm: HostParadigm;
  density: number;
  sources?: Citation[];
  content?: string;
  model: ModelType;
  effort: EffortType;
  onProgress?: (message: string) => void;
}

export interface LayerResult {
  selectedSources?: Citation[];
  recommendedTools?: string[];
  compressed?: string;
  taskId?: string;
}

export interface ResearchResponse {
  text: string;
  sources: Citation[];
}

export interface ParadigmResearchContext {
  query: string;
  model: ModelType;
  effort: EffortType;
  layerResults: Record<string, any> & {
    select?: { recommendedTools?: string[]; selectedSources?: unknown[] };
  };
  onProgress?: (message: string) => void;
}

// Re-export canonical ContextDensity from main types
export type { ContextDensity } from '@/types';

// ResearchSection is now imported from main types file

export interface EvaluationMetadata {
  quality: 'excellent' | 'good' | 'needs_improvement';
  confidence: number;
  refinementCount: number;
  timestamp: string;
  completeness: number;
  accuracy: number;
  clarity: number;
  feedback: string;
  overallScore: number;
}
