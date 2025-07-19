import { useState, useEffect, useCallback } from 'react';
import { ResearchStep, ModelType, EffortType } from '../types';
import { DatabaseService } from 'databaseService';
import { getEnv } from '../utils/getEnv';

// Resolve feature flag once at module level
const ENABLE_DB_PERSISTENCE = getEnv('VITE_ENABLE_DATABASE_PERSISTENCE', 'ENABLE_DATABASE_PERSISTENCE') === 'true';

export interface ResearchSession {
  id: string;
  query: string;
  timestamp: number;
  steps: ResearchStep[];
  graphData?: string;
  completed: boolean;
  duration?: number;
  model?: string;
  effort?: string;
}

// Enhanced hook that uses database with localStorage fallback
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `reveries_${key}_v${version}`;
  const [state, setState] = useState<T>(defaultValue);

  // Feature flag is resolved at module level

  // Check database availability on mount
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        if (ENABLE_DB_PERSISTENCE) {
          const db = DatabaseService.getInstance();
          const isConnected = await db.isConnected();

          if (isConnected) {
            console.log('✅ Database persistence enabled');
          } else {
            console.log('⚠️ Database unavailable, using localStorage fallback');
          }
        }
      } catch (error) {
        console.warn('Database connection failed, using localStorage:', error);
      }
    };

    checkDatabase();
  }, []);

  // Initialize state from localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item);
        setState(parsed.data as T);
      }
    } catch (error) {
      console.error(`Error loading persisted state for ${key}:`, error);
    }
  }, [key, storageKey]);

  // Persist state changes to localStorage (always as fallback)
  useEffect(() => {
    try {
      const dataToStore = {
        data: state,
        timestamp: Date.now(),
        version
      };
      window.localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error(`Error persisting state for ${key}:`, error);
    }
  }, [state, storageKey, version, key]);

  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setState(defaultValue);
    } catch (error) {
      console.error(`Error clearing persisted state for ${key}:`, error);
    }
  }, [storageKey, defaultValue, key]);

  return [state, setState, clearState];
}

