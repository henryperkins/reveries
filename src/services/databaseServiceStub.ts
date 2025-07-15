import { ResearchStep, ResearchSource, ResearchParadigm } from '../types';

export class DatabaseService {
  private static instance: DatabaseService | null = null;

  // Stub implementation - no database connection
  private constructor() {
    console.log('Using DatabaseService stub (browser mode)');
  }

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    // No-op in browser
    return Promise.resolve();
  }

  async saveResearchState(key: string, state: any): Promise<void> {
    // Use localStorage as fallback in browser
    try {
      localStorage.setItem(`reveries_${key}`, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  async loadResearchState(key: string): Promise<any | null> {
    // Use localStorage as fallback in browser
    try {
      const stored = localStorage.getItem(`reveries_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }
    // No-op in browser
  }
}

export const databaseService = new DatabaseServiceStub();
