import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../database/DatabaseService';
import { ResearchStep, ResearchMetadata, ModelType, EffortType, HostParadigm, ParadigmProbabilities } from '../types';

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

// Enhanced hook that uses PostgreSQL for persistence
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `reveries_${key}_v${version}`;
  const [state, setState] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from localStorage (fallback) or database
  useEffect(() => {
    const initializeState = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const isConnected = await dbService.isConnected();

        if (isConnected && key === 'research' && typeof window !== 'undefined') {
          // Try to get user preferences from database
          const sessionId = window.sessionStorage.getItem('user_session_id') || 'default-session';
          const preferences = await dbService.getUserPreferences(sessionId);

          if (preferences && preferences[key]) {
            setState(preferences[key] as T);
            setIsInitialized(true);
            return;
          }
        }

        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          const item = window.localStorage.getItem(storageKey);
          if (item) {
            const parsed = JSON.parse(item);
            setState(parsed.data as T);
          }
        }
      } catch (error) {
        console.warn(`Error loading persisted state for ${key}:`, error);
        // Fallback to localStorage
        try {
          if (typeof window !== 'undefined') {
            const item = window.localStorage.getItem(storageKey);
            if (item) {
              const parsed = JSON.parse(item);
              setState(parsed.data as T);
            }
          }
        } catch (fallbackError) {
          console.error(`Error loading from localStorage for ${key}:`, fallbackError);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    initializeState();
  }, [key, storageKey]);

  // Persist state changes to both database and localStorage
  useEffect(() => {
    if (!isInitialized) return;

    const persistState = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const isConnected = await dbService.isConnected();

        if (isConnected && typeof window !== 'undefined') {
          const sessionId = window.sessionStorage.getItem('user_session_id') || 'default-session';

          // Save to database
          await dbService.updateUserPreferences(sessionId, { [key]: state });
        }

        // Also save to localStorage as backup
        if (typeof window !== 'undefined') {
          const dataToStore = {
            data: state,
            timestamp: Date.now(),
            version
          };
          window.localStorage.setItem(storageKey, JSON.stringify(dataToStore));
        }
      } catch (error) {
        console.warn(`Error persisting state for ${key}:`, error);
        // Fallback to localStorage only
        try {
          if (typeof window !== 'undefined') {
            const dataToStore = {
              data: state,
              timestamp: Date.now(),
              version
            };
            window.localStorage.setItem(storageKey, JSON.stringify(dataToStore));
          }
        } catch (fallbackError) {
          console.error(`Error persisting to localStorage for ${key}:`, fallbackError);
        }
      }
    };

    persistState();
  }, [state, storageKey, version, key, isInitialized]);

  // Clear persisted state
  const clearState = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const isConnected = await dbService.isConnected();

      if (isConnected && typeof window !== 'undefined') {
        const sessionId = window.sessionStorage.getItem('user_session_id') || 'default-session';
        await dbService.updateUserPreferences(sessionId, { [key]: defaultValue });
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey);
      }
      setState(defaultValue);
    } catch (error) {
      console.error(`Error clearing persisted state for ${key}:`, error);
      // Fallback to localStorage
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(storageKey);
        }
        setState(defaultValue);
      } catch (fallbackError) {
        console.error(`Error clearing localStorage for ${key}:`, fallbackError);
      }
    }
  }, [storageKey, defaultValue, key]);

  return [state, setState, clearState];
}

// Hook for managing research sessions
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

export function useResearchSessions() {
  const [sessions, setSessions, clearSessions] = usePersistedState<ResearchSession[]>(
    'research_sessions',
    [],
    1
  );

  const addSession = useCallback((session: ResearchSession) => {
    setSessions(prev => [...prev, session].slice(-10)); // Keep last 10 sessions
  }, [setSessions]);

  const updateSession = useCallback((id: string, updates: Partial<ResearchSession>) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === id ? { ...session, ...updates } : session
      )
    );
  }, [setSessions]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [setSessions]);

  return {
    sessions,
    addSession,
    updateSession,
    getSession,
    deleteSession,
    clearSessions
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
