/**
 * Comprehensive Research Service
 * Implements orchestrator-worker pattern for complex research tasks
 */

import { ModelType, EffortType, Citation } from '../../types';
import { 
  EnhancedResearchResults, 
  ResearchSection,
  WebResearchResult 
} from '../research/types';
import { WebResearchService } from './WebResearchService';
import { ModelProviderService } from '../providers/ModelProviderService';
import { ResearchUtilities } from '../utils/ResearchUtilities';

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
    onProgress?.('Breaking down query into research sections...');

    // Step 1: Break down the query into sections
    const sections = await this.breakdownQuery(query, model, effort);
    
    onProgress?.(`Identified ${sections.length} research sections. Initiating parallel research...`);

    // Step 2: Research each section in parallel
    const sectionResults = await this.researchSectionsInParallel(
      sections,
      model,
      effort,
      onProgress
    );

    // Step 3: Synthesize findings
    onProgress?.('Synthesizing findings from all research sections...');
    const synthesis = await this.synthesizeFindings(
      query,
      sectionResults,
      model,
      effort
    );

    // Step 4: Aggregate all sources
    const allSources = this.aggregateSources(sectionResults);

    return {
      synthesis: synthesis.text,
      sources: allSources,
      sections: sectionResults,
      queryType: 'comprehensive',
      confidenceScore: 0.85,
      adaptiveMetadata: {
        processingTime: Date.now(),
        paradigm: undefined
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
   * Research sections in parallel
   */
  private async researchSectionsInParallel(
    sections: { topic: string; description: string }[],
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<ResearchSection[]> {
    const generateText = this.modelProvider.generateText.bind(this.modelProvider);

    // Create research promises for each section
    const researchPromises = sections.map(async (section, index) => {
      onProgress?.(`[Worker ${index + 1}] Researching: ${section.topic}`);

      try {
        // Generate search queries for this section
        const queries = await this.webResearchService.generateSearchQueries(
          `${section.topic}: ${section.description}`,
          model,
          effort,
          generateText
        );

        // Perform web research
        const research = await this.webResearchService.performWebResearch(
          queries,
          model,
          effort,
          generateText
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

        onProgress?.(`[Worker ${index + 1}] Completed research for: ${section.topic}`);

        return {
          topic: section.topic,
          description: section.description,
          findings: findings.text,
          sources: research.allSources
        };
      } catch (error) {
        console.error(`Error researching section "${section.topic}":`, error);
        return {
          topic: section.topic,
          description: section.description,
          findings: `Unable to complete research for this section.`,
          sources: []
        };
      }
    });

    // Wait for all sections to complete
    return Promise.all(researchPromises);
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
      `## ${section.topic}\n${section.findings}`
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
  private aggregateSources(sections: ResearchSection[]): Citation[] {
    const allSources: Citation[] = [];
    const seenKeys = new Set<string>();

    for (const section of sections) {
      for (const source of section.sources) {
        const key = ResearchUtilities.normalizeSourceKey(source);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allSources.push(source);
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
      topic: section.topic,
      description: section.description,
      findings: findings.text,
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
