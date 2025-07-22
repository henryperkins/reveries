// services/paradigmLearningService.ts
import { HostParadigm, ParadigmProbabilities } from '../types';

interface LearningRecord {
  query: string;
  paradigm: HostParadigm;
  probabilities: ParadigmProbabilities;
  confidence: number;
  userSatisfaction?: number; // 1-5 scale
  timestamp: number;
  queryFeatures: QueryFeatures;
  outcome: 'success' | 'failed' | 'pending';
}

interface QueryFeatures {
  wordCount: number;
  hasActionWords: boolean;
  hasAnalyticalWords: boolean;
  hasProtectiveWords: boolean;
  hasStrategicWords: boolean;
  queryType: 'question' | 'command' | 'exploration';
  domain?: string;
}

interface ParadigmPattern {
  paradigm: HostParadigm;
  features: Partial<QueryFeatures>;
  successRate: number;
  sampleQueries: string[];
  averageConfidence: number;
}

export class ParadigmLearningService {
  private static instance: ParadigmLearningService;
  private learningHistory: Map<string, LearningRecord> = new Map();
  private paradigmPatterns: Map<HostParadigm, ParadigmPattern[]> = new Map();
  private adaptiveWeights: Map<string, number> = new Map();

  private readonly LEARNING_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MIN_SAMPLES_FOR_PATTERN = 5;
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  private constructor() {
    this.initializePatterns();
    this.loadPersistedLearning();
  }

  public static getInstance(): ParadigmLearningService {
    if (!ParadigmLearningService.instance) {
      ParadigmLearningService.instance = new ParadigmLearningService();
    }
    return ParadigmLearningService.instance;
  }

  /**
   * Record a research interaction for learning
   */
  recordInteraction(
    query: string,
    paradigm: HostParadigm,
    probabilities: ParadigmProbabilities,
    confidence: number
  ): string {
    const interactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const features = this.extractQueryFeatures(query);

    const record: LearningRecord = {
      query,
      paradigm,
      probabilities,
      confidence,
      timestamp: Date.now(),
      queryFeatures: features,
      outcome: 'pending'
    };

    this.learningHistory.set(interactionId, record);

    // Trigger pattern analysis in background
    setTimeout(() => this.analyzePatterns(), 100);

    return interactionId;
  }

  /**
   * Update interaction with user feedback
   */
  updateFeedback(
    interactionId: string,
    satisfaction: number, // 1-5 scale
    wasHelpful: boolean
  ): void {
    const record = this.learningHistory.get(interactionId);
    if (!record) return;

    record.userSatisfaction = satisfaction;
    record.outcome = wasHelpful ? 'success' : 'failed';

    // Update adaptive weights based on feedback
    this.updateAdaptiveWeights(record);

    // Persist learning
    this.persistLearning();
  }

  /**
   * Get learned adjustments for paradigm probabilities
   */
  getLearnedAdjustments(
    query: string,
    baseProbabilities: ParadigmProbabilities
  ): ParadigmProbabilities {
    const features = this.extractQueryFeatures(query);
    const adjusted = { ...baseProbabilities };

    // Apply learned patterns
    for (const [paradigm, patterns] of this.paradigmPatterns) {
      const matchingPatterns = patterns.filter(pattern =>
        this.patternMatches(features, pattern.features)
      );

      if (matchingPatterns.length > 0) {
        // Average the success rates of matching patterns
        const avgSuccessRate = matchingPatterns.reduce((sum, p) =>
          sum + p.successRate, 0
        ) / matchingPatterns.length;

        // Adjust probability based on success rate
        const adjustment = (avgSuccessRate - 0.5) * 0.2; // ±0.1 max adjustment
        adjusted[paradigm] = Math.max(0, Math.min(1, adjusted[paradigm] + adjustment));
      }
    }

    // Apply domain-specific weights
    const domain = this.identifyDomain(query);
    if (domain) {
      const domainKey = `${domain}:`;
      for (const paradigm of ['dolores', 'teddy', 'bernard', 'maeve'] as HostParadigm[]) {
        const weight = this.adaptiveWeights.get(`${domainKey}${paradigm}`) || 1;
        adjusted[paradigm] *= weight;
      }
    }

    // Renormalize
    const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
    for (const paradigm in adjusted) {
      adjusted[paradigm as HostParadigm] /= sum;
    }

    return adjusted;
  }

