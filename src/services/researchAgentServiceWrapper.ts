/**
 * ResearchAgentService - Main research service
 * Uses the fully refactored and feature-complete implementation
 */

import { ResearchAgentService as RefactoredService } from './researchAgentServiceRefactored';

// Always use the refactored service now that it's feature-complete
export const ResearchAgentService = RefactoredService;

// Log service initialization (development only)
if (import.meta.env?.DEV || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
  console.log('[ResearchAgentService] Using fully implemented refactored service');
}

// Re-export types that might be needed
export type { 
  EnhancedResearchResults,
  ResearchState,
  ResearchSection,
  EvaluationMetadata
} from './research/types';
