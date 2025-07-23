import { HostParadigm } from '@/types';
import { WriteLayerService } from './writeLayer';
import { EmbeddingService, EmbeddingVector } from '@/services/ai/EmbeddingService';
import { VectorStoreAdapter, VectorStoreFactory } from '@/services/storage/vectorStoreConfig';
import crypto from 'crypto';

type MemoryType = 'procedural' | 'episodic' | 'semantic';

interface VectorMemory {
  id: string;
  content: any;
  contentText: string;
  timestamp: number;
  paradigm: HostParadigm;
  density: number;
  type: MemoryType;
  taskId?: string;
  embedding: EmbeddingVector;
  metadata: {
    keywords?: string[];
    relatedMemories?: string[];
    importance?: number;
  };
}

interface VectorSearchResult {
  memory: VectorMemory;
  similarity: number;
  relevanceReason?: string;
}

/**
 * Production-ready WriteLayer with real vector embeddings
 * Supports multiple vector store backends
 */
export class ProductionWriteLayer {
  private static prodInstance: ProductionWriteLayer;
  private writeLayer: WriteLayerService;
  private embeddingService: EmbeddingService;
  private vectorMemories: Map<string, VectorMemory> = new Map();
  
  // Production services
  private vectorStore?: VectorStoreAdapter;
  private cache?: any; // Redis for fast access
  private isInitialized = false;
  private initializationPromise?: Promise<void>;
  
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MAX_RELATED_MEMORIES = 5;

  private constructor() {
    this.writeLayer = WriteLayerService.getInstance();
    this.embeddingService = EmbeddingService.getInstance();
    this.initializeVectorStore();
  }

  public static getInstance(): ProductionWriteLayer {
    if (!ProductionWriteLayer.prodInstance) {
      ProductionWriteLayer.prodInstance = new ProductionWriteLayer();
    }
    return ProductionWriteLayer.prodInstance;
  }

