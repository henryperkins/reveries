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
    onProgress?.('Comprehensive research initiated...');
    onProgress?.('Breaking down query into research sections...');
    
    const startTime = Date.now();

    // Step 1: Break down the query into sections
    onProgress?.('tool_used:query_breakdown');
    const sections = await this.breakdownQuery(query, model, effort);

    onProgress?.(`Identified ${sections.length} research sections. Initiating parallel research...`);
    onProgress?.('search queries generated for comprehensive analysis...');

    // Step 2: Research each section in parallel
    onProgress?.('tool_used:parallel_research');
    const sectionResults = await this.researchSectionsInParallel(
      sections,
      model,
      effort,
      onProgress
    );

    // Step 3: Synthesize findings
    onProgress?.('evaluating research quality and completeness...');
    onProgress?.('Synthesizing findings from all research sections...');
    onProgress?.('Finalizing comprehensive answer through synthesis...');
    onProgress?.('tool_used:synthesis_engine');
    const synthesis = await this.synthesizeFindings(
      query,
      sectionResults,
      model,
      effort
    );

    // Step 4: Aggregate all sources
    const allSources = this.aggregateSources(sectionResults);
    
    // Calculate processing time and apply quality scoring
    const processingTime = Date.now() - startTime;
    const confidenceScore = this.calculateConfidenceScore(sectionResults, processingTime);
    
    onProgress?.(`Research completed in ${Math.round(processingTime / 1000)}s with ${sectionResults.length} sections and ${allSources.length} sources`);

    return {
      synthesis: synthesis.text,
      sources: allSources,
      sections: sectionResults,
      queryType: 'comprehensive',
      confidenceScore,
      adaptiveMetadata: {
        processingTime,
        paradigm: undefined,
        complexityScore: sectionResults.length,
        cacheHit: false,
        // Store quality metrics in layerOutputs since qualityMetrics isn't in the type
        layerOutputs: {
          qualityMetrics: {
            sourcesFound: allSources.length,
            sectionsCompleted: sectionResults.length,
            averageConfidence: sectionResults.reduce((acc, s) => acc + (s.confidence || 0), 0) / Math.max(sectionResults.length, 1),
            processingTimeMs: processingTime
          }
        }
      }
    };
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
    
    // Get batch size from environment or default to 1 (sequential)
    const batchSize = this.getBatchSize();
    const results: ResearchSection[] = [];
    
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
            generateText
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

      // Wait for current batch to complete before processing next batch
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
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
        
        // Intelligent delay between batches based on API performance
        if (i + batchSize < sections.length) {
          const delayMs = Math.min(500 + (failedResults * 500), 2000); // 0.5-2s based on failures
          onProgress?.(`Pausing ${delayMs/1000}s before next batch for optimal API usage...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Batch ${batchNumber} failed:`, error);
        onProgress?.(`Batch ${batchNumber} encountered issues. Continuing with remaining batches...`);
      }
    }

    return results;
  }
  
  /**
   * Get batch size from environment or default
   */
  private getBatchSize(): number {
    const envBatchSize = import.meta?.env?.VITE_RESEARCH_BATCH_SIZE || 
                        (typeof process !== 'undefined' && process.env.RESEARCH_BATCH_SIZE);
    const parsed = Number(envBatchSize);
    
    // Smart batching: balance API limits with parallel processing
    // Google CSE allows 100 queries/day, so we can be more aggressive with parallel processing
    const defaultBatchSize = 2; // Optimal balance: speed vs API limits
    
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
    effort: EffortType
  ): Promise<ResearchSection> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Generate focused queries
    const queries = await this.webResearchService.generateSearchQueries(
      `${section.topic}: ${section.description}`,
      model,
      effort,
      generateText
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
