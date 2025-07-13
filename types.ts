import React from 'react';

// Corrected model identifiers based on latest guidelines
export const GENAI_MODEL_FLASH = 'gemini-2.5-flash'; 
export const GROK_MODEL_4 = 'grok-4';

export enum ResearchStepType {
  USER_QUERY = 'USER_QUERY',
  GENERATING_QUERIES = 'GENERATING_QUERIES',
  WEB_RESEARCH = 'WEB_RESEARCH',
  REFLECTION = 'REFLECTION',
  SEARCHING_FINAL_ANSWER = 'SEARCHING_FINAL_ANSWER',
  FINAL_ANSWER = 'FINAL_ANSWER',
  ERROR = 'ERROR'
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

// Updated ModelType to only include the allowed model
export type ModelType = typeof GENAI_MODEL_FLASH | typeof GROK_MODEL_4;


export const effortOptions: { value: EffortType; label: string }[] = [
  { value: EffortType.LOW, label: 'Effort: Low' },
  { value: EffortType.MEDIUM, label: 'Effort: Medium' },
  { value: EffortType.HIGH, label: 'Effort: High' },
];

// Updated modelOptions to only include the allowed model
export const modelOptions: { value: ModelType; label: string }[] = [
  { value: GENAI_MODEL_FLASH, label: 'Model: 2.5 Flash' },
  { value: GROK_MODEL_4, label: 'Model: Grok-4' },
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