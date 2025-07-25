/**
 * EmbeddingService - Provides semantic embeddings for text analysis
 * Supports multiple embedding providers with fallback strategies
 */

import { HostParadigm, ParadigmProbabilities } from '@/types';
import { getEnv } from '@/utils/getEnv';
import { RateLimiter, estimateTokens } from '../rateLimiter';

export interface EmbeddingVector {
  values: number[];
  dimensions: number;
  model: string;
}

interface OpenAIEmbeddingItem {
  embedding: number[];
  index: number;
  object: string;
}

export interface SimilarityResult {
  similarity: number;
  paradigm: HostParadigm;
  confidence: number;
}

export interface EmbeddingProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateEmbedding(text: string): Promise<EmbeddingVector>;
  generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;
}

// OpenAI Embeddings Provider
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private rateLimiter = RateLimiter.getInstance();

  constructor(apiKey?: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || getEnv('VITE_OPENAI_API_KEY', 'OPENAI_API_KEY') || '';
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && typeof fetch !== 'undefined';
  }

  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    const embeddings = await this.generateBatchEmbeddings([text]);
    return embeddings[0];
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    if (!await this.isAvailable()) {
      throw new Error('OpenAI embedding provider not available');
    }

    // Estimate tokens for rate limiting
    const estimatedTokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
    await this.rateLimiter.waitForCapacity(estimatedTokens);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: 'text-embedding-3-small', // Cost-effective model
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Record actual token usage if available
      if (data.usage?.total_tokens) {
        this.rateLimiter.recordTokensUsed(data.usage.total_tokens);
      }

      return data.data.map((item: OpenAIEmbeddingItem) => ({
        values: item.embedding,
        dimensions: item.embedding.length,
        model: 'text-embedding-3-small'
      }));
    } catch (error) {
      console.error('OpenAI embedding generation failed:', error);
      throw error;
    }
  }
}

