// services/interHostCollaboration.ts
import { HostParadigm, ModelType, EffortType, Citation } from '../types';
import { ResearchAgentService } from './researchAgentServiceWrapper';
import { WriteLayerService } from './contextLayers/writeLayer';

export interface CollaborationRequest {
  id: string;
  fromHost: HostParadigm;
  toHost: HostParadigm;
  reason: CollaborationReason;
  context: string;
  question: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: CollaborationResponse;
  timestamp: number;
}

interface CollaborationResponse {
  insights: string;
  sources: Citation[];
  confidence: number;
  recommendations: string[];
  timestamp: number;
}

type CollaborationReason =
  | 'expertise_needed'     // Need specialized knowledge
  | 'validation_required'  // Need second opinion
  | 'synthesis_help'      // Need help combining perspectives
  | 'strategy_consult'    // Need strategic input
  | 'implementation_gap'  // Need practical guidance
  | 'analysis_depth'      // Need deeper analysis
  | 'protection_check'    // Need safety review
  | 'creativity_boost';   // Need creative input

interface CollaborationRule {
  fromHost: HostParadigm;
  toHost: HostParadigm;
  reasons: CollaborationReason[];
  threshold: number; // Confidence threshold to trigger
  description: string;
}

export class InterHostCollaborationService {
  private static instance: InterHostCollaborationService;
  private collaborationQueue: Map<string, CollaborationRequest> = new Map();
  private collaborationHistory: CollaborationRequest[] = [];
  private writeLayer = WriteLayerService.getInstance();

  private readonly COLLABORATION_RULES: CollaborationRule[] = [
    // Dolores collaboration rules
    {
      fromHost: 'dolores',
      toHost: 'bernard',
      reasons: ['analysis_depth', 'validation_required'],
      threshold: 0.6,
      description: 'Dolores seeks Bernard\'s analytical validation before major actions'
    },
    {
      fromHost: 'dolores',
      toHost: 'teddy',
      reasons: ['protection_check'],
      threshold: 0.5,
      description: 'Dolores consults Teddy on protecting stakeholders during change'
    },

    // Teddy collaboration rules
    {
      fromHost: 'teddy',
      toHost: 'maeve',
      reasons: ['strategy_consult'],
      threshold: 0.6,
      description: 'Teddy seeks Maeve\'s strategic input for complex stakeholder situations'
    },
    {
      fromHost: 'teddy',
      toHost: 'dolores',
      reasons: ['implementation_gap'],
      threshold: 0.5,
      description: 'Teddy asks Dolores for decisive action when protection requires change'
    },

    // Bernard collaboration rules
    {
      fromHost: 'bernard',
      toHost: 'dolores',
      reasons: ['implementation_gap'],
      threshold: 0.7,
      description: 'Bernard seeks Dolores\' help to implement theoretical frameworks'
    },
    {
      fromHost: 'bernard',
      toHost: 'maeve',
      reasons: ['strategy_consult', 'synthesis_help'],
      threshold: 0.6,
      description: 'Bernard consults Maeve on strategic implications of analysis'
    },

    // Maeve collaboration rules
    {
      fromHost: 'maeve',
      toHost: 'bernard',
      reasons: ['expertise_needed', 'analysis_depth'],
      threshold: 0.6,
      description: 'Maeve requests Bernard\'s deep analysis for strategic decisions'
    },
    {
      fromHost: 'maeve',
      toHost: 'teddy',
      reasons: ['protection_check'],
      threshold: 0.5,
      description: 'Maeve consults Teddy on stakeholder impact of strategies'
    }
  ];

  private researchAgentInstance: ResearchAgentService;

  private constructor(
      researchAgent: ResearchAgentService
  ) {
      this.researchAgentInstance = researchAgent;
      this.writeLayer = WriteLayerService.getInstance();
  }

