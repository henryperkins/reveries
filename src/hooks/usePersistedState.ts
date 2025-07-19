// MIGRATION NOTICE: This file is deprecated.
// Please use usePersistentState from './usePersistentState' instead.
// This file remains for backward compatibility only.

import { usePersistentState, useDebounce, useCancellableOperation } from './usePersistentState';
import { ResearchStep } from '@/types';
import { useCallback } from 'react';

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

// Deprecated: Use usePersistentState instead
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  console.warn('usePersistedState is deprecated. Please use usePersistentState instead.');
  return usePersistentState(key, defaultValue, { version });
}

// Legacy research sessions hook - maintained for compatibility
export function useResearchSessions() {
  const [sessions, setSessions, clearSessions] = usePersistentState<ResearchSession[]>(
    'research_sessions',
    [],
    { version: 1 }
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

// Re-export utility hooks for backward compatibility
export { useDebounce, useCancellableOperation };