  /**
   * Get learning insights for a paradigm
   */
  getParadigmInsights(paradigm: HostParadigm): {
    successRate: number;
    commonPatterns: string[];
    strongDomains: string[];
    recentTrend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  } {
    const recentRecords = Array.from(this.learningHistory.values())
      .filter(r =>
        r.paradigm === paradigm &&
        r.timestamp > Date.now() - this.LEARNING_WINDOW &&
        r.outcome !== 'pending'
      );

    if (recentRecords.length === 0) {
      return {
        successRate: 0.5,
        commonPatterns: [],
        strongDomains: [],
        recentTrend: 'stable',
        recommendations: ['Insufficient data for analysis']
      };
    }

    // Calculate success rate
    const successCount = recentRecords.filter(r => r.outcome === 'success').length;
    const successRate = successCount / recentRecords.length;

    // Find common patterns
    const patterns = this.paradigmPatterns.get(paradigm) || [];
    const commonPatterns = patterns
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map(p => this.describePattern(p.features));

    // Identify strong domains
    const domainSuccess = new Map<string, { success: number; total: number }>();
    recentRecords.forEach(record => {
      const domain = record.queryFeatures.domain || 'general';
      const stats = domainSuccess.get(domain) || { success: 0, total: 0 };
      stats.total++;
      if (record.outcome === 'success') stats.success++;
      domainSuccess.set(domain, stats);
    });

    const strongDomains = Array.from(domainSuccess.entries())
      .filter(([_, stats]) => stats.total >= 3)
      .map(([domain, stats]) => ({ domain, rate: stats.success / stats.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map(item => item.domain);

    // Analyze trend
    const recentTrend = this.analyzeTrend(recentRecords);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      paradigm,
      successRate,
      patterns,
      strongDomains,
      recentTrend
    );

    return {
      successRate,
      commonPatterns,
      strongDomains,
      recentTrend,
      recommendations
    };
  }

  /**
   * Extract features from a query
   */
  private extractQueryFeatures(query: string): QueryFeatures {
    const lower = query.toLowerCase();
    const words = query.split(/\s+/);

    return {
      wordCount: words.length,
      hasActionWords: /\b(implement|create|build|change|transform|start|do)\b/.test(lower),
      hasAnalyticalWords: /\b(analyze|examine|investigate|pattern|framework|theory)\b/.test(lower),
      hasProtectiveWords: /\b(protect|safe|comprehensive|all|stakeholder|consider)\b/.test(lower),
      hasStrategicWords: /\b(strategy|optimize|leverage|control|advantage|compete)\b/.test(lower),
      queryType: query.endsWith('?') ? 'question' :
                 /^(create|build|make|implement)/.test(lower) ? 'command' :
                 'exploration',
      domain: this.identifyDomain(query)
    };
  }

  /**
   * Identify domain from query
   */
  private identifyDomain(query: string): string | undefined {
    const domains = {
      technology: /\b(software|code|program|tech|ai|ml|data|cloud|cyber)\b/i,
      business: /\b(business|market|strategy|revenue|customer|sales|growth)\b/i,
      science: /\b(research|study|experiment|hypothesis|theory|scientific)\b/i,
      education: /\b(learn|teach|education|student|course|curriculum)\b/i,
      health: /\b(health|medical|patient|treatment|disease|wellness)\b/i,
      environment: /\b(climate|environment|sustainable|green|renewable|eco)\b/i,
      creative: /\b(design|art|creative|music|write|story|content)\b/i,
      social: /\b(social|community|people|society|culture|human)\b/i
    };

    for (const [domain, pattern] of Object.entries(domains)) {
      if (pattern.test(query)) return domain;
    }

    return undefined;
  }

  /**
   * Check if features match a pattern
   */
  private patternMatches(
    features: QueryFeatures,
    pattern: Partial<QueryFeatures>
  ): boolean {
    for (const [key, value] of Object.entries(pattern)) {
      if (features[key as keyof QueryFeatures] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update adaptive weights based on feedback
   */
  private updateAdaptiveWeights(record: LearningRecord): void {
    const domain = record.queryFeatures.domain;
    if (!domain) return;

    const key = `${domain}:${record.paradigm}`;
    const currentWeight = this.adaptiveWeights.get(key) || 1.0;

    // Adjust weight based on satisfaction
    const adjustment = record.userSatisfaction
      ? (record.userSatisfaction - 3) * 0.05 // ±0.1 per satisfaction point
      : 0;

    const newWeight = Math.max(0.5, Math.min(1.5, currentWeight + adjustment));
    this.adaptiveWeights.set(key, newWeight);
  }

  /**
   * Analyze patterns in learning history
   */
  private analyzePatterns(): void {
    const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];

    paradigms.forEach(paradigm => {
      const records = Array.from(this.learningHistory.values())
        .filter(r =>
          r.paradigm === paradigm &&
          r.outcome !== 'pending' &&
          r.timestamp > Date.now() - this.LEARNING_WINDOW
        );

      if (records.length < this.MIN_SAMPLES_FOR_PATTERN) return;

      // Group by feature combinations
      const featureGroups = this.groupByFeatures(records);

      // Create patterns from successful groups
      const patterns: ParadigmPattern[] = [];

      featureGroups.forEach((group, features) => {
        const successCount = group.filter(r => r.outcome === 'success').length;
        const successRate = successCount / group.length;

        if (successRate >= this.CONFIDENCE_THRESHOLD) {
          patterns.push({
            paradigm,
            features: JSON.parse(features),
            successRate,
            sampleQueries: group.slice(0, 3).map(r => r.query),
            averageConfidence: group.reduce((sum, r) => sum + r.confidence, 0) / group.length
          });
        }
      });

      this.paradigmPatterns.set(paradigm, patterns);
    });
  }

  /**
   * Group records by feature combinations
   */
  private groupByFeatures(
    records: LearningRecord[]
  ): Map<string, LearningRecord[]> {
    const groups = new Map<string, LearningRecord[]>();

    records.forEach(record => {
      // Create feature signature
      const signature = JSON.stringify({
        queryType: record.queryFeatures.queryType,
        hasActionWords: record.queryFeatures.hasActionWords,
        hasAnalyticalWords: record.queryFeatures.hasAnalyticalWords,
        domain: record.queryFeatures.domain
      });

      const group = groups.get(signature) || [];
      group.push(record);
      groups.set(signature, group);
    });

    return groups;
  }

  /**
   * Analyze trend in recent performance
   */
  private analyzeTrend(records: LearningRecord[]): 'improving' | 'declining' | 'stable' {
    if (records.length < 10) return 'stable';

    // Sort by timestamp
    const sorted = records.sort((a, b) => a.timestamp - b.timestamp);

    // Compare first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstSuccess = firstHalf.filter(r => r.outcome === 'success').length / firstHalf.length;
    const secondSuccess = secondHalf.filter(r => r.outcome === 'success').length / secondHalf.length;

    const difference = secondSuccess - firstSuccess;

    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Describe a pattern in human-readable form
   */
  private describePattern(features: Partial<QueryFeatures>): string {
    const parts: string[] = [];

    if (features.queryType) {
      parts.push(`${features.queryType}s`);
    }
    if (features.hasActionWords) {
      parts.push('action-oriented');
    }
    if (features.hasAnalyticalWords) {
      parts.push('analytical');
    }
    if (features.domain) {
      parts.push(`in ${features.domain}`);
    }

    return parts.join(' ') || 'general queries';
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(
    paradigm: HostParadigm,
    successRate: number,
    patterns: ParadigmPattern[],
    strongDomains: string[],
    trend: 'improving' | 'declining' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    if (successRate < 0.6) {
      recommendations.push(`Consider adjusting ${paradigm} classification thresholds`);
    }

    if (trend === 'declining') {
      recommendations.push(`Review recent ${paradigm} failures for common issues`);
    }

    if (strongDomains.length > 0) {
      recommendations.push(
        `${paradigm} performs well in: ${strongDomains.join(', ')}`
      );
    }

    if (patterns.length > 0) {
      const topPattern = patterns[0];
      recommendations.push(
        `Strong pattern: ${this.describePattern(topPattern.features)}`
      );
    }

    return recommendations;
  }

  /**
   * Initialize default patterns
   */
  private initializePatterns(): void {
    // Initialize with some baseline patterns
    // These would be refined through actual usage
  }

  /**
   * Load persisted learning data
   */
  private loadPersistedLearning(): void {
    try {
      // In a real implementation, load from localStorage or database
      const stored = localStorage.getItem('paradigm_learning');
      if (stored) {
        const data = JSON.parse(stored);
        // Restore learning history and patterns
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  }

  /**
   * Persist learning data
   */
  private persistLearning(): void {
    try {
      // In a real implementation, save to localStorage or database
      const data = {
        history: Array.from(this.learningHistory.entries()),
        patterns: Array.from(this.paradigmPatterns.entries()),
        weights: Array.from(this.adaptiveWeights.entries()),
        timestamp: Date.now()
      };

      // Note: In the actual implementation, you'd need to handle storage limits
      // and potentially use IndexedDB for larger datasets
      console.log('Learning data ready to persist:', data);
    } catch (error) {
      console.error('Failed to persist learning data:', error);
    }
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData(): {
    records: LearningRecord[];
    patterns: [HostParadigm, ParadigmPattern[]][];
    weights: [string, number][];
    insights: Record<HostParadigm, any>;
  } {
    const insights: Record<HostParadigm, any> = {} as any;
    const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];

    paradigms.forEach(paradigm => {
      insights[paradigm] = this.getParadigmInsights(paradigm);
    });

    return {
      records: Array.from(this.learningHistory.values()),
      patterns: Array.from(this.paradigmPatterns.entries()),
      weights: Array.from(this.adaptiveWeights.entries()),
      insights
    };
  }
}
