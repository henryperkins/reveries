/**
 * Comprehensive Research Service
 * Implements orchestrator-worker pattern for complex research tasks
 */

import {
  ModelType,
  EffortType,
  Citation,
  EnhancedResearchResults
} from '@/types';
import {
  ResearchSection
} from '@/services/research/types';
import { WebResearchService } from './WebResearchService';
import { ModelProviderService } from '@/services/providers/ModelProviderService';
import { ResearchUtilities } from '@/services/utils/ResearchUtilities';

export class ComprehensiveResearchService {
  private static instance: ComprehensiveResearchService;
  private webResearchService: WebResearchService;
  private modelProvider: ModelProviderService;

  private constructor() {
    this.webResearchService = WebResearchService.getInstance();
    this.modelProvider = ModelProviderService.getInstance();
  }

  public static getInstance(): ComprehensiveResearchService {
    if (!ComprehensiveResearchService.instance) {
      ComprehensiveResearchService.instance = new ComprehensiveResearchService();
    }
    return ComprehensiveResearchService.instance;
  }

  /**
   * Perform comprehensive research using orchestrator-worker pattern
   */
  async performComprehensiveResearch(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<EnhancedResearchResults> {
    console.log('🔍 ComprehensiveResearchService.performComprehensiveResearch called');
    console.log('📋 Query:', query);
    console.log('🎯 Model:', model);
    console.log('⚡ Effort:', effort);

    onProgress?.('Starting comprehensive research...');

    try {
      // Get generate function from ModelProviderService
      const generateText = async (prompt: string, m: ModelType, e: EffortType) => {
        console.log('📝 Generating text for comprehensive research');
        const { ModelProviderService } = await import('../providers/ModelProviderService');
        const provider = ModelProviderService.getInstance();
        return provider.generateText(prompt, m, e, onProgress);
      };

      // Step 1: Generate search queries
      onProgress?.('Generating search queries...');
      const searchQueries = await this.webResearchService.generateSearchQueries(
        query,
        model,
        effort,
        generateText,
        onProgress
      );
      console.log(`📋 Generated ${searchQueries.length} search queries`);

      if (searchQueries.length === 0) {
        console.warn('⚠️ No search queries generated');
        return {
          synthesis: 'Unable to generate search queries for this topic.',
          sources: [],
          queryType: 'factual' as QueryType,
          confidenceScore: 0.1
        };
      }

      // Step 2: Perform web research
      onProgress?.(`Searching web with ${searchQueries.length} queries...`);
      const webResults = await this.webResearchService.performWebResearch(
        searchQueries,
        model,
        effort,
        generateText
      );
      console.log(`✅ Web research completed with ${webResults.allSources.length} sources`);

      // Step 3: Generate final synthesis
      onProgress?.('Synthesizing findings...');
      const finalAnswer = await this.webResearchService.generateFinalAnswer(
        query,
        webResults.aggregatedFindings,
        model,
        effort,
        generateText
      );
      console.log('✅ Final synthesis generated');

      // Determine query type
      const queryType = this.strategyService.classifyQueryType(query);

      return {
        synthesis: finalAnswer.text,
        sources: [...webResults.allSources, ...(finalAnswer.sources || [])],
        queryType,
        confidenceScore: this.calculateConfidence(webResults.allSources.length, queryType)
      };
    } catch (error) {
      console.error('❌ Comprehensive research failed:', error);
      onProgress?.('Research encountered an error');
      throw error;
    }
  }

  /**
   * Break down complex query into research sections
   */
  private async breakdownQuery(
    query: string,
    model: ModelType,
    effort: EffortType
  ): Promise<{ topic: string; description: string }[]> {
    const prompt = `
      Break down this complex query into 3-5 distinct research sections:
      "${query}"

      For each section, provide:
      1. A specific topic/aspect to research
      2. A brief description of what to investigate

      Format your response as a numbered list:
      1. TOPIC: [topic name] | DESCRIPTION: [what to research]
      2. TOPIC: [topic name] | DESCRIPTION: [what to research]
      etc.
    `;

    const result = await this.modelProvider.generateText(prompt, model, effort);
    return this.parseSectionBreakdown(result.text);
  }

  /**
   * Parse section breakdown response
   */
  private parseSectionBreakdown(response: string): { topic: string; description: string }[] {
    const sections: { topic: string; description: string }[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/TOPIC:\s*(.+?)\s*\|\s*DESCRIPTION:\s*(.+)/i);
      if (match) {
        sections.push({
          topic: match[1].trim(),
          description: match[2].trim()
        });
      }
    }

    // Ensure we have at least 3 sections
    if (sections.length < 3) {
      sections.push(
        { topic: 'Overview', description: 'General overview and background information' },
        { topic: 'Key Details', description: 'Important specific details and facts' },
        { topic: 'Implications', description: 'Implications and related considerations' }
      );
    }

    return sections.slice(0, 5); // Maximum 5 sections
  }

