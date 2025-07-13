import { useState, useEffect, useCallback } from 'react';
import { ResearchStep } from '../types';

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `reveries_${key}_v${version}`;

  // Initialize state from localStorage
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      if (item) {
        const parsed = JSON.parse(item);
        // Validate the data structure if needed
        return parsed.data as T;
      }
    } catch (error) {
      console.error(`Error loading persisted state for ${key}:`, error);
    }
    return defaultValue;
  });

  // Persist state changes
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
  }, [state, storageKey, version]);

  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setState(defaultValue);
    } catch (error) {
      console.error(`Error clearing persisted state for ${key}:`, error);
    }
  }, [storageKey, defaultValue]);

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
