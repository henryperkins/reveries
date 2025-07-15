import pg from 'pg';
import { ResearchStep, ResearchSource, ResearchParadigm } from '../types';

const { Pool } = pg;

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

interface AzureAIConfig {
  openaiEndpoint?: string;
  openaiKey?: string;
  embeddingModel?: string;
  deploymentName?: string;
}

export class DatabaseService {
  private pool: pg.Pool | null = null;
  private config: DatabaseConfig;
  private aiConfig: AzureAIConfig;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    this.config = this.getConfig();
    this.aiConfig = this.getAzureAIConfig();
  }

  private getConfig(): DatabaseConfig {
    const isAzure = process.env.PGHOST?.includes('database.azure.com');

    return {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'reveries',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      ssl: isAzure ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  private getAzureAIConfig(): AzureAIConfig {
    return {
      openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      openaiKey: process.env.AZURE_OPENAI_API_KEY,
      embeddingModel: process.env.AZURE_OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
    };
  }

  private async initializePool(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool(this.config);

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.retryCount
  ): Promise<T> {
    try {
      if (!this.pool) await this.initializePool();
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Retrying operation, ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    return retryableCodes.some(code => error.code === code);
  }

  async initializeSchema(): Promise<void> {
    await this.executeWithRetry(async () => {
      const client = await this.pool!.connect();
      try {
        await client.query('BEGIN');

        // Enable required extensions
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        await client.query('CREATE EXTENSION IF NOT EXISTS azure_ai');
        await client.query('CREATE EXTENSION IF NOT EXISTS azure_openai');

        // Research sessions table
        await client.query(`
          CREATE TABLE IF NOT EXISTS research_sessions (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'::jsonb
          )
        `);

        // Research graphs table
        await client.query(`
          CREATE TABLE IF NOT EXISTS research_graphs (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
            graph_data JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Enhanced research steps table with AI columns
        await client.query(`
          CREATE TABLE IF NOT EXISTS research_steps (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
            step_id VARCHAR(255) UNIQUE NOT NULL,
            type VARCHAR(50) NOT NULL,
            query TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536),
            summary TEXT,
            key_concepts JSONB DEFAULT '[]'::jsonb,
            sentiment_score FLOAT,
            parent_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'::jsonb
          )
        `);

        // AI insights table
        await client.query(`
          CREATE TABLE IF NOT EXISTS research_insights (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
            insight_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            confidence_score FLOAT,
            related_steps JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Research sources table
        await client.query(`
          CREATE TABLE IF NOT EXISTS research_sources (
            id SERIAL PRIMARY KEY,
            step_id VARCHAR(255) REFERENCES research_steps(step_id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            url TEXT,
            snippet TEXT,
            relevance_score FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create indexes for performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_research_steps_session
          ON research_steps(session_id)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_research_steps_embedding
          ON research_steps USING ivfflat (embedding vector_cosine_ops)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_research_sources_step
          ON research_sources(step_id)
        `);

        // Create function for Azure OpenAI embeddings if configured
        if (this.aiConfig.openaiEndpoint && this.aiConfig.openaiKey) {
          await client.query(`
            CREATE OR REPLACE FUNCTION generate_embedding(input_text TEXT)
            RETURNS vector(1536)
            AS $$
            BEGIN
              RETURN azure_openai.create_embeddings(
                deployment_name => '${this.aiConfig.embeddingModel}',
                input => input_text,
                api_key => '${this.aiConfig.openaiKey}',
                resource_name => '${this.aiConfig.openaiEndpoint}'
              );
            END;
            $$ LANGUAGE plpgsql;
          `);

          // Create function for content summarization
          await client.query(`
            CREATE OR REPLACE FUNCTION summarize_content(input_text TEXT)
            RETURNS TEXT
            AS $$
            BEGIN
              RETURN azure_openai.create_chat_completion(
                deployment_name => '${this.aiConfig.deploymentName}',
                messages => jsonb_build_array(
                  jsonb_build_object(
                    'role', 'system',
                    'content', 'Summarize the following research content in 2-3 sentences.'
                  ),
                  jsonb_build_object(
                    'role', 'user',
                    'content', input_text
                  )
                ),
                api_key => '${this.aiConfig.openaiKey}',
                resource_name => '${this.aiConfig.openaiEndpoint}'
              );
            END;
            $$ LANGUAGE plpgsql;
          `);
        }

        await client.query('COMMIT');
        console.log('Database schema with AI extensions initialized successfully');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  }

  // Generate embedding using Azure PostgreSQL AI
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.aiConfig.openaiEndpoint || !this.aiConfig.openaiKey) {
      return null;
    }

    return this.executeWithRetry(async () => {
      const result = await this.pool!.query(
        'SELECT generate_embedding($1) as embedding',
        [text]
      );
      return result.rows[0]?.embedding;
    });
  }

  // Enhanced save with automatic embedding generation
  async saveResearchStepWithAI(
    sessionId: string,
    step: ResearchStep,
    parentId?: string
  ): Promise<void> {
    await this.executeWithRetry(async () => {
      const client = await this.pool!.connect();
      try {
        await client.query('BEGIN');

        // Generate embedding and summary in database
        const aiResult = await client.query(`
          WITH step_ai AS (
            SELECT
              generate_embedding($1) as embedding,
              summarize_content($1) as summary
          )
          INSERT INTO research_steps
          (session_id, step_id, type, query, content, parent_id, metadata, embedding, summary)
          SELECT $2, $3, $4, $5, $1, $6, $7, embedding, summary
          FROM step_ai
          ON CONFLICT (step_id)
          DO UPDATE SET
            type = $4,
            query = $5,
            content = $1,
            parent_id = $6,
            metadata = $7,
            embedding = EXCLUDED.embedding,
            summary = EXCLUDED.summary
          RETURNING summary`,
          [
            step.content,
            sessionId,
            step.id,
            step.type,
            step.query,
            parentId,
            JSON.stringify(step.metadata || {})
          ]
        );

        // Save sources
        if (step.sources && step.sources.length > 0) {
          const values = step.sources.map((source, index) =>
            `($1, $${2 + index * 4}, $${3 + index * 4}, $${4 + index * 4}, $${5 + index * 4})`
          ).join(', ');

          const params = [step.id];
          step.sources.forEach(source => {
            params.push(source.name || '', source.url, source.snippet || '', (source.relevanceScore || 0).toString());
          });

          await client.query(
            `INSERT INTO research_sources (step_id, name, url, snippet, relevance_score)
             VALUES ${values}`,
            params
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  }

  async getResearchSession(sessionId: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const result = await this.pool!.query(
        'SELECT * FROM research_sessions WHERE session_id = $1',
        [sessionId]
      );
      return result.rows[0];
    });
  }

  async getResearchGraph(sessionId: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const result = await this.pool!.query(
        'SELECT graph_data FROM research_graphs WHERE session_id = $1',
        [sessionId]
      );
      return result.rows[0]?.graph_data;
    });
  }

  async getResearchSteps(sessionId: string): Promise<ResearchStep[]> {
    return this.executeWithRetry(async () => {
      const stepsResult = await this.pool!.query(
        'SELECT * FROM research_steps WHERE session_id = $1 ORDER BY created_at',
        [sessionId]
      );

      const steps = await Promise.all(
        stepsResult.rows.map(async (row) => {
          const sourcesResult = await this.pool!.query(
            'SELECT * FROM research_sources WHERE step_id = $1',
            [row.step_id]
          );

          return {
            id: row.step_id,
            type: row.type,
            title: row.title || 'Research Step',
            icon: () => null,
            query: row.query,
            content: row.content,
            sources: sourcesResult.rows.map(source => ({
              name: source.name,
              url: source.url,
              snippet: source.snippet,
              relevanceScore: source.relevance_score,
            })),
            metadata: row.metadata,
            timestamp: row.created_at,
          };
        })
      );

      return steps;
    });
  }

  async searchSimilarSteps(embedding: number[], limit = 5): Promise<ResearchStep[]> {
    return this.executeWithRetry(async () => {
      const embeddingStr = `[${embedding.join(',')}]`;
      const result = await this.pool!.query(
        `SELECT *, embedding <=> $1::vector as distance
         FROM research_steps
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [embeddingStr, limit]
      );

      return result.rows.map(row => ({
        id: row.step_id,
        type: row.type,
        title: row.title || 'Research Step',
        icon: () => null,
        query: row.query,
        content: row.content,
        metadata: { ...row.metadata, distance: row.distance },
        timestamp: row.created_at,
      }));
    });
  }

  async getRecentSessions(limit = 10): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const result = await this.pool!.query(
        `SELECT * FROM research_sessions
         ORDER BY updated_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    });
  }

  async saveResearchStep(sessionId: string, step: ResearchStep, parentId?: string): Promise<void> {
    await this.saveResearchStepWithAI(sessionId, step, parentId);
  }

  async saveResearchSession(sessionId: string, data: any): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.pool!.query(
        'INSERT INTO research_sessions (session_id, data) VALUES ($1, $2) ON CONFLICT (session_id) DO UPDATE SET data = $2',
        [sessionId, JSON.stringify(data)]
      );
    });
  }

  async saveResearchGraph(sessionId: string, graph: any): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.pool!.query(
        'INSERT INTO research_graphs (session_id, graph_data) VALUES ($1, $2) ON CONFLICT (session_id) DO UPDATE SET graph_data = $2',
        [sessionId, JSON.stringify(graph)]
      );
    });
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // Semantic search with Azure PostgreSQL
  async semanticSearch(query: string, sessionId?: string, limit = 5): Promise<ResearchStep[]> {
    return this.executeWithRetry(async () => {
      let whereClause = 'WHERE embedding IS NOT NULL';
      const params: any[] = [query, limit];

      if (sessionId) {
        whereClause += ' AND session_id = $3';
        params.push(sessionId);
      }

      const result = await this.pool!.query(`
        WITH query_embedding AS (
          SELECT generate_embedding($1) as embedding
        )
        SELECT
          rs.*,
          rs.embedding <=> qe.embedding as distance,
          rs.summary
        FROM research_steps rs
        CROSS JOIN query_embedding qe
        ${whereClause}
        ORDER BY rs.embedding <=> qe.embedding
        LIMIT $2`,
        params
      );

      return result.rows.map(row => ({
        id: row.step_id,
        type: row.type,
        title: row.title || 'Research Step',
        icon: () => null,
        query: row.query,
        content: row.content,
        metadata: {
          ...row.metadata,
          distance: row.distance,
          summary: row.summary
        },
        timestamp: row.created_at,
      }));
    });
  }

  // Generate insights using Azure OpenAI
  async generateInsights(sessionId: string): Promise<any[]> {
    if (!this.aiConfig.openaiEndpoint || !this.aiConfig.openaiKey) {
      return [];
    }

    return this.executeWithRetry(async () => {
      const client = await this.pool!.connect();
      try {
        // Get all research content for the session
        const stepsResult = await client.query(
          'SELECT content, summary FROM research_steps WHERE session_id = $1',
          [sessionId]
        );

        if (stepsResult.rows.length === 0) return [];

        // Combine summaries for insight generation
        const combinedContent = stepsResult.rows
          .map(row => row.summary || row.content.substring(0, 500))
          .join('\n\n');

        // Generate insights using Azure OpenAI
        const insightResult = await client.query(`
          SELECT azure_openai.create_chat_completion(
            deployment_name => $1,
            messages => jsonb_build_array(
              jsonb_build_object(
                'role', 'system',
                'content', 'Analyze the research and provide 3 key insights, patterns, or recommendations.'
              ),
              jsonb_build_object(
                'role', 'user',
                'content', $2
              )
            ),
            api_key => $3,
            resource_name => $4
          ) as insights`,
          [
            this.aiConfig.deploymentName,
            combinedContent,
            this.aiConfig.openaiKey,
            this.aiConfig.openaiEndpoint
          ]
        );

        // Save insights
        const insights = this.parseInsights(insightResult.rows[0]?.insights);
        for (const insight of insights) {
          await client.query(
            `INSERT INTO research_insights
             (session_id, insight_type, content, confidence_score)
             VALUES ($1, $2, $3, $4)`,
            [sessionId, insight.type, insight.content, insight.confidence]
          );
        }

        return insights;
      } finally {
        client.release();
      }
    });
  }

  private parseInsights(aiResponse: string): any[] {
    // Parse AI response into structured insights
    try {
      const insights = [];
      const lines = aiResponse.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          insights.push({
            type: 'key_insight',
            content: line.replace(/^\d+\.\s*/, ''),
            confidence: 0.85
          });
        }
      }

      return insights;
    } catch (error) {
      console.error('Failed to parse insights:', error);
      return [];
    }
  }

  // Get research statistics with AI insights
  async getEnhancedStatistics(sessionId: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const stats = await this.pool!.query(`
        SELECT
          COUNT(DISTINCT rs.id) as total_steps,
          COUNT(DISTINCT src.id) as total_sources,
          AVG(rs.sentiment_score) as avg_sentiment,
          COUNT(DISTINCT ri.id) as total_insights,
          jsonb_agg(DISTINCT rs.type) as step_types,
          jsonb_agg(DISTINCT jsonb_array_elements(rs.key_concepts)) as all_concepts
        FROM research_sessions sess
        LEFT JOIN research_steps rs ON sess.session_id = rs.session_id
        LEFT JOIN research_sources src ON rs.step_id = src.step_id
        LEFT JOIN research_insights ri ON sess.session_id = ri.session_id
        WHERE sess.session_id = $1
        GROUP BY sess.session_id`,
        [sessionId]
      );

      return stats.rows[0];
    });
  }
}

export const databaseService = new DatabaseService();
