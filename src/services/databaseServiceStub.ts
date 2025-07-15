import { ResearchStep, ResearchSource } from '../types';

export interface SessionInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Browser-only stub for the real DatabaseService.
 * Provides the same public surface but performs in-memory / localStorage
 * operations instead of hitting PostgreSQL.  This keeps the React bundle
 * free from node-postgres while allowing type-safe calls across the app.
 */
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
    if (typeof window !== 'undefined') {

      console.info('Using DatabaseService stub (browser mode)');
    }
  }

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  /* =========================================================================
   *  Connection helpers
   * ====================================================================== */

  async initialize(): Promise<void> {
    return;
  }

  async isConnected(): Promise<boolean> {
    // Always report disconnected so callers can gracefully fallback
    return false;
  }

  /* =========================================================================
   *  Session helpers (no-ops)
   * ====================================================================== */

  async createResearchSession(
    _userSessionId: string,
    _sessionId: string,
    _query: string,
    _info: SessionInfo,
  ): Promise<void> {}

  async updateResearchSession(
    _sessionId: string,
    _updates: Partial<SessionInfo>,
  ): Promise<void> {}

  async deleteSession(_sessionId: string): Promise<void> {}

  async getRecentSessions(
    _userSessionId: string,
    _limit: number,
  ): Promise<any[]> {
    return [];
  }

  async getResearchSession(_sessionId: string): Promise<any | null> {
    return null;
  }

  /* =========================================================================
   *  Research steps / sources
   * ====================================================================== */

  async addResearchStep(
    _sessionId: string,
    _step: ResearchStep,
    _order?: number,
  ): Promise<void> {}

  async addResearchSources(
    _sessionId: string,
    _stepId: string,
    _sources: ResearchSource[],
  ): Promise<void> {}

  async getResearchSteps(_sessionId: string): Promise<ResearchStep[]> {
    return [];
  }

  async getResearchSources(_sessionId: string): Promise<ResearchSource[]> {
    return [];
  }

  /* =========================================================================
   *  Graph helpers
   * ====================================================================== */

  async saveResearchGraph(
    _sessionId: string,
    _graphData: any,
  ): Promise<void> {}

  async getResearchGraph(_sessionId: string): Promise<any | null> {
    return null;
  }

  /* =========================================================================
   *  User preferences & statistics
   * ====================================================================== */

  async getUserPreferences(_sessionId: string): Promise<any | null> {
    return null;
  }

  async updateUserPreferences(
    _sessionId: string,
    _prefs: any,
  ): Promise<void> {}

  async getEnhancedStatistics(_sessionId: string): Promise<any | null> {
    return null;
  }

  /* =========================================================================
   *  Generic fallback (legacy calls)
   * ====================================================================== */

  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  /* =========================================================================
   *  Legacy stub helpers used by some utils
   * ====================================================================== */

  async initializeSchema(): Promise<void> {}

  async saveResearchSession(
    _sessionId: string,
    _data: SessionInfo,
  ): Promise<void> {}

  async saveResearchStep(
    _sessionId: string,
    _step: ResearchStep,
    _parentId?: string,
  ): Promise<void> {}

  async saveResearchSources(
    _sessionId: string,
    _sources: ResearchSource[],
  ): Promise<void> {}

  async clearSession(_sessionId: string): Promise<void> {}

  async getAllSessions(): Promise<string[]> {
    return [];
  }
}

/**
 * Singleton instance exported under the alias import `databaseService`
 * for convenience inside hooks that expect a ready object.
 */
export const databaseService = DatabaseService.getInstance();