  /**
   * Research sections with controlled concurrency
   */
  private async researchSectionsInParallel(
    sections: { topic: string; description: string }[],
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<ResearchSection[]> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Get batch size from environment or default based on model type
    const batchSize = this.getBatchSize(model);
    let results: ResearchSection[] = [];

    onProgress?.(`Processing ${sections.length} sections in batches of ${batchSize}...`);

    // Process sections in batches
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(sections.length / batchSize);

      onProgress?.(`Processing batch ${batchNumber}/${totalBatches}...`);

      // Create promises for current batch
      const batchPromises = batch.map(async (section, batchIndex) => {
        const globalIndex = i + batchIndex;
        onProgress?.(`[Section ${globalIndex + 1}] Researching: ${section.topic}`);

        try {
          // Generate search queries for this section
          onProgress?.('tool_used:search_query_generation');
          const queries = await this.webResearchService.generateSearchQueries(
            `${section.topic}: ${section.description}`,
            model,
            effort,
            generateText,
            onProgress
          );

          // Perform web research
          onProgress?.('tool_used:web_search');
          const research = await this.webResearchService.performWebResearch(
            queries,
            model,
            effort,
            generateText,
            onProgress
          );

          // Generate section-specific findings
          const findingsPrompt = `
            Based on the research findings for "${section.topic}":
            ${research.aggregatedFindings}

            Provide a comprehensive summary addressing: ${section.description}
            Focus on key insights, facts, and relevant information.
          `;

          const findings = await this.modelProvider.generateText(
            findingsPrompt,
            model,
            effort
          );

          onProgress?.(`[Section ${globalIndex + 1}] Completed research for: ${section.topic}`);

          return {
            id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: section.topic,
            content: findings.text,
            confidence: 0.8,
            topic: section.topic,
            description: section.description,
            research: findings.text,
            sources: research.allSources
          };
        } catch (error) {
          console.error(`Error researching section "${section.topic}":`, error);
          return {
            id: `section_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: section.topic,
            content: `Unable to complete research for this section.`,
            confidence: 0.1,
            topic: section.topic,
            description: section.description,
            research: `Unable to complete research for this section.`,
            sources: []
          };
        }
      });

      // Wait for current batch to complete with adaptive timeout for O3 models
      try {
        const isO3Model = model.includes('o3') || model.includes('azure-o3');
        const batchTimeout = isO3Model ? 15 * 60 * 1000 : 5 * 60 * 1000; // 15min for O3, 5min for others

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Batch ${batchNumber} timed out after ${batchTimeout/1000}s`)), batchTimeout);
        });

        const batchResults = await Promise.race([
          Promise.allSettled(batchPromises),
          timeoutPromise
        ]) as PromiseSettledResult<any>[];

