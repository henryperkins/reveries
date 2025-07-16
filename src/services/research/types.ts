/**
 * Research-specific types and interfaces
 * Extracted from ResearchAgentService for better modularity
 */

import { Citation, QueryType, HostParadigm, ResearchPhase, ModelType, EffortType } from '../../types';

export interface ResearchMemoryEntry {
  queries: string[];
  patterns: QueryType[];
  timestamp: number;
}

export interface ResearchCacheEntry {
  result: EnhancedResearchResults;
  timestamp: number;
}

export interface EvaluationMetadata {
  completeness?: number;
  accuracy?: number;
  clarity?: number;
  overallScore?: number;
  feedback?: string;
}

export interface AdaptiveMetadata {
  cacheHit?: boolean;
  learnedPatterns?: boolean;
  processingTime?: number;
  complexityScore?: number;
  selfHealed?: boolean;
  healingStrategy?: 'dolores_action_expansion' | 'teddy_comprehensive_expansion' | 'bernard_analytical_deepening';
  paradigm?: HostParadigm;
  focusAreas?: string[];
  toolsUsed?: string[];
  contextLayers?: {
    executed: string[];
    results: Record<string, any>;
  };
}

export interface ResearchSection {
  topic: string;
  description: string;
  findings: string;
  sources: Citation[];
}

export interface EnhancedResearchResults {
  synthesis: string;
  sources: Citation[];
  queryType?: QueryType;
  hostParadigm?: HostParadigm | null;
  sections?: ResearchSection[];
  evaluationMetadata?: EvaluationMetadata;
  refinementCount?: number;
  confidenceScore?: number;
  adaptiveMetadata?: AdaptiveMetadata;
}

export interface ResearchState {
  query: string;
  synthesis: string;
  searchResults: Citation[];
  evaluation: { quality: 'excellent' | 'good' | 'needs_improvement' };
  refinementCount: number;
}

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
