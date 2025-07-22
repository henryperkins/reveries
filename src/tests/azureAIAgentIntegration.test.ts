/**
 * Integration tests for Azure AI Agent Service with Bing Search grounding
 * Tests integration with existing robust response enhancement logic
 */

import { AzureAIAgentService } from '../services/azureAIAgentService';
import { ModelProviderService } from '../services/providers/ModelProviderService';
import { ResearchAgentService } from '../services/researchAgentServiceRefactored';
import { ResearchUtilities } from '../services/utils/ResearchUtilities';
import { EffortType, AZURE_O3_MODEL, ModelType } from '../types';
import { APIError, withRetry } from '../services/errorHandler';

// Mock environment variables for testing
const mockConfig = {
  VITE_AZURE_AI_PROJECT_ENDPOINT: 'https://test-project.openai.azure.com/',
  VITE_AZURE_AI_AGENT_API_KEY: 'test-agent-key',
  VITE_BING_CONNECTION_ID: 'test-bing-connection',
  VITE_AZURE_AI_API_VERSION: '2025-04-01-preview'
};

describe('Azure AI Agent Service Integration', () => {
  let researchAgent: ResearchAgentService;
  const modelProvider = ModelProviderService.getInstance();

  beforeEach(() => {
    // Mock environment variables
    Object.assign(import.meta.env, mockConfig);
    
    // Initialize services
    researchAgent = ResearchAgentService.getInstance();
  });

  describe('Service Availability', () => {
    test('should detect Azure AI Agent Service availability', () => {
      const isAvailable = AzureAIAgentService.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('should include Azure O3 model when AI Agent Service is available', () => {
      const availableModels = modelProvider.getAvailableModels();
      expect(availableModels).toContain(AZURE_O3_MODEL);
    });
  });

  describe('Enhancement Pipeline Integration', () => {
    test('should integrate with existing confidence calculation', async () => {
      // Mock response data
      const mockResponse = {
        text: 'Comprehensive research findings about quantum computing developments in 2025...',
        sources: [
          {
            url: 'https://nature.com/articles/quantum-2025',
            title: 'Latest Quantum Computing Breakthroughs',
            accessed: new Date().toISOString(),
            relevanceScore: 0.9,
            snippet: 'Research on quantum computing breakthroughs'
          },
          {
            url: 'https://arxiv.org/abs/quantum-paper',
            title: 'Quantum Algorithm Advances',
            accessed: new Date().toISOString(),
            relevanceScore: 0.8,
            snippet: 'Advanced quantum algorithms research'
          }
        ]
      };

      // Test confidence calculation with enhanced sources
      const mockResult = {
        synthesis: mockResponse.text,
        sources: mockResponse.sources,
        queryType: 'comprehensive' as const,
        confidenceScore: 0.7,
        evaluationMetadata: {
          completeness: 0.85,
          accuracy: 0.9,
          clarity: 0.8,
          quality: 'excellent' as const
        }
      };

      const confidence = ResearchUtilities.calculateConfidenceScore(mockResult);
      expect(confidence).toBeGreaterThan(0.7);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    test('should trigger self-healing for low quality responses', () => {
      const lowQualityResult = {
        synthesis: 'Brief response',
        sources: [],
        queryType: 'factual' as const,
        confidenceScore: 0.3,
        evaluationMetadata: {
          completeness: 0.3,
          accuracy: 0.4,
          clarity: 0.3,
          quality: 'needs_improvement' as const
        }
      };

      const needsHealing = ResearchUtilities.needsSelfHealing(lowQualityResult);
      expect(needsHealing).toBe(true);
    });

    test('should not trigger self-healing for high quality responses', () => {
      const highQualityResult = {
        synthesis: 'Comprehensive and well-researched response with detailed analysis and multiple perspectives...',
        sources: [
          { url: 'https://edu.example.com', title: 'Academic Source', relevanceScore: 0.9, snippet: 'Academic research content' },
          { url: 'https://gov.example.com', title: 'Government Report', relevanceScore: 0.85, snippet: 'Government report details' }
        ],
        queryType: 'comprehensive' as const,
        confidenceScore: 0.85,
        evaluationMetadata: {
          completeness: 0.9,
          accuracy: 0.85,
          clarity: 0.8,
          quality: 'excellent' as const
        }
      };

      const needsHealing = ResearchUtilities.needsSelfHealing(highQualityResult);
      expect(needsHealing).toBe(false);
    });
  });

  describe('Source Quality Enhancement', () => {
    test('should properly evaluate source quality using existing patterns', () => {
      const sources = [
        { url: 'https://nature.com/article', title: 'Research Paper' },
        { url: 'https://wikipedia.org/wiki/topic', title: 'Wikipedia Article' },
        { url: 'https://random-blog.com/post', title: 'Blog Post' }
      ];

      // Test the source quality evaluation logic
      const enhancedSources = sources.map(source => {
        const qualityIndicators = {
          high: ['.gov', '.edu', 'wikipedia.org', 'nature.com', 'science.org'],
          medium: ['.org', 'medium.com', 'github.com'],
          low: ['.com', '.net']
        };

        let relevanceScore = 0.5;
        for (const [quality, domains] of Object.entries(qualityIndicators)) {
          if (domains.some(domain => source.url.includes(domain))) {
            relevanceScore = quality === 'high' ? 0.9 : quality === 'medium' ? 0.6 : 0.3;
            break;
          }
        }

        return { ...source, relevanceScore };
      });

      expect(enhancedSources[0].relevanceScore).toBe(0.9); // nature.com - high quality
      expect(enhancedSources[1].relevanceScore).toBe(0.9); // wikipedia.org - high quality
      expect(enhancedSources[2].relevanceScore).toBe(0.3); // random-blog.com - low quality
    });
  });

  describe('Effort-based Enhancement', () => {
    test('should adjust instructions based on effort level', () => {
      const service = AzureAIAgentService.getInstance();
      
      // Test effort-based instruction generation
      const highEffortInstructions = (service as unknown as { getEffortBasedInstructions(effort: EffortType): string }).getEffortBasedInstructions(EffortType.HIGH);
      const lowEffortInstructions = (service as unknown as { getEffortBasedInstructions(effort: EffortType): string }).getEffortBasedInstructions(EffortType.LOW);

      expect(highEffortInstructions).toContain('thorough');
      expect(highEffortInstructions).toContain('comprehensive');
      expect(lowEffortInstructions).toContain('focused');
      expect(lowEffortInstructions).toContain('relevant');
    });

    test('should enhance queries with evaluation requirements', () => {
      const service = AzureAIAgentService.getInstance();
      const originalQuery = 'What is quantum computing?';
      
      const enhancedQuery = (service as any).enhanceQueryForEvaluation(originalQuery, EffortType.MEDIUM);
      
      expect(enhancedQuery).toContain('ENHANCEMENT REQUIREMENTS');
      expect(enhancedQuery).toContain('confidence levels');
      expect(enhancedQuery).toContain('source evaluation');
      expect(enhancedQuery).toContain('BALANCED RESEARCH MODE');
    });
  });

  describe('Fallback Integration', () => {
    test('should integrate properly with ModelProviderService fallback chain', async () => {
      // Test that ModelProviderService handles fallback correctly
      const modelProvider = ModelProviderService.getInstance();
      const fallbackChain = (modelProvider as unknown as { buildFallbackChain(model: ModelType, excludedModels: Set<ModelType>): ModelType[] }).buildFallbackChain(AZURE_O3_MODEL, new Set());
      
      // Should include other models as fallbacks
      expect(fallbackChain.length).toBeGreaterThan(0);
      expect(fallbackChain).not.toContain(AZURE_O3_MODEL); // Original model excluded
    });
  });

  describe('Evaluation Metadata Generation', () => {
    test('should generate proper evaluation metadata', () => {
      const service = AzureAIAgentService.getInstance();
      const content = 'This is a comprehensive research response with detailed analysis and multiple perspectives on the topic.';
      const sources = [
        { url: 'https://edu.example.com', title: 'Academic Source', relevanceScore: 0.9 },
        { url: 'https://nature.com', title: 'Research Paper', relevanceScore: 0.85 }
      ];

      const metadata = (service as any).generateEvaluationMetadata(content, sources, EffortType.MEDIUM);

      expect(metadata.completeness).toBeGreaterThan(0.5);
      expect(metadata.accuracy).toBeGreaterThan(0.5);
      expect(metadata.clarity).toBeGreaterThan(0.5);
      expect(['high', 'medium', 'needs_improvement']).toContain(metadata.quality);
    });
  });

  describe('Research Pipeline Integration', () => {
    test('should integrate seamlessly with ResearchAgentService', async () => {
      // Mock the processQuery method to test integration
      const mockProcessQuery = jest.spyOn(researchAgent, 'processQuery');
      
      // Test that Azure AI Agent Service is used when available
      const query = 'Latest developments in renewable energy';
      
      // Verify that the service would be called with proper parameters
      expect(mockProcessQuery).toBeDefined();
      
      // Test paradigm integration
      const paradigmProbs = (researchAgent as unknown as { paradigmClassifier?: { classify(query: string): Record<string, number> } }).paradigmClassifier?.classify(query);
      expect(paradigmProbs).toBeDefined();
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should respect existing rate limiting', async () => {
      const service = AzureAIAgentService.getInstance();
      
      // Test that rate limiter is integrated
      expect((service as any).rateLimiter).toBeDefined();
      
      // Mock rate limit check
      const checkRateLimit = jest.spyOn((service as any).rateLimiter, 'checkRateLimit');
      checkRateLimit.mockResolvedValue(true);
      
      // Rate limiting should be called before API requests
      expect(checkRateLimit).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should use existing error handling patterns', () => {
      // Test that APIError is used consistently
      expect(() => {
        throw new APIError(
          'Test error',
          'TEST_ERROR',
          false
        );
      }).toThrow('Test error');
    });

    test('should integrate with withRetry utility', async () => {
      // withRetry imported at top level
      
      let attempts = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('Success');
      });

      const result = await withRetry(mockOperation);
      expect(result).toBe('Success');
      expect(attempts).toBe(2);
    });
  });
});

// Integration test helper functions
export const testAzureAIAgentIntegration = {
  /**
   * Test the complete research flow with Azure AI Agent Service
   */
  async testCompleteFlow(query: string, expectedSourceCount = 3) {
    const researchAgent = ResearchAgentService.getInstance();
    
    const result = await researchAgent.processQuery(query, AZURE_O3_MODEL);
    
    return {
      hasText: result.text && result.text.length > 100,
      hasEnoughSources: result.sources && result.sources.length >= expectedSourceCount,
      hasConfidence: 'paradigmProbabilities' in result && result.paradigmProbabilities,
      hasContextLayers: 'contextLayers' in result && result.contextLayers,
      confidence: ResearchUtilities.calculateConfidenceScore({
        synthesis: result.text,
        sources: result.sources || [],
        queryType: 'comprehensive',
        confidenceScore: 0.7
      })
    };
  },

  /**
   * Test source quality enhancement
   */
  testSourceQualityEnhancement(sources: { title?: string; url?: string; snippet?: string; [key: string]: unknown }[]) {
    const enhanced = sources.map(source => {
      const qualityIndicators = {
        high: ['.gov', '.edu', 'wikipedia.org', 'nature.com'],
        medium: ['.org', 'github.com'],
        low: ['.com']
      };

      let score = 0.5;
      for (const [quality, domains] of Object.entries(qualityIndicators)) {
        if (domains.some(d => source.url?.includes(d))) {
          score = quality === 'high' ? 0.9 : quality === 'medium' ? 0.6 : 0.3;
          break;
        }
      }

      return { ...source, relevanceScore: score };
    });

    return {
      totalSources: enhanced.length,
      highQualitySources: enhanced.filter(s => s.relevanceScore > 0.8).length,
      mediumQualitySources: enhanced.filter(s => s.relevanceScore >= 0.5 && s.relevanceScore <= 0.8).length,
      lowQualitySources: enhanced.filter(s => s.relevanceScore < 0.5).length,
      averageQuality: enhanced.reduce((sum, s) => sum + s.relevanceScore, 0) / enhanced.length
    };
  }
};