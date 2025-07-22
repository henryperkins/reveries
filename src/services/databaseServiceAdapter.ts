import { DatabaseService as NewDatabaseService } from './databaseService';
import { ResearchStep } from '@/types';

/**
 * Adapter to help migrate from old DatabaseService API to new one
 * This provides compatibility methods that don't exist in the new service
 */
export class DatabaseServiceAdapter {
  private newService: NewDatabaseService;
  private static instance: DatabaseServiceAdapter;

  private constructor() {
    this.newService = NewDatabaseService.getInstance();
  }

  public static getInstance(): DatabaseServiceAdapter {
    if (!DatabaseServiceAdapter.instance) {
      DatabaseServiceAdapter.instance = new DatabaseServiceAdapter();
    }
    return DatabaseServiceAdapter.instance;
  }

  // Compatibility method - old service had isConnected
  async isConnected(): Promise<boolean> {
    try {
      // Use testConnection from new service
      return await this.newService.testConnection();
    } catch (error) {
      console.warn('Database connection check failed:', error);
      return false;
    }
  }

  // User preference methods - store in session metadata
  async getUserPreferences(sessionId: string): Promise<Record<string, unknown> | null> {
    try {
      const session = await this.newService.getResearchSession(sessionId);
      if (session) {
        // Extract preferences from metadata
        const metadata = (session as any).metadata || {};
        return metadata.userPreferences || null;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(sessionId: string, preferences: Record<string, unknown>): Promise<void> {
    try {
      const session = await this.newService.getResearchSession(sessionId);
      if (session) {
        const metadata = (session as any).metadata || {};
        await this.newService.saveResearchSession(sessionId, {
          ...session,
          metadata: { ...metadata, userPreferences: preferences }
        });
      } else {
        // Create a new session if it doesn't exist
        await this.newService.saveResearchSession(sessionId, {
          title: 'User Session',
          description: 'Auto-created for user preferences',
          metadata: { userPreferences: preferences }
        });
      }
    } catch (error) {
      console.warn('Failed to update user preferences:', error);
      throw error;
    }
  }

  // Create or get user - store user data in session metadata
  async createOrGetUser(sessionId: string, preferences?: Record<string, unknown>): Promise<string> {
    try {
      const session = await this.newService.getResearchSession(sessionId);
      if (!session) {
        await this.newService.saveResearchSession(sessionId, {
          title: 'User Session',
          description: 'Auto-created user session',
          metadata: { userPreferences: preferences || {} }
        });
      } else if (preferences) {
        await this.updateUserPreferences(sessionId, preferences);
      }
      return sessionId; // Return sessionId as "userId"
    } catch (error) {
      console.warn('Failed to create or get user:', error);
      throw error;
    }
  }

  // Direct passthrough methods that exist in both services
  async initializeSchema(): Promise<void> {
    return this.newService.initializeSchema();
  }

  async saveResearchSession(sessionId: string, data: any): Promise<void> {
    return this.newService.saveResearchSession(sessionId, data);
  }

  async getResearchSession(sessionId: string) {
    return this.newService.getResearchSession(sessionId);
  }

  async saveResearchStep(sessionId: string, step: ResearchStep, parentId?: string): Promise<void> {
    return this.newService.saveResearchStep(sessionId, step, parentId);
  }

  async saveResearchStepWithAI(sessionId: string, step: ResearchStep, parentId?: string): Promise<void> {
    return this.newService.saveResearchStepWithAI(sessionId, step, parentId);
  }

  async getResearchSteps(sessionId: string): Promise<ResearchStep[]> {
    return this.newService.getResearchSteps(sessionId);
  }

  async saveResearchGraph(sessionId: string, graph: any): Promise<void> {
    return this.newService.saveResearchGraph(sessionId, graph);
  }

  async getResearchGraph(sessionId: string): Promise<any> {
    return this.newService.getResearchGraph(sessionId);
  }

  async getRecentSessions(limit = 10): Promise<any[]> {
    return this.newService.getRecentSessions(limit);
  }

  async close(): Promise<void> {
    return this.newService.close();
  }

  // AI features from new service
  async generateEmbedding(text: string): Promise<number[] | null> {
    return this.newService.generateEmbedding(text);
  }

  async semanticSearch(query: string, sessionId?: string, limit = 5): Promise<ResearchStep[]> {
    return this.newService.semanticSearch(query, sessionId, limit);
  }

  async generateInsights(sessionId: string): Promise<any[]> {
    return this.newService.generateInsights(sessionId);
  }

  async getEnhancedStatistics(sessionId: string): Promise<any> {
    return this.newService.getEnhancedStatistics(sessionId);
  }
}

// Export both the class and a singleton instance
export const databaseService = DatabaseServiceAdapter.getInstance();
export { DatabaseServiceAdapter as DatabaseService };