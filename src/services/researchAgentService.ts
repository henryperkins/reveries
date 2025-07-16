/**
 * Legacy ResearchAgentService - Minimal wrapper for backward compatibility
 * 
 * This service has been refactored into modular components.
 * Use ResearchAgentServiceRefactored for new implementations.
 * 
 * @deprecated Use ResearchAgentServiceRefactored instead
 */

import { ModelType, EffortType, EnhancedResearchResults } from '../types';

export class ResearchAgentService {
  private static instance: ResearchAgentService;

  private constructor() {
    // Legacy service - minimal implementation
  }

  public static getInstance(): ResearchAgentService {
    if (!ResearchAgentService.instance) {
      ResearchAgentService.instance = new ResearchAgentService();
    }
    return ResearchAgentService.instance;
  }

  /**
   * Legacy method - redirects to refactored service
   * @deprecated Use ResearchAgentServiceRefactored.routeResearchQuery instead
   */
  async routeResearchQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    // Import refactored service dynamically to avoid circular dependencies
    const { ResearchAgentService: RefactoredService } = await import('./researchAgentServiceRefactored');
    const refactoredService = RefactoredService.getInstance();
    return refactoredService.routeResearchQuery(query, model, effort, onProgress);
  }

  /**
   * Legacy method - basic text generation
   * @deprecated Use ModelProviderService.generateText instead
   */
  async generateText(
    prompt: string,
    model: ModelType,
    effort: EffortType = EffortType.MEDIUM
  ): Promise<string> {
    const { ModelProviderService } = await import('./providers/ModelProviderService');
    const modelProvider = ModelProviderService.getInstance();
    const response = await modelProvider.generateText(prompt, model, effort);
    return response.text;
  }

  /**
   * Legacy method - returns empty array as this functionality is deprecated
   * @deprecated Use feature flag to switch to refactored service
   */
  getAvailableModels(): ModelType[] {
    console.warn('getAvailableModels is deprecated. Use ResearchAgentServiceRefactored instead.');
    return [];
  }

  /**
   * Legacy method - redirects to refactored service
   * @deprecated Use ResearchAgentServiceRefactored.routeResearchQuery instead
   */
  async processQuery(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    return this.routeResearchQuery(query, model, effort, onProgress);
  }

  /**
   * Legacy method - basic semantic search placeholder
   * @deprecated This functionality has been moved to specialized search services
   */
  async semanticSearch(_query: string, _options?: any): Promise<any[]> {
    console.warn('semanticSearch is deprecated. Use specialized search services instead.');
    // Return empty results for compatibility
    return [];
  }
}

// Export singleton instance for backward compatibility
export const researchAgentService = ResearchAgentService.getInstance();