// Enhanced hook for managing research sessions with database integration
export function useResearchSessions() {
  const [sessions, setSessions, clearSessions] = usePersistedState<ResearchSession[]>(
    'research_sessions',
    [],
    1
  );
  const [databaseService, setDatabaseService] = useState<DatabaseService | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize database service
  useEffect(() => {
    const initDatabase = async () => {
      try {
        if (ENABLE_DB_PERSISTENCE) {
          const db = DatabaseService.getInstance();
          const connected = await db.isConnected();

          if (connected) {
            setDatabaseService(db);
            // Load recent sessions from database
            const userSessionId = localStorage.getItem('reveries_user_session') ||
                                crypto.randomUUID();
            localStorage.setItem('reveries_user_session', userSessionId);

            const recentSessions = await db.getRecentSessions(userSessionId, 10);
            if (recentSessions.length > 0) {
              setSessions(recentSessions);
            }
          }
        }
      } catch (error) {
        console.warn('Database initialization failed:', error);
        setIsOnline(false);
      }
    };

    initDatabase();
  }, [setSessions]);

  // Persist session to database if available
  const persistSessionToDatabase = useCallback(async (session: ResearchSession) => {
    if (!databaseService || !isOnline) return;

    try {
      const userSessionId = localStorage.getItem('reveries_user_session') ||
                           crypto.randomUUID();

      // Create or update research session
      await databaseService.createResearchSession(
        userSessionId,
        session.id,
        session.query,
        {
          title: session.query.substring(0, 100),
          modelType: session.model as ModelType,
          effortLevel: session.effort as EffortType,
          metadata: { timestamp: session.timestamp }
        }
      );

      // Add research steps
      for (let i = 0; i < session.steps.length; i++) {
        const step = session.steps[i];
        await databaseService.addResearchStep(session.id, step, i + 1);

        // Add sources if available
        if (step.sources && step.sources.length > 0) {
          // Convert Citations to ResearchSources ensuring all required fields
          const researchSources = step.sources.map(source => ({
            id: crypto.randomUUID(),
            name: source.name || 'Untitled Source',
            url: source.url,
            snippet: source.snippet || '',
            title: source.title || '',
            authors: source.authors || [],
            year: source.year || 0,
            published: source.published || '',
            accessed: source.accessed || new Date().toISOString(),
            relevanceScore: source.relevanceScore || 0
          }));
          await databaseService.addResearchSources(session.id, step.id, researchSources);
        }
      }

      // Update session as completed if applicable
      if (session.completed) {
        await databaseService.updateResearchSession(session.id, {
          status: 'completed',
          completedAt: new Date(session.timestamp + (session.duration || 0)),
          durationMs: session.duration,
          totalSteps: session.steps.length,
          totalSources: session.steps.reduce((acc, step) => acc + (step.sources?.length || 0), 0)
        });
      }

    } catch (error) {
      console.warn('Failed to persist session to database:', error);
      setIsOnline(false);
    }
  }, [databaseService, isOnline]);

  const addSession = useCallback(async (session: ResearchSession) => {
    setSessions(prev => [...prev, session].slice(-10)); // Keep last 10 sessions
    await persistSessionToDatabase(session);
  }, [setSessions, persistSessionToDatabase]);

  const updateSession = useCallback(async (id: string, updates: Partial<ResearchSession>) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === id ? { ...session, ...updates } : session
      )
    );

    // Update in database if available
    if (databaseService && isOnline) {
      try {
        const updatedSession = sessions.find(s => s.id === id);
        if (updatedSession) {
          await persistSessionToDatabase({ ...updatedSession, ...updates });
        }
      } catch (error) {
        console.warn('Failed to update session in database:', error);
      }
    }
  }, [setSessions, sessions, databaseService, isOnline, persistSessionToDatabase]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const deleteSession = useCallback(async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));

    // Delete from database if available
    if (databaseService && isOnline) {
      try {
        await databaseService.deleteSession(id);
      } catch (error) {
        console.warn('Failed to delete session from database:', error);
      }
    }
  }, [setSessions, databaseService, isOnline]);

  const syncWithDatabase = useCallback(async () => {
    if (!databaseService || !isOnline) return;

    try {
      const userSessionId = localStorage.getItem('reveries_user_session') ||
                           crypto.randomUUID();
      const recentSessions = await databaseService.getRecentSessions(userSessionId, 10);
      setSessions(recentSessions);
    } catch (error) {
      console.warn('Failed to sync with database:', error);
    }
  }, [databaseService, isOnline, setSessions]);

  return {
    sessions,
    addSession,
    updateSession,
    getSession,
    deleteSession,
    clearSessions,
    syncWithDatabase,
    isDatabaseConnected: !!databaseService && isOnline,
    isOnline
  };
}

// Hook for debouncing values (useful for search inputs)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for managing cancellable operations
export function useCancellableOperation() {
  const [controller, setController] = useState<AbortController | null>(null);

  const startOperation = useCallback(() => {
    // Cancel previous operation if it exists
    if (controller) {
      controller.abort();
    }

    const newController = new AbortController();
    setController(newController);
    return newController;
  }, [controller]);

  const cancelOperation = useCallback(() => {
    if (controller) {
      controller.abort();
      setController(null);
    }
  }, [controller]);

  const isOperationActive = useCallback(() => {
    return controller !== null && !controller.signal.aborted;
  }, [controller]);

  return {
    startOperation,
    cancelOperation,
    isOperationActive,
    signal: controller?.signal
  };
}

// Hook for database health monitoring
export function useDatabaseHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      if (ENABLE_DB_PERSISTENCE) {
        const db = DatabaseService.getInstance();
        const connected = await db.isConnected();
        setIsHealthy(connected);
        setError(connected ? null : 'Database connection failed');
      } else {
        setIsHealthy(false);
        setError('Database persistence disabled');
      }
    } catch (err) {
      setIsHealthy(false);
      setError(err instanceof Error ? err.message : 'Unknown database error');
    } finally {
      setLastCheck(new Date());
    }
  }, []);

  // Check health on mount and periodically
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, lastCheck, error, checkHealth };
}
