// Temporary type patches to resolve build issues
export type LayerResults = Record<string, unknown> & {
  select?: {
    recommendedTools?: string[];
    selectedSources?: unknown[]
  };
  isolate?: {
    taskId?: string;
  };
};

export type InitialContext = {
  research?: unknown;
  synthesis?: string;
  sources?: unknown[];
  query?: string;
  paradigm?: string;
  evaluation?: unknown;
};

export type AdaptiveMetadata = {
  cacheHit?: boolean;
  learnedPatterns?: boolean;
  processingTime?: number;
  complexityScore?: number;
  selfHealed?: boolean;
  healingStrategy?: string;
  paradigm?: string;
  focusAreas?: string[];
  recommendedTools?: string[];
  toolsEnabled?: boolean;
  toolEnhanced?: boolean;
  toolsUsed?: string[];
  layerSequence?: unknown[];
  pyramidLayer?: string;
  contextDensity?: number;
  dominantParadigm?: string;
  dominantHouse?: string;
  phase?: string;
  pyramidConfidence?: number;
  densities?: Record<string, number>;
  paradigmProbabilities?: Record<string, number>;
  contextLayers?: {
    executed: unknown[];
    results: Record<string, unknown>;
  };
  currentContextLayer?: string;
  layerOutputs?: Record<string, unknown>;
};
