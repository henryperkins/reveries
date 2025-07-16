/**
 * Service compatibility wrapper
 * Routes to either the original or refactored ResearchAgentService based on feature flag
 */

import { USE_REFACTORED_RESEARCH_SERVICE } from '../constants';
import { ResearchAgentService as OriginalService } from './researchAgentService';
import { ResearchAgentService as RefactoredService } from './researchAgentServiceRefactored';

// Export the appropriate service based on feature flag
export const ResearchAgentService = USE_REFACTORED_RESEARCH_SERVICE 
  ? RefactoredService 
  : OriginalService;

// Log which implementation is being used (development only)
if (import.meta.env.DEV) {
  console.log(
    `[ResearchAgentService] Using ${USE_REFACTORED_RESEARCH_SERVICE ? 'REFACTORED' : 'ORIGINAL'} implementation`
  );
}

// Re-export types that might be needed
export type { 
  EnhancedResearchResults,
  ResearchState,
  ResearchSection,
  EvaluationMetadata
} from './research/types';
