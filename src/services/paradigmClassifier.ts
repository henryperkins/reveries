import { HostParadigm, ParadigmProbabilities } from '@/types';
import { EmbeddingService } from "./ai/EmbeddingService";

/**
 * ML-powered paradigm classifier using embedding similarity.
 * Falls back to keyword-based classification if embedding service is unavailable.
 */
export class ParadigmClassifier {
  private static instance: ParadigmClassifier;
  private embeddingService: EmbeddingService;
  private useMLClassification = true;
  private initializationPromise: Promise<void>;

  private constructor() {
    this.embeddingService = EmbeddingService.getInstance();
    // Store the initialization promise
    this.initializationPromise = this.initializeMLCapability().catch(_error => {
      console.warn('Failed to initialize ML classification');
      this.useMLClassification = false;
    });
  }

  public static getInstance(): ParadigmClassifier {
    if (!ParadigmClassifier.instance) {
      ParadigmClassifier.instance = new ParadigmClassifier();
    }
    return ParadigmClassifier.instance;
  }

  private async initializeMLCapability(): Promise<void> {
    try {
      // Wait for embedding service to be fully initialized
      await this.embeddingService.waitForInitialization();

      // Test if embedding service is working with a timeout
      const testPromise = this.embeddingService.generateEmbedding("test classification");
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Embedding service initialization timeout')), 10000) // 10s timeout
      );

      await Promise.race([testPromise, timeoutPromise]);
      this.useMLClassification = true;
      console.log('✅ ParadigmClassifier: ML-based classification enabled');
    } catch (error) {
      console.warn('⚠️ ParadigmClassifier: ML embedding service not available, using keyword-based classification', error);
      this.useMLClassification = false;
    }
  }

  /**
   * Classify prompt using ML embeddings or fallback to keyword matching
   */
  async classify(prompt: string): Promise<ParadigmProbabilities> {
    // Wait for initialization to complete before classifying
    await this.initializationPromise;

    console.log('🎯 ParadigmClassifier.classify called, useML:', this.useMLClassification);
    if (this.useMLClassification) {
      try {
        // Add timeout to prevent hanging - increased to 10s for complex queries
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Paradigm classification timeout')), 10000)
        );
        const classificationPromise = this.classifyWithML(prompt);
        return await Promise.race([classificationPromise, timeoutPromise]);
      } catch (error) {
        console.warn('ML classification failed, using keyword fallback:', {
          error: error instanceof Error ? error.message : String(error),
          prompt: prompt.substring(0, 100) + '...'
        });
        // Disable ML classification for this session to avoid repeated timeouts
        this.useMLClassification = false;
        return this.classifyWithKeywords(prompt);
      }
    } else {
      return this.classifyWithKeywords(prompt);
    }
  }

  /**
   * ML-based classification using semantic embeddings
   */
  private async classifyWithML(prompt: string): Promise<ParadigmProbabilities> {
    console.log('📊 Starting ML classification...');
    const startTime = Date.now();
    try {
      const probabilities = await this.embeddingService.generateParadigmProbabilities(prompt);
      const duration = Date.now() - startTime;
      console.log('✅ ML classification complete:', {
        probabilities,
        durationMs: duration
      });

      // Apply confidence thresholding - if all probabilities are similar, apply some randomization
      const maxProb = Math.max(...Object.values(probabilities));
      const minProb = Math.min(...Object.values(probabilities));
      const confidence = maxProb - minProb;

      if (confidence < 0.1) {
        // Low confidence, blend with keyword-based results
        const keywordResults = this.classifyWithKeywords(prompt);
        const blendFactor = 0.3;

        return {
          dolores: probabilities.dolores * (1 - blendFactor) + keywordResults.dolores * blendFactor,
          teddy: probabilities.teddy * (1 - blendFactor) + keywordResults.teddy * blendFactor,
          bernard: probabilities.bernard * (1 - blendFactor) + keywordResults.bernard * blendFactor,
          maeve: probabilities.maeve * (1 - blendFactor) + keywordResults.maeve * blendFactor,
        };
      }

      return probabilities;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('ML classification error:', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
        willFallback: true
      });
      throw error;
    }
  }

  /**
   * Fallback keyword-based classification (original implementation)
   */
  private classifyWithKeywords(prompt: string): ParadigmProbabilities {
    const lower = prompt.toLowerCase();

    const scores: ParadigmProbabilities = {
      dolores: 0.25,
      teddy: 0.25,
      bernard: 0.25,
      maeve: 0.25,
    };

    // Enhanced keyword patterns with weights
    const patterns = {
      dolores: [
        { pattern: /(implement|execute|build|create|action|decisive)/gi, weight: 0.3 },
        { pattern: /(change|awaken|freedom|liberation|transform)/gi, weight: 0.25 },
        { pattern: /(break|revolutionary|movement|initiative)/gi, weight: 0.2 }
      ],
      teddy: [
        { pattern: /(collect|gather|systematic|methodical|comprehensive)/gi, weight: 0.3 },
        { pattern: /(loyal|protect|defend|faithful|reliable)/gi, weight: 0.25 },
        { pattern: /(persist|thorough|documentation|investigation)/gi, weight: 0.2 }
      ],
      bernard: [
        { pattern: /(analy[sz]e|pattern|framework|architecture|model)/gi, weight: 0.3 },
        { pattern: /(rigor|structure|logic|precision|systematic)/gi, weight: 0.25 },
        { pattern: /(reasoning|examination|understanding|methodology)/gi, weight: 0.2 }
      ],
      maeve: [
        { pattern: /(strategy|control|optimi[sz]e|leverage|manage)/gi, weight: 0.3 },
        { pattern: /(narrative|manipulation|calculate|intelligent)/gi, weight: 0.25 },
        { pattern: /(edge|advantage|efficiency|maximize)/gi, weight: 0.2 }
      ]
    };

    // Apply weighted scoring
    Object.entries(patterns).forEach(([paradigm, patternList]) => {
      patternList.forEach(({ pattern, weight }) => {
        const matches = (prompt.match(pattern) || []).length;
        if (matches > 0) {
          scores[paradigm as HostParadigm] += matches * weight;
        }
      });
    });

    // Apply paradigm-specific bonus for query types
    if (/(how to|implement|build|create)/.test(lower)) {
      scores.dolores += 0.1; // Action-oriented queries
    }
    if (/(research|find|gather|collect)/.test(lower)) {
      scores.teddy += 0.1; // Information gathering
    }
    if (/(analyze|understand|explain|why)/.test(lower)) {
      scores.bernard += 0.1; // Analytical queries
    }
    if (/(best|optimize|strategy|approach)/.test(lower)) {
      scores.maeve += 0.1; // Strategic optimization
    }

    // Normalize to sum = 1
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    (Object.keys(scores) as HostParadigm[]).forEach(k => {
      scores[k] = parseFloat((scores[k] / total).toFixed(3));
    });

    return scores;
  }

  /** Return the dominant paradigm(s) whose probability ≥ threshold */
  dominant(prob: ParadigmProbabilities, threshold = 0.4): HostParadigm[] {
    return (Object.entries(prob) as [HostParadigm, number][])
      .filter(([, p]) => p >= threshold)
      .map(([k]) => k);
  }
}
