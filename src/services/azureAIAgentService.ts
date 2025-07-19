/**
 * Azure AI Agent Service with Bing Search Grounding
 * Integrates with existing research enhancement pipeline
 */

import { EffortType, Citation, ModelType } from '../types';
import { RateLimiter } from './rateLimiter';
import { APIError, withRetry } from './errorHandler';
import { ResearchUtilities } from './utils/ResearchUtilities';
import { EnhancedResearchResults, EvaluationMetadata } from './research/types';

export interface AzureAIAgentConfig {
  projectEndpoint: string;
  apiKey: string;
  connectionId: string; // Bing Search connection ID
  apiVersion: string;
}

export interface BingGroundingTool {
  type: 'bing_grounding';
  bing_grounding: {
    connection_id: string;
    count?: number;
    freshness?: 'Day' | 'Week' | 'Month' | 'Year';
    market?: string;
    safe_search?: 'Off' | 'Moderate' | 'Strict';
  };
}

export interface AgentResponse {
  text: string;
  sources: Citation[];
  bingQueries?: string[];
  confidence?: number;
  evaluationMetadata?: EvaluationMetadata;
}

export class AzureAIAgentService {
  private static instance: AzureAIAgentService | null = null;
  private config: AzureAIAgentConfig;
  private rateLimiter: RateLimiter;
  private agentId: string;

  private constructor() {
    this.config = this.getConfig();
    this.rateLimiter = RateLimiter.getInstance();
    this.agentId = '';
  }

  private getConfig(): AzureAIAgentConfig {
    const projectEndpoint = import.meta.env.VITE_AZURE_AI_PROJECT_ENDPOINT ||
                           (typeof process !== 'undefined' && process.env?.AZURE_AI_PROJECT_ENDPOINT);
    const apiKey = import.meta.env.VITE_AZURE_AI_AGENT_API_KEY ||
                  (typeof process !== 'undefined' && process.env?.AZURE_AI_AGENT_API_KEY);
    const connectionId = import.meta.env.VITE_BING_CONNECTION_ID ||
                        (typeof process !== 'undefined' && process.env?.BING_CONNECTION_ID);
    const apiVersion = import.meta.env.VITE_AZURE_AI_API_VERSION ||
                      (typeof process !== 'undefined' && process.env?.AZURE_AI_API_VERSION) ||
                      '2025-04-01-preview';

    if (!projectEndpoint || !apiKey || !connectionId) {
      throw new APIError(
        'Azure AI Agent configuration missing. Please set VITE_AZURE_AI_PROJECT_ENDPOINT, VITE_AZURE_AI_AGENT_API_KEY, and VITE_BING_CONNECTION_ID',
        'CONFIG_ERROR',
        false
      );
    }

    return { projectEndpoint, apiKey, connectionId, apiVersion };
  }

  public static getInstance(): AzureAIAgentService {
    if (!AzureAIAgentService.instance) {
      AzureAIAgentService.instance = new AzureAIAgentService();
    }
    return AzureAIAgentService.instance;
  }

  public static isAvailable(): boolean {
    try {
      const instance = new AzureAIAgentService();
      return !!instance.config.projectEndpoint && !!instance.config.apiKey && !!instance.config.connectionId;
    } catch {
      return false;
    }
  }

