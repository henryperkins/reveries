// src/services/contextLayers/types.ts

import { ModelType, EffortType, Citation, HostParadigm, ResearchPhase, ContextLayer, ContextDensity, ParadigmProbabilities, ResearchResponse } from "@/types";

/**
 * Context passed to executeContextLayer method
 */
export interface ContextLayerExecutionContext {
  query: string;
  paradigm: HostParadigm;
  density: number;
  layerResults?: Record<string, any>;
  sources?: Citation[];
  content?: string;
  model: ModelType;
  effort: EffortType;
  onProgress?: (message: string) => void;
}

/**
 * Result from a context layer execution
 */
export interface ContextLayerResult {
  // Common fields
  error?: string;
  layer?: ContextLayer;
  paradigm?: HostParadigm;
  fallback?: any;

  // Write layer results
  written?: boolean;
  timestamp?: number;

  // Select layer results
  selectedSources?: Citation[];
  recommendedTools?: string[];

  // Compress layer results
  compressed?: string;
  compressedContent?: string;
  targetTokens?: number;

  // Isolate layer results
  taskId?: string;
  isolatedResult?: any;
  status?:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "timeout"
    | "direct_execution";
  message?: string;
}

/**
 * Enhanced metadata for research responses
 */
export interface EnhancedResearchMetadata {
  phase?: ResearchPhase;
  onProgress?: (message: string) => void;
  contextLayers?: {
    executed: ContextLayer[];
    results: Record<string, ContextLayerResult>;
    paradigm: HostParadigm;
    density: ContextDensity;
  };
}

/**
 * Extended research response with context layer info
 */
export interface ExtendedResearchResponse extends ResearchResponse {
  paradigmProbabilities?: ParadigmProbabilities;
  contextDensity?: ContextDensity;
  contextLayers?: ContextLayer[];
  layerResults?: Record<string, ContextLayerResult>;
}

/**
 * Fallback configurations for each layer type
 */
export interface LayerFallbackConfig {
  write: {
    written: boolean;
    reason: string;
  };
  select: {
    selectedSources: Citation[];
    recommendedTools: string[];
  };
  compress: {
    compressed: null;
    reason: string;
  };
  isolate: {
    isolatedResult: null;
    reason: string;
  };
}

/**
 * Scheduling task configuration
 */
export interface SchedulingTaskConfig {
  taskId: string;
  cost: number;
  paradigm: HostParadigm;
  priority: number;
  timeout?: number;
}

/**
 * Layer execution options
 */
export interface LayerExecutionOptions {
  useScheduling?: boolean;
  schedulingPriority?: number;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}