        // Process results and handle failures gracefully
        const successfulResults = batchResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);

        const failedResults = batchResults
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .length;

        results.push(...successfulResults);

        if (failedResults > 0) {
          onProgress?.(`Batch ${batchNumber} completed with ${failedResults} failed sections. Continuing...`);
        } else {
          onProgress?.(`Batch ${batchNumber} completed successfully.`);
        }

        // Intelligent delay between batches based on API performance and model type
        if (i + batchSize < sections.length) {
          const isO3Model = model.includes('o3') || model.includes('azure-o3');
          const baseDelay = isO3Model ? 2000 : 500; // Longer delay for O3 models
          const delayMs = Math.min(baseDelay + (failedResults * 1000), isO3Model ? 10000 : 3000);
          onProgress?.(`Pausing ${delayMs/1000}s before next batch for optimal API usage...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Batch ${batchNumber} failed:`, error);
        onProgress?.(`Batch ${batchNumber} encountered issues. Continuing with remaining batches...`);
      }
    }

    // Ensure we always return some results, even if all batches fail
    if (results.length === 0) {
      onProgress?.('All research sections encountered issues. Generating fallback response...');
      results = [{
        id: `emergency_fallback_${Date.now()}`,
        title: 'Research Summary',
        content: 'Unable to perform comprehensive web research due to search provider limitations. Please check API configuration or try again later.',
        confidence: 0.2,
        topic: 'General Response',
        description: 'Fallback response when research tools are unavailable',
        research: 'Search functionality temporarily unavailable.',
        sources: []
      }];
    }

    return results;
  }

  /**
   * Get batch size from environment or default
   */
  private getBatchSize(model: ModelType): number {
    const envBatchSize = import.meta?.env?.VITE_RESEARCH_BATCH_SIZE ||
                        (typeof process !== 'undefined' && process.env.RESEARCH_BATCH_SIZE);
    const parsed = Number(envBatchSize);

    // Smart batching: balance API limits with parallel processing
    // For O3 models, use smaller batches due to longer processing times
    // For other models, we can be more aggressive
    const isO3Model = model.includes('o3') || model.includes('azure-o3');
    const defaultBatchSize = isO3Model ? 1 : 3; // O3: sequential, others: parallel

    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed; // Respect environment setting with reasonable bounds
    }

    return defaultBatchSize; // Improved default for better performance
  }

  /**
   * Synthesize findings from all sections
   */
  private async synthesizeFindings(
    originalQuery: string,
    sections: ResearchSection[],
    model: ModelType,
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    // Prepare section summaries
    const sectionSummaries = sections.map(section =>
      `## ${section.title || section.topic}\n${section.content || section.research || 'No content available'}`
    ).join('\n\n');

    const synthesisPrompt = `
      Original Query: "${originalQuery}"

      Research findings from multiple perspectives:
      ${sectionSummaries}

      Based on all the research sections above, provide a comprehensive, well-structured answer to the original query.
      Integrate insights from all sections into a cohesive response.
      Ensure the answer is complete, accurate, and directly addresses the user's question.
    `;

    return this.modelProvider.generateText(synthesisPrompt, model, effort);
  }

  /**
   * Aggregate sources from all sections
   */
  /**
   * Calculate confidence score based on research quality and completeness
   */
  private calculateConfidenceScore(sectionResults: ResearchSection[], processingTime: number): number {
    if (sectionResults.length === 0) return 0.1;

    // Base confidence from section completion
    const sectionConfidences = sectionResults.map(s => s.confidence || 0);
    const avgSectionConfidence = sectionConfidences.reduce((acc, conf) => (acc || 0) + (conf || 0), 0) / Math.max(sectionConfidences.length, 1);

    // Quality factors
    const sourceCount = sectionResults.reduce((acc, s) => acc + (s.sources?.length || 0), 0);
    const sourceQuality = Math.min(sourceCount / (sectionResults.length * 3), 1.0); // Ideal: 3 sources per section

    // Time factor - penalize very fast (likely incomplete) or very slow (likely errored) research
    const idealTimeMs = sectionResults.length * 30000; // 30s per section ideal
    const timeFactor = Math.max(0.7, Math.min(1.0, idealTimeMs / Math.max(processingTime, idealTimeMs * 0.3)));

    // Combine factors
    const confidence = (avgSectionConfidence * 0.5) + (sourceQuality * 0.3) + (timeFactor * 0.2);

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private aggregateSources(sections: ResearchSection[]): Citation[] {
    const allSources: Citation[] = [];
    const seenKeys = new Set<string>();

    for (const section of sections) {
      if (section.sources && section.sources.length > 0) {
        for (const source of section.sources) {
          const key = ResearchUtilities.normalizeSourceKey(source);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allSources.push(source);
          }
        }
      }
    }

    return allSources;
  }

  /**
   * Create worker task for a specific research section
   */
  async createWorkerTask(
    section: { topic: string; description: string },
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<ResearchSection> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Generate focused queries
    const queries = await this.webResearchService.generateSearchQueries(
      `${section.topic}: ${section.description}`,
      model,
      effort,
      generateText,
      onProgress
    );

    // Perform research
    const research = await this.webResearchService.performWebResearch(
      queries,
      model,
      effort,
      generateText
    );

    // Generate findings
    const findings = await this.modelProvider.generateText(
      `Summarize findings for "${section.topic}": ${research.aggregatedFindings}`,
      model,
      effort
    );

    return {
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: section.topic,
      content: findings.text,
      confidence: 0.8,
      topic: section.topic,
      description: section.description,
      research: findings.text,
      sources: research.allSources
    };
  }

  /**
   * Estimate research complexity
   */
  estimateComplexity(query: string): {
    estimatedSections: number;
    estimatedDuration: string;
    complexity: 'low' | 'medium' | 'high';
  } {
    const wordCount = query.split(/\s+/).length;
    const hasMultipleConcepts = /and|or|versus|compare|relationship/i.test(query);
    const hasComplexTerms = /analyze|evaluate|implications|comprehensive|detailed/i.test(query);

    let complexity: 'low' | 'medium' | 'high' = 'low';
    let estimatedSections = 3;
    let estimatedDuration = '1-2 minutes';

    if (wordCount > 20 || hasMultipleConcepts) {
      complexity = 'medium';
      estimatedSections = 4;
      estimatedDuration = '2-3 minutes';
    }

    if (hasComplexTerms && (wordCount > 15 || hasMultipleConcepts)) {
      complexity = 'high';
      estimatedSections = 5;
      estimatedDuration = '3-5 minutes';
    }

    return {
      estimatedSections,
      estimatedDuration,
      complexity
    };
  }
}
    }

    return {
      estimatedSections,
      estimatedDuration,
      complexity
    };
  }
}
