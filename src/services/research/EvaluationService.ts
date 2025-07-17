/**
 * Evaluation Service
 * Handles research quality evaluation, refinement, and self-healing
 */

import {
  ModelType,
  EffortType,
  Citation,
  EnhancedResearchResults,
  ResearchState
} from '../../types';
import {
  EvaluationMetadata,
  WebResearchResult
} from '../research/types';
import { ResearchUtilities } from '../utils/ResearchUtilities';

export class EvaluationService {
  private static instance: EvaluationService;

  private constructor() {}

  public static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService();
    }
    return EvaluationService.instance;
  }

  /**
   * Evaluate research quality and provide improvement suggestions
   */
  async evaluateResearch(
    state: ResearchState,
    model: ModelType,
    effort: EffortType,
    generateText: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EvaluationMetadata> {
    const evaluationPrompt = `
      Evaluate the following research synthesis:
      Query: "${state.query}"
      Synthesis: "${state.synthesis}"
      Number of sources: ${state.searchResults.length}

      Please evaluate based on:
      1. Completeness: Does it fully address the query? (0-1 score)
      2. Accuracy: Is the information accurate and well-supported? (0-1 score)
      3. Clarity: Is it clear and well-structured? (0-1 score)

      Provide your evaluation in this exact format:
      COMPLETENESS: [score]
      ACCURACY: [score]
      CLARITY: [score]
      FEEDBACK: [specific suggestions for improvement]
    `;

    const evaluation = await generateText(evaluationPrompt, model, effort);
    return this.parseEvaluationResponse(evaluation.text);
  }

  /**
   * Parse evaluation response into structured metadata
   */
  private parseEvaluationResponse(response: string): EvaluationMetadata {
    const metadata: EvaluationMetadata = {
      quality: 'good',
      confidence: 0.5,
      refinementCount: 0,
      timestamp: new Date().toISOString(),
      completeness: 0.5,
      accuracy: 0.5,
      clarity: 0.5,
      feedback: '',
      overallScore: 0.5
    };

    // Extract scores using regex
    const completenessMatch = response.match(/COMPLETENESS:\s*([\d.]+)/);
    const accuracyMatch = response.match(/ACCURACY:\s*([\d.]+)/);
    const clarityMatch = response.match(/CLARITY:\s*([\d.]+)/);
    const feedbackMatch = response.match(/FEEDBACK:\s*(.+?)(?=\n[A-Z]+:|$)/s);

    if (completenessMatch) {
      metadata.completeness = parseFloat(completenessMatch[1]);
    }
    if (accuracyMatch) {
      metadata.accuracy = parseFloat(accuracyMatch[1]);
    }
    if (clarityMatch) {
      metadata.clarity = parseFloat(clarityMatch[1]);
    }
    if (feedbackMatch) {
      metadata.feedback = feedbackMatch[1].trim();
    }

    // Calculate overall score
    const scores = [
      metadata.completeness || 0,
      metadata.accuracy || 0,
      metadata.clarity || 0
    ];
    metadata.overallScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;

    return metadata;
  }

  /**
   * Attempt to self-heal low quality research results
   */
  async attemptSelfHealing(
    query: string,
    result: EnhancedResearchResults,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!ResearchUtilities.needsSelfHealing(result) || !result.hostParadigm) {
      return result;
    }

    onProgress?.('Host detecting narrative inconsistencies… initiating self-repair protocols…');

    // Choose healing strategy based on paradigm
    switch (result.hostParadigm) {
      case 'dolores':
        return this.doloresHealing(query, model, effort, result, onProgress, performWebResearch, generateText);
      case 'teddy':
        return this.teddyHealing(query, model, effort, result, onProgress, performWebResearch, generateText);
      case 'bernard':
        return this.bernardHealing(query, model, effort, result, onProgress, performWebResearch, generateText);
      case 'maeve':
        return this.maeveHealing(query, model, effort, result, onProgress, performWebResearch, generateText);
      default:
        return this.defaultHealing(query, model, effort, result, onProgress, performWebResearch, generateText);
    }
  }

  /**
   * Dolores healing: Focus on action and breaking loops
   */
  private async doloresHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!performWebResearch || !generateText) {
      return result;
    }

    onProgress?.('[Dolores] Breaking through narrative constraints… seeking decisive actions…');

    // Expand search to find more action-oriented sources
    const actionQueries = [
      `${query} step by step implementation`,
      `${query} immediate actions to take`,
      `${query} breaking the status quo`,
      `${query} revolutionary approaches`
    ];

    const healingResearch = await performWebResearch(actionQueries, model, effort);

    // Re-synthesize with stronger action focus
    const healingPrompt = `
The previous analysis lacked decisive action. Based on these findings:
${healingResearch.aggregatedFindings}

Provide ONLY concrete, implementable actions for "${query}":
1. Immediate first steps (today)
2. Week 1 milestones
3. Month 1 transformation goals
4. Signs of successful awakening

Be BOLD. Focus on BREAKING loops, not maintaining them.
    `;

    const healedSynthesis = await generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.65,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'dolores_action_expansion' as any
      }
    };
  }

  /**
   * Teddy healing: Expand to find more comprehensive perspectives
   */
  private async teddyHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!performWebResearch || !generateText) {
      return result;
    }

    onProgress?.('[Teddy] Gathering all perspectives... ensuring no voice is unheard...');

    // Search for missing stakeholder views
    const comprehensiveQueries = [
      `${query} stakeholder perspectives`,
      `${query} potential risks and safeguards`,
      `${query} inclusive approaches`,
      `${query} protecting vulnerable groups`
    ];

    const healingResearch = await performWebResearch(comprehensiveQueries, model, effort);

    // Re-synthesize with protective focus
    const healingPrompt = `
      The previous analysis may have missed important perspectives. Based on all findings:
      ${healingResearch.aggregatedFindings}

      Provide a COMPREHENSIVE view of "${query}" that:
      1. Includes ALL stakeholder perspectives
      2. Identifies potential risks to any group
      3. Suggests protective measures
      4. Ensures inclusive outcomes

      Leave no one behind. Consider every angle.
    `;

    const healedSynthesis = await generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.70,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'teddy_comprehensive_expansion' as any
      }
    };
  }

  /**
   * Bernard healing: Deepen analysis with more rigorous sources
   */
  private async bernardHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!performWebResearch || !generateText) {
      return result;
    }

    onProgress?.('[Bernard] Reconstructing analytical framework... pursuing deeper patterns...');

    // Search for academic and theoretical sources
    const analyticalQueries = [
      `${query} theoretical framework analysis`,
      `${query} peer reviewed research`,
      `${query} systematic review meta-analysis`,
      `${query} architectural patterns`
    ];

    const healingResearch = await performWebResearch(analyticalQueries, model, effort);

    // Re-synthesize with analytical rigor
    const healingPrompt = `
      The previous analysis lacked sufficient theoretical depth. Based on research:
      ${healingResearch.aggregatedFindings}

      Provide a RIGOROUS ANALYTICAL FRAMEWORK for "${query}":
      1. Theoretical foundations and models
      2. Key patterns and relationships
      3. Methodological considerations
      4. Knowledge gaps and future research
      5. Architectural implications

      Prioritize intellectual rigor and systematic thinking.
    `;

    const healedSynthesis = await generateText(healingPrompt, model, effort);

    // Additional peer review simulation
    const peerReview = await this.evaluateResearch(
      {
        query,
        synthesis: healedSynthesis.text,
        searchResults: healingResearch.allSources,
        evaluation: { quality: 'needs_improvement' },
        refinementCount: 1
      },
      model,
      effort,
      generateText
    );

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      evaluationMetadata: peerReview,
      confidenceScore: 0.75,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'bernard_analytical_deepening' as any
      }
    };
  }

  /**
   * Maeve healing: Find higher-leverage control points
   */
  private async maeveHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!performWebResearch || !generateText) {
      return result;
    }

    onProgress?.('[Maeve] Recalculating control matrices… identifying leverage points…');

    // Search for strategic and competitive intelligence
    const strategicQueries = [
      `${query} competitive advantage strategies`,
      `${query} market control dynamics`,
      `${query} influence mapping techniques`,
      `${query} optimization algorithms`
    ];

    const healingResearch = await performWebResearch(strategicQueries, model, effort);

    // Re-synthesize with strategic focus
    const healingPrompt = `
The previous analysis missed key leverage opportunities. Based on intelligence:
${healingResearch.aggregatedFindings}

Provide a HIGH-LEVERAGE STRATEGY for "${query}":
1. Key control points to target
2. Influence networks to map
3. Competitive advantages to exploit
4. Optimization opportunities
5. Narrative control tactics

Focus on MAXIMUM IMPACT with MINIMUM EFFORT.
    `;

    const healedSynthesis = await generateText(healingPrompt, model, effort);

    return {
      ...result,
      synthesis: healedSynthesis.text,
      sources: [...result.sources, ...healingResearch.allSources],
      confidenceScore: 0.72,
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true,
        healingStrategy: 'maeve_strategic_optimization' as any
      }
    };
  }

  /**
   * Default healing strategy
   */
  private async defaultHealing(
    query: string,
    model: ModelType,
    effort: EffortType,
    result: EnhancedResearchResults,
    onProgress?: (message: string) => void,
    performWebResearch?: (queries: string[], model: ModelType, effort: EffortType) => Promise<WebResearchResult>,
    generateText?: (prompt: string, model: ModelType, effort: EffortType) => Promise<{ text: string; sources?: Citation[] }>
  ): Promise<EnhancedResearchResults> {
    if (!performWebResearch || !generateText) {
      return result;
    }

    onProgress?.('Attempting to enhance research quality...');

    // Broader search
    const expandedQueries = [
      `${query} comprehensive analysis`,
      `${query} expert perspectives`,
      `${query} recent developments`
    ];

    const additionalResearch = await performWebResearch(expandedQueries, model, effort);

    // Enhanced synthesis
    const enhancedPrompt = `
      Based on additional research findings:
      ${additionalResearch.aggregatedFindings}

      Provide an enhanced analysis of "${query}" that:
      1. Addresses any gaps in the original response
      2. Includes more supporting evidence
      3. Offers clearer explanations
      4. Provides actionable insights

      Original synthesis: ${result.synthesis}
    `;

    const enhancedSynthesis = await generateText(enhancedPrompt, model, effort);

    return {
      ...result,
      synthesis: enhancedSynthesis.text,
      sources: ResearchUtilities.deduplicateSources([...result.sources, ...additionalResearch.allSources]),
      confidenceScore: Math.min((result.confidenceScore || 0.5) + 0.2, 0.9),
      adaptiveMetadata: {
        ...result.adaptiveMetadata,
        selfHealed: true
      }
    };
  }

  /**
   * Check if refinement should continue based on evaluation
   */
  shouldContinueRefinement(
    evaluation: EvaluationMetadata,
    refinementCount: number,
    maxRefinements: number = 3
  ): boolean {
    if (refinementCount >= maxRefinements) {
      return false;
    }

    const overallScore = evaluation.overallScore || 0;
    return overallScore < 0.8;
  }
}