  /**
   * Initialize agent with Bing grounding tool - integrates with enhancement pipeline
   */
  private async initializeAgent(model: ModelType): Promise<string> {
    if (this.agentId) {
      return this.agentId;
    }

    const bingTool: BingGroundingTool = {
      type: 'bing_grounding',
      bing_grounding: {
        connection_id: this.config.connectionId,
        count: 10, // More sources for better enhancement evaluation
        freshness: 'Week',
        market: 'en-US',
        safe_search: 'Moderate'
      }
    };

    const agentPayload = {
      model: model,
      name: 'enhanced-research-agent',
      instructions: `You are an expert research assistant with access to real-time web data through Bing Search.

CORE INSTRUCTIONS:
1. Always use the Bing grounding tool for current information and comprehensive research
2. Provide detailed, well-structured responses with proper source attribution
3. Include confidence levels and quality assessments for your findings
4. Focus on factual accuracy and comprehensive coverage
5. Organize information hierarchically for better comprehension

RESPONSE ENHANCEMENT REQUIREMENTS:
- Evaluate source quality and reliability
- Provide confidence scores for key findings
- Identify areas that may need further investigation
- Structure responses for optimal readability and usefulness
- Include actionable insights when relevant

When responding:
1. Search for comprehensive information using Bing grounding
2. Evaluate and rank sources by credibility and relevance
3. Synthesize findings into a coherent, well-structured response
4. Provide confidence indicators and quality assessments
5. Suggest follow-up research areas if applicable`,
      tools: [bingTool]
    };

    const response = await withRetry(async () => {
      const result = await fetch(`${this.config.projectEndpoint}/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'api-version': this.config.apiVersion
        },
        body: JSON.stringify(agentPayload)
      });

      if (!result.ok) {
        const errorText = await result.text();
        throw new APIError(
          `Failed to create Azure AI Agent: ${result.status} ${errorText}`,
          'AGENT_CREATION_ERROR',
          result.status >= 500
        );
      }

      return result.json();
    });

    this.agentId = response.id;
    return this.agentId;
  }

  /**
   * Generate enhanced response with Bing search grounding
   * Integrates with existing evaluation and enhancement pipeline
   */
  async generateEnhancedResponse(
    query: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<AgentResponse> {
    await this.rateLimiter.waitForCapacity(0);

    onProgress?.('Initializing Azure AI Agent with Bing Search grounding...');
    const agentId = await this.initializeAgent(model);

    onProgress?.('Creating enhanced research thread...');
    const threadResponse = await withRetry(async () => {
      const result = await fetch(`${this.config.projectEndpoint}/threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'api-version': this.config.apiVersion
        },
        body: JSON.stringify({})
      });

      if (!result.ok) {
        throw new APIError(
          `Failed to create thread: ${result.status}`,
          'THREAD_CREATION_ERROR',
          result.status >= 500
        );
      }

      return result.json();
    });

    const threadId = threadResponse.id;

    // Enhanced query with evaluation instructions
    const enhancedQuery = this.enhanceQueryForEvaluation(query, effort);

    onProgress?.('Sending query with Bing search enhancement...');
    await withRetry(async () => {
      const result = await fetch(`${this.config.projectEndpoint}/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'api-version': this.config.apiVersion
        },
        body: JSON.stringify({
          role: 'user',
          content: enhancedQuery
        })
      });

      if (!result.ok) {
        throw new APIError(
          `Failed to send message: ${result.status}`,
          'MESSAGE_SEND_ERROR',
          result.status >= 500
        );
      }

      return result.json();
    });

    onProgress?.('Processing with Bing search and quality enhancement...');
    const runResponse = await withRetry(async () => {
      const result = await fetch(`${this.config.projectEndpoint}/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'api-version': this.config.apiVersion
        },
        body: JSON.stringify({
          assistant_id: agentId,
          additional_instructions: this.getEffortBasedInstructions(effort)
        })
      });

      if (!result.ok) {
        throw new APIError(
          `Failed to create run: ${result.status}`,
          'RUN_CREATION_ERROR',
          result.status >= 500
        );
      }

      return result.json();
    });

    const runId = runResponse.id;

    onProgress?.('Waiting for enhanced research completion...');
    await this.pollRunCompletion(threadId, runId, onProgress);

    onProgress?.('Retrieving enhanced results with source evaluation...');
    const messages = await this.getThreadMessages(threadId);
    
    return this.processAgentResponse(messages, query, effort);
  }

  /**
   * Enhance query with evaluation and quality assessment instructions
   */
  private enhanceQueryForEvaluation(query: string, effort: EffortType): string {
    let instructions = `Research Query: ${query}\n\n`;
    
    instructions += `ENHANCEMENT REQUIREMENTS:\n`;
    instructions += `1. Use Bing grounding to find the most current and comprehensive information\n`;
    instructions += `2. Evaluate each source for credibility, recency, and relevance\n`;
    instructions += `3. Provide confidence levels for key findings (High/Medium/Low)\n`;
    instructions += `4. Identify any conflicting information and explain discrepancies\n`;
    instructions += `5. Structure response with clear sections and actionable insights\n\n`;

    switch (effort) {
      case EffortType.HIGH:
        instructions += `DEEP RESEARCH MODE:\n`;
        instructions += `- Search multiple angles and perspectives\n`;
        instructions += `- Cross-reference findings across sources\n`;
        instructions += `- Provide comprehensive analysis with detailed evaluation\n`;
        instructions += `- Include statistical data and expert opinions where available\n`;
        instructions += `- Suggest areas for further investigation\n`;
        break;
      case EffortType.MEDIUM:
        instructions += `BALANCED RESEARCH MODE:\n`;
        instructions += `- Focus on authoritative sources and recent information\n`;
        instructions += `- Provide clear synthesis with source attribution\n`;
        instructions += `- Include confidence assessments for major points\n`;
        break;
      case EffortType.LOW:
        instructions += `FOCUSED RESEARCH MODE:\n`;
        instructions += `- Target most relevant and current information\n`;
        instructions += `- Provide concise but well-sourced response\n`;
        break;
    }

    instructions += `\nPLEASE RESPOND WITH:`;
    instructions += `\n1. Main findings with confidence levels`;
    instructions += `\n2. Source evaluation and quality assessment`;
    instructions += `\n3. Key insights and actionable information`;
    instructions += `\n4. Areas of uncertainty or need for further research`;

    return instructions;
  }

  /**
   * Get effort-based additional instructions for the agent
   */
  private getEffortBasedInstructions(effort: EffortType): string {
    switch (effort) {
      case EffortType.HIGH:
        return 'Conduct thorough, multi-perspective research with comprehensive source evaluation and detailed analysis.';
      case EffortType.MEDIUM:
        return 'Provide balanced research with good source coverage and clear evaluation of findings.';
      case EffortType.LOW:
        return 'Focus on most relevant information with basic source evaluation.';
      default:
        return 'Provide research with appropriate source evaluation.';
    }
  }

  /**
   * Poll run completion with progress updates
   */
  private async pollRunCompletion(
    threadId: string,
    runId: string,
    onProgress?: (message: string) => void
  ): Promise<any> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${this.config.projectEndpoint}/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'api-version': this.config.apiVersion
          }
        }
      );

      const run = await response.json();

      switch (run.status) {
        case 'completed':
          onProgress?.('Research enhancement completed successfully');
          return run;
        case 'failed':
          throw new APIError('Agent run failed', 'RUN_FAILED', false);
        case 'cancelled':
          throw new APIError('Agent run was cancelled', 'RUN_CANCELLED', false);
        case 'in_progress':
          onProgress?.('Enhancing research with Bing search data...');
          break;
        case 'queued':
          onProgress?.('Research request queued for processing...');
          break;
        default:
          onProgress?.(`Research status: ${run.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new APIError('Run polling timeout', 'POLLING_TIMEOUT', true);
  }

  /**
   * Get thread messages with response parsing
   */
  private async getThreadMessages(threadId: string): Promise<any[]> {
    const response = await fetch(
      `${this.config.projectEndpoint}/threads/${threadId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'api-version': this.config.apiVersion
        }
      }
    );

    if (!response.ok) {
      throw new APIError('Failed to retrieve messages', 'MESSAGE_RETRIEVAL_ERROR', true);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Process agent response with quality evaluation and enhancement integration
   */
  private async processAgentResponse(
    messages: any[],
    _originalQuery: string,
    effort: EffortType
  ): Promise<AgentResponse> {
    const assistantMessage = messages.find(m => m.role === 'assistant');
    
    if (!assistantMessage) {
      throw new APIError('No assistant response found', 'NO_RESPONSE', false);
    }

    const content = assistantMessage.content?.[0]?.text?.value || '';
    const annotations = assistantMessage.content?.[0]?.text?.annotations || [];

    // Extract sources from annotations (Bing grounding citations)
    const sources: Citation[] = [];
    const bingQueries: string[] = [];

    for (const annotation of annotations) {
      if (annotation.type === 'file_citation' && annotation.text) {
        // Extract Bing search citations
        sources.push({
          url: annotation.file_citation?.file_id || '',
          title: annotation.text,
          accessed: new Date().toISOString(),
          relevanceScore: 0.8 // Base relevance, will be enhanced
        });
      }
    }

    // Enhance sources with quality evaluation using existing logic
    const enhancedSources = await this.enhanceSourceQuality(sources);

    // Calculate confidence using existing ResearchUtilities
    const mockResult: EnhancedResearchResults = {
      synthesis: content,
      sources: enhancedSources,
      queryType: 'comprehensive',
      confidenceScore: 0.7,
      evaluationMetadata: this.generateEvaluationMetadata(content, enhancedSources, effort)
    };

    const confidence = ResearchUtilities.calculateConfidenceScore(mockResult);

    // Check if self-healing is needed using existing logic
    const needsHealing = ResearchUtilities.needsSelfHealing(mockResult);
    
    if (needsHealing) {
      console.log('Azure AI Agent response flagged for potential enhancement');
    }

    return {
      text: content,
      sources: enhancedSources,
      bingQueries,
      confidence,
      evaluationMetadata: mockResult.evaluationMetadata as EvaluationMetadata
    };
  }

  /**
   * Enhance source quality using existing evaluation patterns
   */
  private async enhanceSourceQuality(sources: Citation[]): Promise<Citation[]> {
    return sources.map(source => {
      // Apply existing quality evaluation logic
      let relevanceScore = source.relevanceScore || 0.5;

      // Quality indicators from existing function calling service
      const qualityIndicators = {
        high: ['.gov', '.edu', 'wikipedia.org', 'nature.com', 'science.org', 'arxiv.org'],
        medium: ['.org', 'medium.com', 'github.com'],
        low: ['.com', '.net']
      };

      if (source.url) {
        for (const [quality, domains] of Object.entries(qualityIndicators)) {
          if (domains.some(domain => source.url!.includes(domain))) {
            relevanceScore = quality === 'high' ? 0.9 : quality === 'medium' ? 0.6 : 0.3;
            break;
          }
        }
      }

      return {
        ...source,
        relevanceScore: Math.max(relevanceScore, 0.3) // Minimum threshold
      };
    });
  }

  /**
   * Generate evaluation metadata using existing patterns
   */
  private generateEvaluationMetadata(
    content: string,
    sources: Citation[],
    _effort: EffortType
  ): EvaluationMetadata {
    const wordCount = content.split(/\s+/).length;
    const sourceCount = sources.length;
    const avgSourceQuality = sourceCount > 0 ? sources.reduce((sum, s) => sum + (s.relevanceScore || 0.5), 0) / sourceCount : 0;

    const completeness = Math.min(0.3 + (wordCount / 1000) * 0.4 + (sourceCount / 10) * 0.3, 1);
    const accuracy = Math.min(0.4 + avgSourceQuality * 0.6, 1);
    const clarity = Math.min(0.5 + (wordCount > 100 && wordCount < 2000 ? 0.3 : 0) + 0.2, 1);
    const quality = avgSourceQuality > 0.7 && sourceCount >= 3 ? 'excellent' : sourceCount >= 2 ? 'good' : 'needs_improvement';
    
    const overallScore = (completeness + accuracy + clarity) / 3;

    return {
      completeness,
      accuracy,
      clarity,
      quality,
      confidence: accuracy,
      refinementCount: 0,
      timestamp: new Date().toISOString(),
      feedback: '',
      overallScore
    };
  }

  /**
   * Integration point for existing research pipeline
   */
  async generateText(
    prompt: string,
    model: ModelType,
    effort: EffortType
  ): Promise<{ text: string; sources?: Citation[] }> {
    const response = await this.generateEnhancedResponse(prompt, model, effort);
    return {
      text: response.text,
      sources: response.sources
    };
  }
}