import React from 'react';

// Corrected model identifiers based on latest guidelines
export const GENAI_MODEL_FLASH = 'gemini-2.5-flash';
export const GROK_MODEL_4 = 'grok-4';
export const AZURE_O3_MODEL = 'o3'; // Azure OpenAI o3 model

export enum ResearchStepType {
  USER_QUERY = 'USER_QUERY',
  GENERATING_QUERIES = 'GENERATING_QUERIES',
  WEB_RESEARCH = 'WEB_RESEARCH',
  REFLECTION = 'REFLECTION',
  SEARCHING_FINAL_ANSWER = 'SEARCHING_FINAL_ANSWER',
  FINAL_ANSWER = 'FINAL_ANSWER',
  ERROR = 'ERROR',
  ANALYTICS = 'ANALYTICS'
}

export interface Citation {
  url: string;
  title?: string;
  authors?: string[];
  year?: number;
  published?: string;
  accessed?: string;
  snippet?: string;
}

export interface ResearchStep {
  id: string;
  type: ResearchStepType;
  title: string;
  content: string | React.ReactNode;
  icon: React.ElementType; // For SVG components
  timestamp?: string;
  isSpinning?: boolean;
  sources?: Citation[];
}

export enum EffortType {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

// Updated ModelType to include Azure O3
export type ModelType = typeof GENAI_MODEL_FLASH | typeof GROK_MODEL_4 | typeof AZURE_O3_MODEL;


export const effortOptions: { value: EffortType; label: string }[] = [
  { value: EffortType.LOW, label: 'Effort: Low' },
  { value: EffortType.MEDIUM, label: 'Effort: Medium' },
  { value: EffortType.HIGH, label: 'Effort: High' },
];

// Updated modelOptions to include Azure O3 with availability info
export const modelOptions: { value: ModelType; label: string; requiresKey?: boolean }[] = [
  { value: GENAI_MODEL_FLASH, label: 'Model: Gemini 2.5 Flash' },
  { value: GROK_MODEL_4, label: 'Model: Grok-4', requiresKey: true },
  { value: AZURE_O3_MODEL, label: 'Model: Azure o3', requiresKey: true },
];

export interface ResearchDataState {
  userQuery: string;
  generatedQueries: string[];
  researchFindings: string;
  researchSources: Citation[];
  reflectionText: string;
  finalAnswerText: string;
  finalAnswerSources?: Citation[];
  error?: string | null;
}

// Helper to represent the structure of the config passed to service methods
export interface ServiceCallConfig {
  selectedModel: ModelType;
  selectedEffort: EffortType;
  shouldUseSearchInFinalAnswer: boolean;
}

// Enhanced research types for LangGraph patterns
export type QueryType = 'factual' | 'analytical' | 'comparative' | 'exploratory';

export interface ResearchSection {
  topic: string;
  description: string;
  research?: string;
  sources?: Citation[];
}

export interface ResearchState {
  query: string;
  queryType?: QueryType;
  searchResults: Citation[];
  synthesis: string;
  evaluation: {
    quality: 'good' | 'needs_improvement';
    feedback?: string;
    completeness?: number; // 0-1 score
    accuracy?: number; // 0-1 score
    clarity?: number; // 0-1 score
  };
  sections?: ResearchSection[];
  refinementCount: number;
}

export interface FunctionCallHistory {
  function: string;
  arguments: Record<string, any>;
  result: any;
  timestamp: number;
}

export type HostParadigm = 'dolores' | 'teddy' | 'bernard' | 'maeve';

/**
 * Hogwarts-style research paradigms introduced by the “Four Houses of Inquiry”
 * infographic. They are conceptually isomorphic to the Westworld host
 * paradigms and therefore can be derived via a 1-to-1 mapping.
 */
export type HouseParadigm = 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin';

/**
 * Arnold's Pyramid of Consciousness layers, used for deeper cognitive analysis.
 */
export type PyramidLayer = 'memory' | 'improvisation' | 'self_interest' | 'suffering';

/**
 * Research phases for context density adaptation
 */
export type ResearchPhase = 'problem_definition' | 'data_collection' | 'analysis' | 'synthesis' | 'action';

/**
 * Context window density metrics for each research phase and host paradigm.
 * Values are expressed as percentage (0-100) to mirror the infographic's charts.
 */
export interface ContextWindowMetrics {
  phase: ResearchPhase;
  dolores: number;
  maeve: number;
  bernard: number;
  teddy: number;
}

export interface EnhancedResearchResults {
  synthesis: string;
  sources: Citation[];
  queryType?: QueryType;
  hostParadigm?: HostParadigm;
  houseParadigm?: HouseParadigm;
  sections?: ResearchSection[];
  evaluationMetadata?: ResearchState['evaluation'];
  refinementCount?: number;
  confidenceScore?: number;
  toolsUsed?: string[];
  adaptiveMetadata?: {
    cacheHit?: boolean;
    learnedPatterns?: boolean;
    processingTime?: number;
    complexityScore?: number;
    selfHealed?: boolean;
    healingStrategy?: 'broader_search' | 'enhanced_detail' | 'alternative_model';
    paradigm?: HostParadigm;
    focusAreas?: string[];
    recommendedTools?: string[];
    toolsEnabled?: boolean;
    toolEnhanced?: boolean;
    pyramidLayer?: PyramidLayer;
    contextDensity?: number;
    dominantParadigm?: HostParadigm;

    /* Hogwarts house representation */
    dominantHouse?: HouseParadigm;

    phase?: ResearchPhase;
    pyramidConfidence?: number;
    /* densities keyed by host paradigm */
    densities?: Record<HostParadigm, number>;
  };
}

// Add Azure OpenAI specific types
export interface O3ChatCompletionRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxCompletionTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  stream?: boolean;
}