  private async initializeVectorStore(): Promise<void> {
    // Return existing initialization if in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Return immediately if already initialized
    if (this.isInitialized) return;
    
    // Create and store the initialization promise
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } finally {
      // Clear the promise after completion (success or failure)
      this.initializationPromise = undefined;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      const config = VectorStoreFactory.getConfigFromEnv();
      this.vectorStore = await VectorStoreFactory.create(config);
      
      // Test connection
      const isHealthy = await this.vectorStore.isHealthy();
      if (!isHealthy) {
        console.warn('Vector store health check failed, falling back to memory store');
        this.vectorStore = await VectorStoreFactory.create({ ...config, type: 'memory' });
      }
      
      console.log(`Initialized ${this.vectorStore.name} vector store`);
      
      // Initialize cache if configured
      await this.initializeCache();
      
      // Set initialized flag only after everything succeeds
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      // Fallback to memory store
      this.vectorStore = await VectorStoreFactory.create({ 
        type: 'memory', 
        connection: {}, 
        dimensions: 384 
      });
      this.isInitialized = true;
    }
  }

  /**
   * Enhanced write method with real embeddings
   */
  async writeWithEmbedding(
    key: string,
    value: any,
    density: number,
    paradigm: HostParadigm
  ): Promise<void> {
    const memoryType = this.classifyMemoryType(key, value);
    const contentText = this.extractTextContent(value);
    
    // Generate real embedding
    const embedding = await this.embeddingService.generateEmbedding(contentText);
    
    const memory: VectorMemory = {
      id: `${paradigm}:${key}:${Date.now()}`,
      content: value,
      contentText,
      timestamp: Date.now(),
      paradigm,
      density,
      type: memoryType,
      taskId: this.generateTaskId(key, paradigm),
      embedding,
      metadata: {
        keywords: this.extractKeywords(contentText),
        importance: density / 100
      }
    };

    // Find related memories
    const relatedMemories = await this.findRelatedMemories(embedding, paradigm);
    if (relatedMemories.length > 0) {
      memory.metadata.relatedMemories = relatedMemories.map(r => r.memory.id);
    }

    // Store in vector store
    await this.storeMemory(memory);
    
    // Update local cache
    this.vectorMemories.set(memory.id, memory);
    
    // Call writeLayer for backward compatibility
    this.writeLayer.write(key, value, density, paradigm);
  }

  /**
   * Store memory in the appropriate backend
   */
  private async storeMemory(memory: VectorMemory): Promise<void> {
    // Ensure vector store is initialized
    await this.initializeVectorStore();
    
    if (this.vectorStore) {
      // Store in vector database
      await this.vectorStore.upsert([{
        id: memory.id,
        values: memory.embedding.values,
        metadata: {
          paradigm: memory.paradigm,
          type: memory.type,
          density: memory.density,
          timestamp: memory.timestamp,
          contentText: memory.contentText.substring(0, 1000), // Truncate for metadata
          ...memory.metadata
        }
      }]);
    }
    
    // Always maintain local cache for fast access
    this.vectorMemories.set(memory.id, memory);

    // Cache frequently accessed memories in Redis
    if (memory.density > 70) {
      await this.cacheMemory(memory);
    }
  }

  /**
   * Semantic search for memories
   */
  async searchMemories(
    query: string,
    paradigm?: HostParadigm,
    options: {
      topK?: number;
      memoryTypes?: MemoryType[];
      minDensity?: number;
      timeRange?: { start: Date; end: Date };
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { topK = 10, memoryTypes, minDensity = 0, timeRange } = options;
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Ensure vector store is initialized
    await this.initializeVectorStore();
    
    if (this.vectorStore) {
      // Search in vector store
      const filter: any = {};
      if (paradigm) filter.paradigm = paradigm;
      if (memoryTypes?.length === 1) filter.type = memoryTypes[0];
      if (minDensity > 0) filter.density = minDensity;
      if (timeRange) {
        filter.timestamp_start = timeRange.start.getTime();
        filter.timestamp_end = timeRange.end.getTime();
      }

      const results = await this.vectorStore.query({
        vector: queryEmbedding.values,
        topK,
        filter,
        includeMetadata: true
      });

      return results.matches.map((match: any) => ({
        memory: this.reconstructMemory(match),
        similarity: match.score,
        relevanceReason: this.explainRelevance(match.score, match.metadata)
      }));
    } else {
      // Fallback to in-memory search
      return this.searchInMemory(queryEmbedding, paradigm, options);
    }
  }

  /**
   * Find memories related to a given embedding
   */
  private async findRelatedMemories(
    embedding: EmbeddingVector,
    paradigm: HostParadigm,
    limit: number = this.MAX_RELATED_MEMORIES
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];
    
    // Search through existing memories
    for (const [, memory] of this.vectorMemories.entries()) {
      if (memory.paradigm !== paradigm) continue;
      
      const similarity = this.embeddingService.calculateSimilarity(
        embedding,
        memory.embedding
      );
      
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        results.push({
          memory,
          similarity,
          relevanceReason: `High semantic similarity (${(similarity * 100).toFixed(1)}%)`
        });
      }
    }
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * In-memory search fallback
   */
  private async searchInMemory(
    queryEmbedding: EmbeddingVector,
    paradigm?: HostParadigm,
    options?: any
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];
    
    for (const [, memory] of this.vectorMemories.entries()) {
      // Apply filters
      if (paradigm && memory.paradigm !== paradigm) continue;
      if (options?.memoryTypes && !options.memoryTypes.includes(memory.type)) continue;
      if (options?.minDensity && memory.density < options.minDensity) continue;
      if (options?.timeRange) {
        const timestamp = new Date(memory.timestamp);
        if (timestamp < options?.timeRange?.start || timestamp > options?.timeRange?.end) {
          continue;
        }
      }
      
      // Calculate similarity
      const similarity = this.embeddingService.calculateSimilarity(
        queryEmbedding,
        memory.embedding
      );
      
      results.push({
        memory,
        similarity,
        relevanceReason: this.explainRelevance(similarity, memory.metadata)
      });
    }
    
    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.topK || 10);
  }

  /**
   * Extract text content from various value types
   */
  private extractTextContent(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'object' && value !== null) {
      // Handle specific object types
      if (value.text) return value.text;
      if (value.content) return this.extractTextContent(value.content);
      if (value.body) return value.body;
      
      // Default to JSON stringification
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Extract keywords for metadata
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Simple keyword extraction - in production use TF-IDF or similar
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Get top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Explain why a memory is relevant
   */
  private explainRelevance(similarity: number, metadata: any): string {
    const reasons: string[] = [];
    
    if (similarity >= 0.9) {
      reasons.push('Very high semantic similarity');
    } else if (similarity >= 0.8) {
      reasons.push('High semantic similarity');
    } else if (similarity >= 0.7) {
      reasons.push('Good semantic similarity');
    }
    
    if (metadata.importance >= 0.8) {
      reasons.push('High importance memory');
    }
    
    if (metadata.type === 'procedural') {
      reasons.push('Action-oriented memory');
    } else if (metadata.type === 'semantic') {
      reasons.push('Factual knowledge');
    }
    
    return reasons.join(', ') || 'Relevant match';
  }

  /**
   * Cache memory for fast access
   */
  private async cacheMemory(memory: VectorMemory): Promise<void> {
    if (this.cache) {
      const cacheKey = `memory:${memory.id}`;
      const ttl = memory.density > 90 ? 3600 : 1800; // 1 hour or 30 minutes
      
      await this.cache.setex(
        cacheKey,
        ttl,
        JSON.stringify({
          ...memory,
          embedding: undefined // Don't cache the full embedding
        })
      );
    }
  }

  /**
   * Reconstruct memory from vector store result
   */
  private reconstructMemory(match: any): VectorMemory {
    return {
      id: match.id,
      content: match.metadata.contentText, // Simplified reconstruction
      contentText: match.metadata.contentText,
      timestamp: match.metadata.timestamp,
      paradigm: match.metadata.paradigm,
      density: match.metadata.density,
      type: match.metadata.type,
      embedding: { values: match.values, dimensions: match.values.length, model: 'unknown' },
      metadata: {
        keywords: match.metadata.keywords,
        relatedMemories: match.metadata.relatedMemories,
        importance: match.metadata.importance
      }
    };
  }

  /**
   * Initialize Redis cache
   */
  private async initializeCache(): Promise<void> {
    if (!process.env.REDIS_URL) {
      console.log('No Redis URL configured, skipping cache initialization');
      return;
    }

    try {
      const Redis = await import('ioredis');
      this.cache = new Redis.default(process.env.REDIS_URL);
      
      // Test connection
      await this.cache.ping();
      console.log('Initialized Redis cache');
    } catch (error) {
      console.error('Failed to initialize Redis cache:', error);
      this.cache = null;
    }
  }

  /**
   * Generate task ID with paradigm context
   */
  private generateTaskId(key: string, paradigm: HostParadigm): string {
    const timestamp = Date.now().toString();
    return crypto.createHash('md5')
      .update(`${paradigm}:${key}:${timestamp}`)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Classify memory type based on content
   */
  private classifyMemoryType(key: string, value: any): MemoryType {
    const keyLower = key.toLowerCase();
    const valueStr = this.extractTextContent(value).toLowerCase();
    
    // Procedural: steps, actions, how-to
    if (keyLower.includes('step') || keyLower.includes('action') || 
        keyLower.includes('process') || valueStr.includes('step') || 
        valueStr.includes('how to') || valueStr.includes('procedure')) {
      return 'procedural';
    }
    
    // Episodic: events, experiences, specific instances
    if (keyLower.includes('query') || keyLower.includes('result') || 
        keyLower.includes('research') || valueStr.includes('when') || 
        valueStr.includes('happened') || valueStr.includes('experience')) {
      return 'episodic';
    }
    
    // Semantic: facts, concepts, general knowledge
    return 'semantic';
  }
}