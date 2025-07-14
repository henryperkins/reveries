import React from 'react';

// Corrected model identifiers based on latest guidelines
export const GENAI_MODEL_FLASH = 'gemini-2.5-flash';
export const GROK_MODEL_4 = 'grok-4';
export const AZURE_O3_MODEL = 'o3-mini'; // Azure OpenAI o3 model

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

export interface ResearchStep {
  id: string;
  type: ResearchStepType;
  title: string;
  content: string | React.ReactNode;
  icon: React.ElementType; // For SVG components
  timestamp?: string;
  isSpinning?: boolean;
  sources?: { name: string; url?: string }[];
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

// Updated modelOptions to include Azure O3
export const modelOptions: { value: ModelType; label: string }[] = [
  { value: GENAI_MODEL_FLASH, label: 'Model: 2.5 Flash' },
  { value: GROK_MODEL_4, label: 'Model: Grok-4' },
  { value: AZURE_O3_MODEL, label: 'Model: Azure O3' },
];

export interface ResearchDataState {
  userQuery: string;
  generatedQueries: string[];
  researchFindings: string;
  researchSources: { name: string; url?: string }[];
  reflectionText: string;
  finalAnswerText: string;
  finalAnswerSources?: { name: string; url?: string }[];
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
  sources?: { name: string; url?: string }[];
}

export interface ResearchState {
  query: string;
  queryType?: QueryType;
  searchResults: { name: string; url?: string }[];
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

export type HouseParadigm = 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin';

export interface EnhancedResearchResults {
  synthesis: string;
  sources: { name: string; url?: string }[];
  queryType?: QueryType;
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
    paradigm?: HouseParadigm;
    focusAreas?: string[];
    recommendedTools?: string[];
    toolsEnabled?: boolean;
    toolEnhanced?: boolean;
  };
}
