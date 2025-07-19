/**
 * Vector Store Configuration and Factory
 * Manages different vector store backends for production deployment
 */

export interface VectorStoreConfig {
  type: 'pinecone' | 'weaviate' | 'pgvector' | 'memory';
  connection: any;
  indexName?: string;
  dimensions: number;
  options?: Record<string, any>;
}

export interface VectorStoreAdapter {
  name: string;
  upsert(vectors: VectorUpsertRequest[]): Promise<void>;
  query(request: VectorQueryRequest): Promise<VectorQueryResponse>;
  delete(ids: string[]): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface VectorUpsertRequest {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface VectorQueryRequest {
  vector: number[];
  topK: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface VectorQueryResponse {
  matches: Array<{
    id: string;
    score: number;
    values?: number[];
    metadata?: Record<string, any>;
  }>;
}

/**
 * Pinecone adapter
 */
export class PineconeAdapter implements VectorStoreAdapter {
  name = 'pinecone';
  private index: any;

  constructor(private config: VectorStoreConfig) {}

  async initialize(): Promise<void> {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      });
      
      this.index = pinecone.index(this.config.indexName || 'reveries-memories');
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  async upsert(vectors: VectorUpsertRequest[]): Promise<void> {
    await this.index.upsert(vectors);
  }

  async query(request: VectorQueryRequest): Promise<VectorQueryResponse> {
    const result = await this.index.query(request);
    return result;
  }

  async delete(ids: string[]): Promise<void> {
    await this.index.delete1({ ids });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const stats = await this.index.describeIndexStats();
      return stats !== null;
    } catch {
      return false;
    }
  }
}

/**
 * PostgreSQL with pgvector adapter
 */
export class PgVectorAdapter implements VectorStoreAdapter {
  name = 'pgvector';
  private pool: any;

  constructor(private config: VectorStoreConfig) {}

  async initialize(): Promise<void> {
    try {
      const { Pool } = await import('pg');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      // Ensure table exists
      await this.createTable();
    } catch (error) {
      console.error('Failed to initialize pgvector:', error);
      throw error;
    }
  }

  private async createTable(): Promise<void> {
    const query = `
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS vector_memories (
        id TEXT PRIMARY KEY,
        embedding vector(${this.config.dimensions}),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS vector_memories_embedding_idx 
      ON vector_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `;
    
    await this.pool.query(query);
  }

  async upsert(vectors: VectorUpsertRequest[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const vector of vectors) {
        await client.query(
          `INSERT INTO vector_memories (id, embedding, metadata) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (id) DO UPDATE SET 
           embedding = $2, metadata = $3, created_at = CURRENT_TIMESTAMP`,
          [vector.id, JSON.stringify(vector.values), JSON.stringify(vector.metadata)]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async query(request: VectorQueryRequest): Promise<VectorQueryResponse> {
    let whereClause = '';
    const params: any[] = [JSON.stringify(request.vector), request.topK];
    let paramIndex = 3;

    // Build filter conditions
    if (request.filter) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(request.filter)) {
        conditions.push(`metadata->>'${key}' = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    const query = `
      SELECT id, 1 - (embedding <=> $1) as score, 
             ${request.includeMetadata ? 'metadata,' : ''} 
             ${request.includeValues ? 'embedding,' : ''}
      FROM vector_memories 
      ${whereClause}
      ORDER BY embedding <=> $1 
      LIMIT $2
    `;

    const result = await this.pool.query(query, params);
    
    return {
      matches: result.rows.map((row: any) => ({
        id: row.id,
        score: row.score,
        metadata: request.includeMetadata ? row.metadata : undefined,
        values: request.includeValues ? JSON.parse(row.embedding) : undefined
      }))
    };
  }

  async delete(ids: string[]): Promise<void> {
    await this.pool.query(
      'DELETE FROM vector_memories WHERE id = ANY($1)',
      [ids]
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory adapter for development
 */
export class MemoryAdapter implements VectorStoreAdapter {
  name = 'memory';
  private vectors: Map<string, VectorUpsertRequest> = new Map();

  async upsert(vectors: VectorUpsertRequest[]): Promise<void> {
    vectors.forEach(vector => {
      this.vectors.set(vector.id, vector);
    });
  }

  async query(request: VectorQueryRequest): Promise<VectorQueryResponse> {
    const results: Array<{ id: string; score: number; metadata?: any; values?: number[] }> = [];
    
    for (const [id, vector] of this.vectors.entries()) {
      // Apply metadata filters
      if (request.filter && !this.matchesFilter(vector.metadata, request.filter)) {
        continue;
      }
      
      // Calculate cosine similarity
      const score = this.cosineSimilarity(request.vector, vector.values);
      
      results.push({
        id,
        score,
        metadata: request.includeMetadata ? vector.metadata : undefined,
        values: request.includeValues ? vector.values : undefined
      });
    }
    
    // Sort by score and return top K
    results.sort((a, b) => b.score - a.score);
    
    return {
      matches: results.slice(0, request.topK)
    };
  }

  async delete(ids: string[]): Promise<void> {
    ids.forEach(id => this.vectors.delete(id));
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private matchesFilter(metadata: any, filter: Record<string, any>): boolean {
    if (!metadata) return false;
    
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Vector store factory
 */
export class VectorStoreFactory {
  static async create(config: VectorStoreConfig): Promise<VectorStoreAdapter> {
    let adapter: VectorStoreAdapter;
    
    switch (config.type) {
      case 'pinecone':
        adapter = new PineconeAdapter(config);
        break;
      case 'pgvector':
        adapter = new PgVectorAdapter(config);
        break;
      case 'memory':
      default:
        adapter = new MemoryAdapter();
        break;
    }
    
    if ('initialize' in adapter) {
      await (adapter as any).initialize();
    }
    
    return adapter;
  }

  static getConfigFromEnv(): VectorStoreConfig {
    const type = (process.env.VECTOR_STORE_TYPE as any) || 'memory';
    const dimensions = parseInt(process.env.VECTOR_DIMENSIONS || '384');
    
    return {
      type,
      connection: {},
      indexName: process.env.VECTOR_INDEX_NAME || 'reveries-memories',
      dimensions,
      options: {}
    };
  }
}