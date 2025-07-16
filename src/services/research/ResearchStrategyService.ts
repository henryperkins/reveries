/**
 * Research Strategy Service
 * Handles different research strategies based on query type
 */

import { ModelType, EffortType, QueryType } from '../../types';
import { ResearchResponse, EnhancedResearchResults } from '../research/types';
import { WebResearchService } from './WebResearchService';
// import { EvaluationService } from './EvaluationService';
import { ModelProviderService } from '../providers/ModelProviderService';

export class ResearchStrategyService {
  private static instance: ResearchStrategyService;
  private webResearchService: WebResearchService;
  // private evaluationService: EvaluationService;
  private modelProvider: ModelProviderService;

  private constructor() {
    this.webResearchService = WebResearchService.getInstance();
    // this.evaluationService = EvaluationService.getInstance();
    this.modelProvider = ModelProviderService.getInstance();
  }

  public static getInstance(): ResearchStrategyService {
    if (!ResearchStrategyService.instance) {
      ResearchStrategyService.instance = new ResearchStrategyService();
    }
    return ResearchStrategyService.instance;
  }

  /**
   * Classify query type based on content
   */
  classifyQueryType(query: string): QueryType {
    const queryLower = query.toLowerCase();

    // Factual queries
    const factualPatterns = ['what is', 'define', 'who is', 'when did', 'where is', 'how many', 'how much'];
    if (factualPatterns.some(pattern => queryLower.includes(pattern))) {
      return 'factual';
    }

    // Analytical queries
    const analyticalPatterns = ['analyze', 'explain', 'how does', 'why does', 'impact of', 'effect of', 'evaluate'];
    if (analyticalPatterns.some(pattern => queryLower.includes(pattern))) {
      return 'analytical';
    }

    // Comparative queries
    const comparativePatterns = ['compare', 'versus', 'vs', 'difference between', 'better than', 'pros and cons'];
    if (comparativePatterns.some(pattern => queryLower.includes(pattern))) {
      return 'comparative';
    }

    // Default to exploratory
    return 'exploratory';
  }

  /**
   * Handle research based on query type
   */
  async handleQuery(
    query: string,
    queryType: QueryType,
    model: ModelType,
    _effort: EffortType,
    performComprehensiveResearch?: (query: string, model: ModelType, effort: EffortType) => Promise<EnhancedResearchResults>,
    performResearchWithEvaluation?: (query: string, model: ModelType, effort: EffortType) => Promise<EnhancedResearchResults>
  ): Promise<ResearchResponse> {
    switch (queryType) {
      case 'factual':
        return this.handleFactualQuery(query, model, _effort);
      case 'analytical':
        return this.handleAnalyticalQuery(query, model, _effort, performResearchWithEvaluation);
      case 'comparative':
        return this.handleComparativeQuery(query, model, _effort, performComprehensiveResearch);
      case 'exploratory':
        return this.handleExploratoryQuery(query, model, _effort, performComprehensiveResearch);
      default:
        return this.handleExploratoryQuery(query, model, _effort, performComprehensiveResearch);
    }
  }

  /**
   * Handle factual queries - focus on verified data sources
   */
  private async handleFactualQuery(
    query: string,
    model: ModelType,
    effort: EffortType
  ): Promise<ResearchResponse> {
    try {
      const generateText = this.modelProvider.generateText.bind(this.modelProvider);
      
      // Generate focused search queries for factual information
      const searchQueries = await this.webResearchService.generateSearchQueries(
        `${query} site:wikipedia.org OR site:.gov OR site:.edu`,
        model,
        effort,
        generateText
      );

      // Perform web research
      const research = await this.webResearchService.performWebResearch(
        searchQueries,
        model,
        effort,
        generateText
      );

      // Generate final answer
      const answer = await this.webResearchService.generateFinalAnswer(
        query,
        research.aggregatedFindings,
        model,
        effort,
        generateText
      );

      return {
        text: answer.text,
        sources: research.allSources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleFactualQuery:', error);
      return {
        text: 'Unable to retrieve factual information for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle analytical queries - use evaluation loop
   */
  private async handleAnalyticalQuery(
    query: string,
    model: ModelType,
    _effort: EffortType,
    performResearchWithEvaluation?: (query: string, model: ModelType, effort: EffortType) => Promise<EnhancedResearchResults>
  ): Promise<ResearchResponse> {
    try {
      if (!performResearchWithEvaluation) {
        // Fallback to basic research
        return this.handleFactualQuery(query, model, EffortType.HIGH);
      }

      const result = await performResearchWithEvaluation(query, model, EffortType.HIGH);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleAnalyticalQuery:', error);
      return {
        text: 'Unable to complete analytical research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle comparative queries - comprehensive research
   */
  private async handleComparativeQuery(
    query: string,
    model: ModelType,
    _effort: EffortType,
    performComprehensiveResearch?: (query: string, model: ModelType, effort: EffortType) => Promise<EnhancedResearchResults>
  ): Promise<ResearchResponse> {
    try {
      if (!performComprehensiveResearch) {
        // Fallback to basic research
        return this.handleFactualQuery(query, model, EffortType.MEDIUM);
      }

      const result = await performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleComparativeQuery:', error);
      return {
        text: 'Unable to complete comparative research for this query.',
        sources: []
      };
    }
  }

  /**
   * Handle exploratory queries - comprehensive research
   */
  private async handleExploratoryQuery(
    query: string,
    model: ModelType,
    _effort: EffortType,
    performComprehensiveResearch?: (query: string, model: ModelType, effort: EffortType) => Promise<EnhancedResearchResults>
  ): Promise<ResearchResponse> {
    try {
      if (!performComprehensiveResearch) {
        // Fallback to basic research
        return this.handleFactualQuery(query, model, EffortType.MEDIUM);
      }

      const result = await performComprehensiveResearch(query, model, EffortType.MEDIUM);

      return {
        text: result.synthesis,
        sources: result.sources.map(s => ({
          name: s.title || 'Unknown Source',
          url: s.url,
          snippet: s.snippet || '',
          relevanceScore: s.relevanceScore || 0.5
        }))
      };
    } catch (error) {
      console.error('Error in handleExploratoryQuery:', error);
      return {
        text: 'Unable to complete exploratory research for this query.',
        sources: []
      };
    }
  }

  /**
   * Generate research strategy metadata
   */
  generateStrategyMetadata(_query: string, queryType: QueryType): {
    recommendedEffort: EffortType;
    expectedDuration: string;
    researchDepth: 'shallow' | 'moderate' | 'deep';
    requiredSources: number;
  } {
    switch (queryType) {
      case 'factual':
        return {
          recommendedEffort: EffortType.LOW,
          expectedDuration: '30-60 seconds',
          researchDepth: 'shallow',
          requiredSources: 2
        };
      
      case 'analytical':
        return {
          recommendedEffort: EffortType.HIGH,
          expectedDuration: '2-5 minutes',
          researchDepth: 'deep',
          requiredSources: 5
        };
      
      case 'comparative':
        return {
          recommendedEffort: EffortType.MEDIUM,
          expectedDuration: '1-3 minutes',
          researchDepth: 'moderate',
          requiredSources: 4
        };
      
      case 'exploratory':
      default:
        return {
          recommendedEffort: EffortType.MEDIUM,
          expectedDuration: '1-2 minutes',
          researchDepth: 'moderate',
          requiredSources: 3
        };
    }
  }
}