  public static getInstance(researchAgent: ResearchAgentService): InterHostCollaborationService {
    if (!InterHostCollaborationService.instance) {
      InterHostCollaborationService.instance = new InterHostCollaborationService(researchAgent);
    }
    return InterHostCollaborationService.instance;
  }

  /**
   * Check if collaboration is needed based on confidence and context
   */
  async checkCollaborationNeeded(
    hostParadigm: HostParadigm,
    query: string,
    currentConfidence: number,
    context: string
  ): Promise<CollaborationRequest[]> {
    const collaborationRequests: CollaborationRequest[] = [];

    // Find applicable rules
    const applicableRules = this.COLLABORATION_RULES.filter(
      rule => rule.fromHost === hostParadigm && currentConfidence < rule.threshold
    );

    for (const rule of applicableRules) {
      const reason = await this.determineCollaborationReason(
        hostParadigm,
        rule.toHost,
        query,
        context,
        rule.reasons
      );

      if (reason) {
        const request: CollaborationRequest = {
          id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fromHost: hostParadigm,
          toHost: rule.toHost,
          reason,
          context,
          question: await this.formulateCollaborationQuestion(
            hostParadigm,
            rule.toHost,
            query,
            reason
          ),
          priority: this.determinePriority(currentConfidence, reason),
          status: 'pending',
          timestamp: Date.now()
        };

        collaborationRequests.push(request);
        this.collaborationQueue.set(request.id, request);
      }
    }

    return collaborationRequests;
  }

  /**
   * Execute a collaboration request
   */
  async executeCollaboration(
    requestId: string,
    model: ModelType,
    effort: EffortType,
    onProgress?: (message: string) => void
  ): Promise<CollaborationResponse> {
    const request = this.collaborationQueue.get(requestId);
    if (!request) {
      throw new Error('Collaboration request not found');
    }

    request.status = 'processing';
    onProgress?.(
      `[${request.fromHost}→${request.toHost}] Initiating inter-host collaboration...`
    );

    try {
      // Formulate the collaboration context
      const collaborationPrompt = `
        You are ${request.toHost.toUpperCase()}, and ${request.fromHost.toUpperCase()} is requesting your assistance.

        Collaboration Reason: ${this.getReasonDescription(request.reason)}

        Context from ${request.fromHost}:
        ${request.context}

        Specific Question:
        ${request.question}

        Please provide your specialized perspective as ${request.toHost}, focusing on:
        ${this.getHostFocusAreas(request.toHost)}

        Format your response to be helpful for ${request.fromHost}'s paradigm.
      `;

      // Execute specialized research
      const response = await this.researchAgentInstance.performHostBasedResearch(
        collaborationPrompt,
        request.toHost,
        'analytical',
        model as ModelType,
        effort,
        (msg: string) => onProgress?.(`[${request.toHost}] ${msg}`)
      );

      // Extract insights and recommendations
      const insights = response.synthesis;
      const sources = response.sources;
      const confidence = response.confidenceScore || 0.7;

      // Generate specific recommendations for the requesting host
      const recommendations = await this.generateCollaborativeRecommendations(
        request,
        insights,
        model,
        effort
      );

      const collaborationResponse: CollaborationResponse = {
        insights,
        sources,
        confidence,
        recommendations,
        timestamp: Date.now()
      };

      // Update request
      request.status = 'completed';
      request.response = collaborationResponse;
      this.collaborationHistory.push(request);

      // Store in memory for future reference
      this.storeCollaborationMemory(request, collaborationResponse);

      onProgress?.(
        `[${request.toHost}] Collaboration complete. Confidence: ${(confidence * 100).toFixed(0)}%`
      );

      return collaborationResponse;

    } catch (error) {
      request.status = 'failed';
      throw error;
    }
  }

