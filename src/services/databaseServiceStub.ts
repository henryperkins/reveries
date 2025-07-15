import { ResearchStep, ResearchSource, ResearchParadigm } from '../types';

// Stub implementation for browser environment
class DatabaseServiceStub {
  async initialize(): Promise<void> {
    console.log('Database service stub - no database in browser');
  }

  async saveResearchStep(sessionId: string, step: ResearchStep): Promise<void> {
    // No-op in browser
  }

  async getResearchSteps(sessionId: string): Promise<ResearchStep[]> {
    return [];
  }

  async saveResearchSources(sessionId: string, sources: ResearchSource[]): Promise<void> {
    // No-op in browser
  }

  async getResearchSources(sessionId: string): Promise<ResearchSource[]> {
    return [];
  }

  async saveResearchParadigm(sessionId: string, paradigm: ResearchParadigm): Promise<void> {
    // No-op in browser
  }

  async getResearchParadigm(sessionId: string): Promise<ResearchParadigm | null> {
    return null;
  }

  async clearSession(sessionId: string): Promise<void> {
    // No-op in browser
  }

  async getAllSessions(): Promise<string[]> {
    return [];
  }

  async deleteSession(sessionId: string): Promise<void> {
    // No-op in browser
  }
}

export const databaseService = new DatabaseServiceStub();