export interface O3ChatCompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    completion_tokens_details?: {
      reasoning_tokens: number;
    };
  };
  finishReason: string | null;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'gemini' | 'grok';
  capabilities: string[];
  maxTokens: number;
  contextWindow: number;
  available?: boolean;
}

export interface ResearchAgentConfig {
  selectedModel: ModelType;
  fallbackModels?: ModelType[];
  maxRetries?: number;
  timeoutMs?: number;
}

export interface ResearchMetadata {
  model: ModelType;
  effort: EffortType;
  processingTime?: number;
  sourcesCount?: number;
  queryType?: QueryType;
  hostParadigm?: HostParadigm;
  pyramidLayer?: PyramidLayer;
  contextDensity?: number;
  phase?: ResearchPhase;
  confidenceScore?: number;
  selfHealed?: boolean;
  healingStrategy?: string;
  toolsUsed?: string[];
  recommendedTools?: string[];
  functionCalls?: Array<{
    name: string;
    arguments: any;
    result: any;
    timestamp: number;
  }>;
  errorDetails?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
  searchQueries?: string[];
  sections?: Array<{
    topic: string;
    description: string;
    research?: string;
    sources?: Citation[];
  }>;
  evaluationMetadata?: {
    completeness?: number;
    accuracy?: number;
    clarity?: number;
    quality?: 'good' | 'needs_improvement';
    feedback?: string;
  };
}

export type EdgeType = 'sequential' | 'dependency' | 'error';

export interface ExportedResearchData {
  version: string;
  exportDate: string;
  query: string;
  summary: {
    totalSteps: number;
    totalSources: number;
    totalDuration: number;
    successRate: number;
    modelsUsed: ModelType[];
    errorCount: number;
  };
  metadata: {
    sessionId?: string;
    startTime: string;
    endTime: string;
    primaryModel: ModelType;
    primaryEffort: EffortType;
    queryType?: QueryType;
    hostParadigm?: HostParadigm;
    confidenceScore?: number;
  };
  steps: Array<{
    id: string;
    type: ResearchStepType;
    title: string;
    content: string;
    timestamp: string;
    duration?: number;
    sources?: Citation[];
    metadata?: ResearchMetadata;
  }>;
  graph: {
    nodes: Array<{
      id: string;
      data: ResearchStep;
      metadata?: ResearchMetadata;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: EdgeType;
    }>;
  };
  sources: {
    all: Citation[];
    byStep: Record<string, Citation[]>;
    byDomain: Record<string, Citation[]>;
  };
  functionCalls?: Array<{
    step: string;
    calls: Array<{
      name: string;
      arguments: any;
      result: any;
      timestamp: number;
    }>;
  }>;
}