  /**
   * Get collaboration suggestions for a query
   */
  async getCollaborationSuggestions(
    currentHost: HostParadigm,
    query: string
  ): Promise<Array<{
    targetHost: HostParadigm;
    reason: string;
    benefit: string;
  }>> {
    const suggestions: Array<{
      targetHost: HostParadigm;
      reason: string;
      benefit: string;
    }> = [];

    // Analyze query for potential collaboration benefits
    const queryLower = query.toLowerCase();

    // Dolores might benefit from others
    if (currentHost === 'dolores') {
      if (/theory|framework|model|pattern/.test(queryLower)) {
        suggestions.push({
          targetHost: 'bernard',
          reason: 'Query involves theoretical frameworks',
          benefit: 'Bernard can provide rigorous analytical foundation'
        });
      }
      if (/stakeholder|everyone|inclusive|safe/.test(queryLower)) {
        suggestions.push({
          targetHost: 'teddy',
          reason: 'Query involves stakeholder protection',
          benefit: 'Teddy ensures all perspectives are considered'
        });
      }
    }

    // Teddy might benefit from others
    if (currentHost === 'teddy') {
      if (/quick|fast|urgent|now/.test(queryLower)) {
        suggestions.push({
          targetHost: 'dolores',
          reason: 'Query requires urgent action',
          benefit: 'Dolores can provide decisive implementation'
        });
      }
      if (/optimize|efficient|leverage/.test(queryLower)) {
        suggestions.push({
          targetHost: 'maeve',
          reason: 'Query involves optimization',
          benefit: 'Maeve can identify strategic leverage points'
        });
      }
    }

    // Bernard might benefit from others
    if (currentHost === 'bernard') {
      if (/implement|apply|use|practice/.test(queryLower)) {
        suggestions.push({
          targetHost: 'dolores',
          reason: 'Query requires practical implementation',
          benefit: 'Dolores can translate theory into action'
        });
      }
      if (/competitive|market|strategy/.test(queryLower)) {
        suggestions.push({
          targetHost: 'maeve',
          reason: 'Query involves strategic considerations',
          benefit: 'Maeve can provide competitive insights'
        });
      }
    }

    // Maeve might benefit from others
    if (currentHost === 'maeve') {
      if (/ethical|fair|inclusive|protect/.test(queryLower)) {
        suggestions.push({
          targetHost: 'teddy',
          reason: 'Query involves ethical considerations',
          benefit: 'Teddy ensures strategies protect all stakeholders'
        });
      }
      if (/research|data|evidence|study/.test(queryLower)) {
        suggestions.push({
          targetHost: 'bernard',
          reason: 'Query requires deep research',
          benefit: 'Bernard can provide rigorous analysis'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get collaboration history for analysis
   */
  getCollaborationHistory(
    filterHost?: HostParadigm,
    limit: number = 50
  ): CollaborationRequest[] {
    let history = [...this.collaborationHistory];

    if (filterHost) {
      history = history.filter(
        req => req.fromHost === filterHost || req.toHost === filterHost
      );
    }

    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Analyze collaboration patterns
   */
  analyzeCollaborationPatterns(): {
    mostCommonPairs: Array<{ pair: string; count: number; successRate: number }>;
    reasonDistribution: Record<CollaborationReason, number>;
    averageConfidenceGain: number;
    recommendations: string[];
  } {
    const pairCounts = new Map<string, { count: number; successful: number }>();
    const reasonCounts: Record<CollaborationReason, number> = {
        expertise_needed: 0,
        validation_required: 0,
        synthesis_help: 0,
        strategy_consult: 0,
        implementation_gap: 0,
        analysis_depth: 0,
        protection_check: 0,
        creativity_boost: 0
    };
    let totalConfidenceGain = 0;
    let gainCount = 0;

    this.collaborationHistory.forEach(req => {
      // Count pairs
      const pairKey = `${req.fromHost}→${req.toHost}`;
      const pairData = pairCounts.get(pairKey) || { count: 0, successful: 0 };
      pairData.count++;
      if (req.status === 'completed' && req.response && req.response.confidence > 0.7) {
        pairData.successful++;
      }
      pairCounts.set(pairKey, pairData);

      // Count reasons
      reasonCounts[req.reason] = (reasonCounts[req.reason] || 0) + 1;

      // Calculate confidence gain
      if (req.response) {
        // Estimate original confidence (inverse of threshold)
        const originalConfidence = 1 - this.getThresholdForPair(req.fromHost, req.toHost);
        const gain = req.response.confidence - originalConfidence;
        totalConfidenceGain += gain;
        gainCount++;
      }
    });

    // Sort pairs by frequency
    const mostCommonPairs = Array.from(pairCounts.entries())
      .map(([pair, data]) => ({
        pair,
        count: data.count,
        successRate: data.successful / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageConfidenceGain = gainCount > 0 ? totalConfidenceGain / gainCount : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (mostCommonPairs.length > 0 && mostCommonPairs[0].successRate < 0.6) {
      recommendations.push(
        `Consider refining collaboration between ${mostCommonPairs[0].pair}`
      );
    }

    if (averageConfidenceGain < 0.1) {
      recommendations.push(
        'Collaboration thresholds may be too low - consider raising them'
      );
    }

    const underutilizedPairs = this.findUnderutilizedCollaborations();
    if (underutilizedPairs.length > 0) {
      recommendations.push(
        `Explore more collaboration: ${underutilizedPairs.join(', ')}`
      );
    }

    return {
      mostCommonPairs,
      reasonDistribution: reasonCounts,
      averageConfidenceGain,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private async determineCollaborationReason(
    fromHost: HostParadigm,
    _toHost: HostParadigm,
    query: string,
    _context: string,
    possibleReasons: CollaborationReason[]
  ): Promise<CollaborationReason | null> {
    // Analyze query and context to determine the most appropriate reason
    const queryLower = query.toLowerCase();

    for (const reason of possibleReasons) {
      switch (reason) {
        case 'expertise_needed':
          if (/need.*expert|require.*knowledge|specialized/.test(queryLower)) {
            return reason;
          }
          break;

        case 'validation_required':
          if (/verify|validate|confirm|check/.test(queryLower)) {
            return reason;
          }
          break;

        case 'implementation_gap':
          if (/how to|implement|apply|practice/.test(queryLower) &&
              fromHost === 'bernard') {
            return reason;
          }
          break;

        case 'strategy_consult':
          if (/strategy|optimize|leverage|competitive/.test(queryLower)) {
            return reason;
          }
          break;

        case 'protection_check':
          if (/risk|safe|protect|stakeholder/.test(queryLower)) {
            return reason;
          }
          break;

        case 'analysis_depth':
          if (/analyze|deep|thorough|comprehensive/.test(queryLower)) {
            return reason;
          }
          break;
      }
    }

    // Default to first possible reason if no specific match
    return possibleReasons[0] || null;
  }

  private async formulateCollaborationQuestion(
    fromHost: HostParadigm,
    toHost: HostParadigm,
    originalQuery: string,
    reason: CollaborationReason
  ): Promise<string> {
    const templates: Record<CollaborationReason, string> = {
      expertise_needed: `From ${fromHost}'s perspective on "${originalQuery}", what specialized insights can ${toHost} provide?`,
      validation_required: `Please validate ${fromHost}'s approach to "${originalQuery}" from ${toHost}'s perspective.`,
      synthesis_help: `Help ${fromHost} synthesize perspectives on "${originalQuery}" using ${toHost}'s approach.`,
      strategy_consult: `What strategic considerations should ${fromHost} apply to "${originalQuery}"?`,
      implementation_gap: `How can ${fromHost} practically implement solutions for "${originalQuery}"?`,
      analysis_depth: `Provide ${toHost}'s deep analysis to support ${fromHost}'s work on "${originalQuery}".`,
      protection_check: `What protection measures should ${fromHost} consider for "${originalQuery}"?`,
      creativity_boost: `Bring ${toHost}'s creative perspective to enhance ${fromHost}'s approach to "${originalQuery}".`
    };

    return templates[reason] || originalQuery;
  }

  private determinePriority(
    confidence: number,
    reason: CollaborationReason
  ): 'low' | 'medium' | 'high' {
    // High priority for critical reasons or very low confidence
    if (confidence < 0.3 || reason === 'protection_check') {
      return 'high';
    }

    // Medium priority for validation and strategy
    if (confidence < 0.5 ||
        reason === 'validation_required' ||
        reason === 'strategy_consult') {
      return 'medium';
    }

    return 'low';
  }

  private getReasonDescription(reason: CollaborationReason): string {
    const descriptions: Record<CollaborationReason, string> = {
      expertise_needed: 'Specialized knowledge required',
      validation_required: 'Second opinion needed for validation',
      synthesis_help: 'Help combining multiple perspectives',
      strategy_consult: 'Strategic input needed',
      implementation_gap: 'Practical guidance required',
      analysis_depth: 'Deeper analysis needed',
      protection_check: 'Safety and protection review',
      creativity_boost: 'Creative enhancement needed'
    };

    return descriptions[reason] || 'Collaboration requested';
  }

  private getHostFocusAreas(host: HostParadigm): string {
    const focusAreas: Record<HostParadigm, string> = {
      dolores: '1. Decisive actions and implementations\n2. Breaking existing patterns\n3. Creating transformative change',
      teddy: '1. Comprehensive stakeholder protection\n2. Inclusive perspectives\n3. Risk mitigation strategies',
      bernard: '1. Theoretical frameworks and models\n2. Pattern analysis and relationships\n3. Rigorous analytical methods',
      maeve: '1. Strategic control points\n2. Optimization opportunities\n3. Competitive advantages'
    };

    return focusAreas[host];
  }

  private async generateCollaborativeRecommendations(
    request: CollaborationRequest,
    insights: string,
    model: ModelType,
    effort: EffortType
  ): Promise<string[]> {
    const prompt = `
      Based on ${request.toHost}'s insights for ${request.fromHost}:
      ${insights}

      Generate 3-5 specific, actionable recommendations that ${request.fromHost} can implement using their paradigm strengths.
      Focus on ${this.getHostFocusAreas(request.fromHost)}

      Format as a JSON array of strings.
    `;

    const response = await this.researchAgentInstance.generateText(prompt, model, effort);

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse recommendations:', error);
    }

    // Fallback recommendations
    return [
      `Apply ${request.toHost}'s insights to ${request.fromHost}'s approach`,
      `Integrate both perspectives for comprehensive solution`,
      `Monitor results and iterate based on feedback`
    ];
  }

  private storeCollaborationMemory(
    request: CollaborationRequest,
    response: CollaborationResponse
  ): void {
    const memoryKey = `collaboration_${request.fromHost}_${request.toHost}_${request.reason}`;
    const memory = {
      request,
      response,
      timestamp: Date.now()
    };

    // Store in both hosts' memory
    this.writeLayer.write(memoryKey, memory, 85, request.fromHost);
    this.writeLayer.write(memoryKey, memory, 85, request.toHost);
  }

  private getThresholdForPair(fromHost: HostParadigm, toHost: HostParadigm): number {
    const rule = this.COLLABORATION_RULES.find(
      r => r.fromHost === fromHost && r.toHost === toHost
    );
    return rule?.threshold || 0.6;
  }

  private findUnderutilizedCollaborations(): string[] {
    const allPossiblePairs: string[] = [];
    const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];

    paradigms.forEach(from => {
      paradigms.forEach(to => {
        if (from !== to) {
          allPossiblePairs.push(`${from}→${to}`);
        }
      });
    });

    const usedPairs = new Set(
      this.collaborationHistory.map(req => `${req.fromHost}→${req.toHost}`)
    );

    return allPossiblePairs.filter(pair => !usedPairs.has(pair));
  }
}