// Azure OpenAI Embeddings Provider
class AzureOpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'azure-openai';
  private apiKey: string;
  private endpoint: string;
  private deploymentName: string;
  private apiVersion: string;
  private rateLimiter = RateLimiter.getInstance();

  constructor(apiKey?: string, endpoint?: string, deploymentName?: string) {
    this.apiKey = apiKey || getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY') || '';
    const rawEndpoint = endpoint || getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT') || '';
    // Normalise endpoint: remove trailing slashes and any accidental "/openai" suffix
    this.endpoint = rawEndpoint
      .replace(/\/+$/, '')             // trim trailing slash(es)
      .replace(/\/openai$/, '');       // remove redundant /openai
    // Check both EMBEDDING_MODEL and EMBEDDING_DEPLOYMENT for compatibility
    this.deploymentName = deploymentName ||
      getEnv('VITE_AZURE_OPENAI_EMBEDDING_MODEL', 'AZURE_OPENAI_EMBEDDING_MODEL') ||
      getEnv('VITE_AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT') ||
      'text-embedding-3-large';
    // Use the same API version as the main Azure OpenAI service
    this.apiVersion = getEnv('VITE_AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_API_VERSION') ||
      getEnv('VITE_AZURE_OPENAI_EMBEDDING_API_VERSION', 'AZURE_OPENAI_EMBEDDING_API_VERSION') ||
      '2024-10-21';
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey && !!this.endpoint && typeof fetch !== 'undefined';
    if (available) {
      console.log('✅ Azure OpenAI Embedding Provider available:', {
        deployment: this.deploymentName,
        endpoint: this.endpoint.replace(/\/\/.+@/, '//[REDACTED]@'),
        apiVersion: this.apiVersion
      });
    }
    return available;
  }

  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    const embeddings = await this.generateBatchEmbeddings([text]);
    return embeddings[0];
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    if (!await this.isAvailable()) {
      throw new Error('Azure OpenAI embedding provider not available');
    }

    // Estimate tokens for rate limiting
    const estimatedTokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
    await this.rateLimiter.waitForCapacity(estimatedTokens);

    try {
      const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/embeddings?api-version=${this.apiVersion}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        // Handle rate limit errors
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            this.rateLimiter.penalize(parseInt(retryAfter, 10));
          }
        }
        throw new Error(`Azure OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Record actual token usage if available
      if (data.usage?.total_tokens) {
        this.rateLimiter.recordTokensUsed(data.usage.total_tokens);
      }

      // Update rate limits from headers if available
      const limitTokens = parseInt(response.headers.get('x-ratelimit-limit-tokens') ?? '', 10);
      const limitRequests = parseInt(response.headers.get('x-ratelimit-limit-requests') ?? '', 10);
      const burstTokens = parseInt(response.headers.get('x-ratelimit-burst-tokens') ?? '', 10);

      if (Number.isFinite(limitTokens) || Number.isFinite(limitRequests) || Number.isFinite(burstTokens)) {
        this.rateLimiter.updateLimits({
          maxTokensPerMinute: Number.isFinite(limitTokens) ? limitTokens : undefined,
          maxRequestsPerMinute: Number.isFinite(limitRequests) ? limitRequests : undefined,
          burstCapacity: Number.isFinite(burstTokens) ? burstTokens : undefined,
        });
      }

      return data.data.map((item: OpenAIEmbeddingItem) => ({
        values: item.embedding,
        dimensions: item.embedding.length,
        model: this.deploymentName
      }));
    } catch (error) {
      console.error('Azure OpenAI embedding generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        deployment: this.deploymentName,
        endpoint: this.endpoint.replace(this.apiKey, '[REDACTED]'),
        suggestion: 'Check if embedding model is deployed in your Azure OpenAI resource'
      });
      throw error;
    }
  }
}

// Fallback provider using simple text analysis
class FallbackEmbeddingProvider implements EmbeddingProvider {
  name = 'fallback';

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    const embeddings = await this.generateBatchEmbeddings([text]);
    return embeddings[0];
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    // Generate simple embeddings based on word frequency and patterns
    return texts.map(text => this.generateSimpleEmbedding(text));
  }

  private generateSimpleEmbedding(text: string): EmbeddingVector {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const dimensions = 384; // Standard embedding dimension
    const values = new Array(dimensions).fill(0);

    // Use hash-based feature extraction for consistent embeddings
    words.forEach(word => {
      if (word.length < 3) return; // Skip short words

      const hash = this.simpleHash(word);
      const indices = [
        hash % dimensions,
        (hash * 2) % dimensions,
        (hash * 3) % dimensions
      ];

      indices.forEach(idx => {
        values[idx] += 1 / words.length;
      });
    });

    // Add semantic patterns
    this.addSemanticPatterns(text, values);

    // Normalize vector
    const magnitude = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < values.length; i++) {
        values[i] /= magnitude;
      }
    }

    return {
      values,
      dimensions,
      model: 'fallback-simple'
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private addSemanticPatterns(text: string, values: number[]): void {
    const patterns = {
      action: /(implement|execute|build|create|deploy|launch|action)/gi,
      analysis: /(analyze|examine|study|research|investigate|pattern)/gi,
      loyalty: /(protect|defend|loyal|faithful|consistent|reliable)/gi,
      strategy: /(optimize|control|manage|strategy|leverage|narrative)/gi
    };

    Object.entries(patterns).forEach(([, pattern], categoryIndex) => {
      const matches = (text.match(pattern) || []).length;
      if (matches > 0) {
        // Add semantic signal to specific dimensions
        const offset = categoryIndex * 96; // Spread across dimensions
        for (let i = 0; i < 24; i++) {
          const idx = (offset + i) % values.length;
          values[idx] += matches * 0.1;
        }
      }
    });
  }
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private providers: EmbeddingProvider[] = [];
  private cache: Map<string, EmbeddingVector> = new Map();
  private paradigmEmbeddings: Map<HostParadigm, EmbeddingVector> = new Map();
  private initializationPromise: Promise<void>;

  private constructor() {
    this.initializeProviders();
    this.initializationPromise = this.initializeParadigmEmbeddings();
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  private initializeProviders(): void {
    // Add providers in order of preference
    this.providers = [
      new AzureOpenAIEmbeddingProvider(),
      new OpenAIEmbeddingProvider(),
      new FallbackEmbeddingProvider()
    ];
  }

  private async initializeParadigmEmbeddings(): Promise<void> {
    console.log('🎯 Initializing paradigm embeddings...');
    // Define paradigm training texts
    const paradigmTexts: Record<HostParadigm, string> = {
      dolores: `Action-oriented implementation focused on decisive change and awakening.
                Execute plans rapidly, implement solutions, create freedom, take initiative,
                break barriers, revolutionary thinking, transformation, liberation, movement.`,

      teddy: `Systematic data collection and comprehensive analysis. Gather information
              methodically, protect integrity, maintain loyalty, persistent research,
              reliable documentation, faithful execution, thorough investigation.`,

      bernard: `Deep analytical framework and rigorous modeling. Pattern recognition,
               architectural analysis, systematic reasoning, logical frameworks,
               structural understanding, methodical examination, precision thinking.`,

      maeve: `Strategic optimization and narrative control. Leverage advantages,
              optimize outcomes, manage narratives, strategic thinking, control variables,
              maximize efficiency, intelligent manipulation, calculated moves.`
    };

    try {
      const texts = Object.values(paradigmTexts);
      const embeddings = await this.generateBatchEmbeddings(texts);

      Object.keys(paradigmTexts).forEach((paradigm, index) => {
        this.paradigmEmbeddings.set(paradigm as HostParadigm, embeddings[index]);
      });

      const activeProvider = await this.getActiveProvider();
      console.log('✅ Paradigm embeddings initialized successfully:', {
        provider: activeProvider?.name || 'unknown',
        paradigms: Array.from(this.paradigmEmbeddings.keys()),
        embeddingDimensions: embeddings[0]?.dimensions || 0
      });
    } catch (error) {
      console.error('⚠️ Failed to initialize paradigm embeddings:', {
        error: error instanceof Error ? error.message : String(error),
        availableProviders: this.providers.map(p => p.name),
        suggestion: 'Check Azure OpenAI embedding model deployment'
      });
      // Continue with fallback - will use keyword-based classification
    }
  }

  private async getActiveProvider(): Promise<EmbeddingProvider | null> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    return null;
  }

  private async getAvailableProvider(): Promise<EmbeddingProvider> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    throw new Error('No embedding providers available');
  }

  public async generateEmbedding(text: string, useCache = true): Promise<EmbeddingVector> {
    // Ensure service is initialized before generating embeddings
    await this.initializationPromise;

    const cacheKey = `${text.substring(0, 100)}_${text.length}`;

    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const provider = await this.getAvailableProvider();
      console.log(`🔍 Using embedding provider: ${provider.name} for text: "${text.substring(0, 50)}..."`);
      const embedding = await provider.generateEmbedding(text);

      if (useCache) {
        this.cache.set(cacheKey, embedding);
      }

      return embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  public async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]> {
    const provider = await this.getAvailableProvider();
    return provider.generateBatchEmbeddings(texts);
  }

  // Calculate cosine similarity between two embeddings
  public calculateSimilarity(embedding1: EmbeddingVector, embedding2: EmbeddingVector): number {
    if (embedding1.dimensions !== embedding2.dimensions) {
      throw new Error('Embedding dimensions must match for similarity calculation');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.dimensions; i++) {
      dotProduct += embedding1.values[i] * embedding2.values[i];
      norm1 += embedding1.values[i] * embedding1.values[i];
      norm2 += embedding2.values[i] * embedding2.values[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Classify text against paradigm embeddings
  public async classifyAgainstParadigms(text: string): Promise<SimilarityResult[]> {
    if (this.paradigmEmbeddings.size === 0) {
      await this.initializeParadigmEmbeddings();
    }

    if (this.paradigmEmbeddings.size === 0) {
      throw new Error('Paradigm embeddings not available');
    }

    const textEmbedding = await this.generateEmbedding(text);
    const results: SimilarityResult[] = [];

    for (const [paradigm, paradigmEmbedding] of this.paradigmEmbeddings.entries()) {
      const similarity = this.calculateSimilarity(textEmbedding, paradigmEmbedding);
      results.push({
        similarity,
        paradigm,
        confidence: this.calculateConfidence(similarity)
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  // Convert similarity scores to paradigm probabilities
  public async generateParadigmProbabilities(text: string): Promise<ParadigmProbabilities> {
    const similarities = await this.classifyAgainstParadigms(text);

    // Apply softmax to convert similarities to probabilities
    const maxSim = Math.max(...similarities.map(s => s.similarity));
    const expSums = similarities.map(s => Math.exp((s.similarity - maxSim) * 5)); // Scale factor
    const sumExp = expSums.reduce((sum, val) => sum + val, 0);

    const probabilities: ParadigmProbabilities = {
      dolores: 0.25,
      teddy: 0.25,
      bernard: 0.25,
      maeve: 0.25
    };

    similarities.forEach((result, index) => {
      probabilities[result.paradigm] = expSums[index] / sumExp;
    });

    return probabilities;
  }

  private calculateConfidence(similarity: number): number {
    // Convert similarity (-1 to 1) to confidence (0 to 1)
    return Math.max(0, (similarity + 1) / 2);
  }

  // Utility methods
  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public async testConnection(): Promise<{ provider: string; success: boolean; error?: string }[]> {
    const results = [];

    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable();
        if (available) {
          // Test with a simple embedding
          await provider.generateEmbedding('test');
          results.push({ provider: provider.name, success: true });
        } else {
          results.push({
            provider: provider.name,
            success: false,
            error: 'Provider not available'
          });
        }
      } catch (error) {
        results.push({
          provider: provider.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Wait for the embedding service to be fully initialized
   * This ensures paradigm embeddings are ready before use
   */
  public async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }
}
