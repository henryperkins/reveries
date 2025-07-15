import { Pool } from 'pg';
import { ResearchSession } from '../hooks/usePersistedState';
import { ResearchStep, ResearchStepType, Citation, ResearchMetadata, ModelType, EffortType, HostParadigm, ParadigmProbabilities } from '../types';
import { GraphNode, GraphEdge } from '../researchGraph';

export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl?: boolean | {
    rejectUnauthorized: boolean;
    ca?: string;
  };
}

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool;
  private isInitialized: boolean = false;

  private constructor() {
    const config: DatabaseConfig = {
      user: process.env.VITE_DB_USER || process.env.PGUSER || 'reveries_user',
      host: process.env.VITE_DB_HOST || process.env.PGHOST || 'localhost',
      database: process.env.VITE_DB_NAME || process.env.PGDATABASE || 'reveries_db',
      password: process.env.VITE_DB_PASSWORD || process.env.PGPASSWORD || 'reveries_password',
      port: parseInt(process.env.VITE_DB_PORT || process.env.PGPORT || '5432'),
    };

    // Configure SSL for Azure PostgreSQL
    if (config.host?.includes('postgres.database.azure.com')) {
      config.ssl = {
        rejectUnauthorized: true,
        // For Azure PostgreSQL Flexible Server, we typically don't need to specify the CA
        // as it uses certificates from well-known CAs
      };
    } else if (process.env.VITE_DB_SSL === 'true' || process.env.NODE_ENV === 'production') {
      config.ssl = true;
    }

    this.pool = new Pool(config);
    this.initializeConnection();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isInitialized = true;
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      this.isInitialized = false;
    }
  }

  public async isConnected(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeConnection();
    }
    return this.isInitialized;
  }

  // User Management
  public async createOrGetUser(sessionId: string, preferences?: Record<string, unknown>): Promise<string> {
    const query = `
      INSERT INTO users (session_id, preferences)
      VALUES ($1, $2)
      ON CONFLICT (session_id)
      DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;
    const result = await this.pool.query(query, [sessionId, JSON.stringify(preferences || {})]);
    return result.rows[0].id;
  }

  public async getUserPreferences(sessionId: string): Promise<Record<string, unknown> | null> {
    const query = 'SELECT preferences FROM users WHERE session_id = $1';
    const result = await this.pool.query(query, [sessionId]);
    return result.rows[0]?.preferences || null;
  }

  public async updateUserPreferences(sessionId: string, preferences: Record<string, unknown>): Promise<void> {
    const query = 'UPDATE users SET preferences = $2, updated_at = CURRENT_TIMESTAMP WHERE session_id = $1';
    await this.pool.query(query, [sessionId, JSON.stringify(preferences)]);
  }

  // Research Session Management
  public async createResearchSession(
    userSessionId: string,
    sessionId: string,
    query: string,
    options: {
      title?: string;
      modelType?: ModelType;
      effortLevel?: EffortType;
      paradigm?: HostParadigm;
      paradigmProbabilities?: ParadigmProbabilities;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const userId = await this.createOrGetUser(userSessionId);

    const insertQuery = `
      INSERT INTO research_sessions (
        user_id, session_id, query, title, model_type, effort_level,
        paradigm, paradigm_probabilities, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;

    const result = await this.pool.query(insertQuery, [
      userId,
      sessionId,
      query,
      options.title || query.substring(0, 100),
      options.modelType,
      options.effortLevel,
      options.paradigm,
      JSON.stringify(options.paradigmProbabilities || {}),
      JSON.stringify(options.metadata || {})
    ]);

    return result.rows[0].id;
  }

  public async updateResearchSession(
    sessionId: string,
    updates: {
      status?: 'active' | 'completed' | 'error' | 'cancelled';
      completedAt?: Date;
      durationMs?: number;
      totalSteps?: number;
      totalSources?: number;
      successRate?: number;
      errorCount?: number;
      graphData?: unknown;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        let columnName = key;
        // Convert camelCase to snake_case
        columnName = columnName.replace(/([A-Z])/g, '_$1').toLowerCase();

        if (key === 'graphData' || key === 'metadata') {
          setClauses.push(`${columnName} = $${valueIndex}`);
          values.push(JSON.stringify(value));
        } else if (key === 'completedAt') {
          setClauses.push(`completed_at = $${valueIndex}`);
          values.push(value);
        } else {
          setClauses.push(`${columnName} = $${valueIndex}`);
          values.push(value);
        }
        valueIndex++;
      }
    });

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sessionId);

    const query = `
      UPDATE research_sessions
      SET ${setClauses.join(', ')}
      WHERE session_id = $${valueIndex}
    `;

    await this.pool.query(query, values);
  }

  public async getResearchSession(sessionId: string): Promise<ResearchSession | null> {
    const query = `
      SELECT rs.*, u.session_id as user_session_id
      FROM research_sessions rs
      JOIN users u ON rs.user_id = u.id
      WHERE rs.session_id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.session_id,
      query: row.query,
      timestamp: new Date(row.started_at).getTime(),
      steps: [], // Will be populated by getResearchSteps
      graphData: row.graph_data ? JSON.stringify(row.graph_data) : undefined,
      completed: row.status === 'completed',
      duration: row.duration_ms,
      model: row.model_type,
      effort: row.effort_level
    };
  }

  public async getRecentSessions(userSessionId: string, limit: number = 10): Promise<ResearchSession[]> {
    const query = `
      SELECT rs.*, u.session_id as user_session_id
      FROM research_sessions rs
      JOIN users u ON rs.user_id = u.id
      WHERE u.session_id = $1
      ORDER BY rs.created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [userSessionId, limit]);

    return result.rows.map(row => ({
      id: row.session_id,
      query: row.query,
      timestamp: new Date(row.started_at).getTime(),
      steps: [], // Will be populated separately if needed
      graphData: row.graph_data ? JSON.stringify(row.graph_data) : undefined,
      completed: row.status === 'completed',
      duration: row.duration_ms,
      model: row.model_type,
      effort: row.effort_level
    }));
  }

  // Research Steps Management
  public async addResearchStep(
    sessionId: string,
    step: ResearchStep,
    stepIndex: number,
    metadata?: ResearchMetadata
  ): Promise<string> {
    const query = `
      INSERT INTO research_steps (
        session_id, step_id, step_type, title, content, step_index,
        status, started_at, metadata
      ) VALUES (
        (SELECT id FROM research_sessions WHERE session_id = $1),
        $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id;
    `;

    const result = await this.pool.query(query, [
      sessionId,
      step.id,
      step.type,
      step.title,
      typeof step.content === 'string' ? step.content : JSON.stringify(step.content),
      stepIndex,
      'processing',
      new Date(),
      JSON.stringify(metadata || {})
    ]);

    return result.rows[0].id;
  }

  public async updateResearchStep(
    stepId: string,
    updates: {
      status?: 'pending' | 'processing' | 'completed' | 'error';
      content?: string;
      completedAt?: Date;
      durationMs?: number;
      errorMessage?: string;
      metadata?: ResearchMetadata;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let valueIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'completedAt') {
          setClauses.push(`completed_at = $${valueIndex}`);
          values.push(value);
        } else if (key === 'durationMs') {
          setClauses.push(`duration_ms = $${valueIndex}`);
          values.push(value);
        } else if (key === 'errorMessage') {
          setClauses.push(`error_message = $${valueIndex}`);
          values.push(value);
        } else if (key === 'metadata') {
          setClauses.push(`metadata = $${valueIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = $${valueIndex}`);
          values.push(value);
        }
        valueIndex++;
      }
    });

    if (setClauses.length === 0) return;

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(stepId);

    const query = `
      UPDATE research_steps
      SET ${setClauses.join(', ')}
      WHERE step_id = $${valueIndex}
    `;

    await this.pool.query(query, values);
  }

  public async getResearchSteps(sessionId: string): Promise<ResearchStep[]> {
    const query = `
      SELECT * FROM research_steps
      WHERE session_id = (SELECT id FROM research_sessions WHERE session_id = $1)
      ORDER BY step_index ASC
    `;

    const result = await this.pool.query(query, [sessionId]);

    return result.rows.map(row => ({
      id: row.step_id,
      type: row.step_type as ResearchStepType,
      title: row.title,
      content: row.content,
      icon: () => null, // Will be set by UI
      timestamp: row.created_at,
      sources: [] // Will be populated separately
    }));
  }

  // Sources Management
  public async addResearchSources(
    sessionId: string,
    stepId: string,
    sources: Citation[]
  ): Promise<void> {
    if (sources.length === 0) return;

    const query = `
      INSERT INTO research_sources (
        session_id, step_id, url, title, name, authors, year,
        published, snippet, domain
      ) VALUES `;

    const valueSets: string[] = [];
    const values: unknown[] = [];
    let valueIndex = 1;

    sources.forEach(source => {
      const domain = source.url ? new URL(source.url).hostname : null;
      valueSets.push(
        `((SELECT id FROM research_sessions WHERE session_id = $${valueIndex}), ` +
        `(SELECT id FROM research_steps WHERE step_id = $${valueIndex + 1}), ` +
        `$${valueIndex + 2}, $${valueIndex + 3}, $${valueIndex + 4}, $${valueIndex + 5}, ` +
        `$${valueIndex + 6}, $${valueIndex + 7}, $${valueIndex + 8}, $${valueIndex + 9})`
      );

      values.push(
        sessionId,
        stepId,
        source.url,
        source.title,
        source.name,
        source.authors,
        source.year,
        source.published,
        source.snippet,
        domain
      );

      valueIndex += 10;
    });

    await this.pool.query(query + valueSets.join(', '), values);
  }

  public async getResearchSources(sessionId: string, stepId?: string): Promise<Citation[]> {
    let query = `
      SELECT DISTINCT url, title, name, authors, year, published, snippet
      FROM research_sources
      WHERE session_id = (SELECT id FROM research_sessions WHERE session_id = $1)
    `;

    const params = [sessionId];

    if (stepId) {
      query += ` AND step_id = (SELECT id FROM research_steps WHERE step_id = $2)`;
      params.push(stepId);
    }

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      url: row.url,
      title: row.title,
      name: row.name,
      authors: row.authors,
      year: row.year,
      published: row.published,
      snippet: row.snippet
    }));
  }

  // Graph Management
  public async addGraphNode(
    sessionId: string,
    node: GraphNode,
    nodeIndex: number
  ): Promise<void> {
    const query = `
      INSERT INTO graph_nodes (
        session_id, node_id, step_id, node_type, title, node_index,
        parent_nodes, child_nodes, duration_ms, metadata
      ) VALUES (
        (SELECT id FROM research_sessions WHERE session_id = $1),
        $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) ON CONFLICT (session_id, node_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        parent_nodes = EXCLUDED.parent_nodes,
        child_nodes = EXCLUDED.child_nodes,
        duration_ms = EXCLUDED.duration_ms,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await this.pool.query(query, [
      sessionId,
      node.id,
      node.stepId,
      node.type,
      node.title,
      nodeIndex,
      node.parents,
      node.children,
      node.duration,
      JSON.stringify(node.metadata || {})
    ]);
  }

  public async addGraphEdge(
    sessionId: string,
    edge: GraphEdge
  ): Promise<void> {
    const query = `
      INSERT INTO graph_edges (
        session_id, edge_id, source_node_id, target_node_id, edge_type, label
      ) VALUES (
        (SELECT id FROM research_sessions WHERE session_id = $1),
        $2, $3, $4, $5, $6
      ) ON CONFLICT (session_id, edge_id) DO NOTHING;
    `;

    await this.pool.query(query, [
      sessionId,
      edge.id,
      edge.source,
      edge.target,
      edge.type,
      edge.label
    ]);
  }

  public async getGraphData(sessionId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodesQuery = `
      SELECT * FROM graph_nodes
      WHERE session_id = (SELECT id FROM research_sessions WHERE session_id = $1)
      ORDER BY node_index ASC
    `;

    const edgesQuery = `
      SELECT * FROM graph_edges
      WHERE session_id = (SELECT id FROM research_sessions WHERE session_id = $1)
    `;

    const [nodesResult, edgesResult] = await Promise.all([
      this.pool.query(nodesQuery, [sessionId]),
      this.pool.query(edgesQuery, [sessionId])
    ]);

    const nodes: GraphNode[] = nodesResult.rows.map(row => ({
      id: row.node_id,
      stepId: row.step_id,
      type: row.node_type,
      title: row.title,
      timestamp: row.timestamp,
      duration: row.duration_ms,
      children: row.child_nodes || [],
      parents: row.parent_nodes || [],
      metadata: row.metadata
    }));

    const edges: GraphEdge[] = edgesResult.rows.map(row => ({
      id: row.edge_id,
      source: row.source_node_id,
      target: row.target_node_id,
      type: row.edge_type,
      label: row.label
    }));

    return { nodes, edges };
  }

  // Function Calls Tracking
  public async addFunctionCall(
    sessionId: string,
    stepId: string,
    functionName: string,
    args: Record<string, unknown>,
    result: unknown,
    durationMs?: number
  ): Promise<void> {
    const query = `
      INSERT INTO function_calls (
        session_id, step_id, function_name, arguments, result,
        completed_at, duration_ms
      ) VALUES (
        (SELECT id FROM research_sessions WHERE session_id = $1),
        (SELECT id FROM research_steps WHERE step_id = $2),
        $3, $4, $5, $6, $7
      );
    `;

    await this.pool.query(query, [
      sessionId,
      stepId,
      functionName,
      JSON.stringify(args),
      JSON.stringify(result),
      new Date(),
      durationMs
    ]);
  }

  // Analytics and Reporting
  public async getSessionStatistics(sessionId: string): Promise<{
    totalSteps: number;
    totalSources: number;
    averageStepDuration: number;
    modelDistribution: Record<string, number>;
    paradigmDistribution: Record<string, number>;
  }> {
    const query = `
      SELECT
        COUNT(DISTINCT rst.id) as total_steps,
        COUNT(DISTINCT rsrc.id) as total_sources,
        AVG(rst.duration_ms) as avg_step_duration,
        rs.model_type,
        rs.paradigm
      FROM research_sessions rs
      LEFT JOIN research_steps rst ON rs.id = rst.session_id
      LEFT JOIN research_sources rsrc ON rs.id = rsrc.session_id
      WHERE rs.session_id = $1
      GROUP BY rs.id, rs.model_type, rs.paradigm;
    `;

    const result = await this.pool.query(query, [sessionId]);
    const row = result.rows[0];

    return {
      totalSteps: parseInt(row?.total_steps || '0'),
      totalSources: parseInt(row?.total_sources || '0'),
      averageStepDuration: parseFloat(row?.avg_step_duration || '0'),
      modelDistribution: { [row?.model_type || 'unknown']: 1 },
      paradigmDistribution: { [row?.paradigm || 'unknown']: 1 }
    };
  }

  // Cleanup
  public async deleteSession(sessionId: string): Promise<void> {
    const query = 'DELETE FROM research_sessions WHERE session_id = $1';
    await this.pool.query(query, [sessionId]);
  }

  public async cleanup(): Promise<void> {
    // Delete sessions older than 30 days
    const query = `
      DELETE FROM research_sessions
      WHERE created_at < NOW() - INTERVAL '30 days'
    `;
    await this.pool.query(query);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
