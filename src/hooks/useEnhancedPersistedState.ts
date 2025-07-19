// MIGRATION NOTICE: This file is deprecated.
// Please use usePersistentState from './usePersistentState' instead.
// This file remains for backward compatibility only.

import { usePersistentState, usePersistentStateEnhanced, useDebounce, useCancellableOperation } from './usePersistentState';
import { ResearchStep } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { DatabaseService } from 'databaseService';

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
export function useEnhancedPersistedState<T>(
  key: string,
  defaultValue: T,
  version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  console.warn('useEnhancedPersistedState is deprecated. Please use usePersistentState instead.');
  return usePersistentState(key, defaultValue, { 
    version,
    enableDatabase: import.meta.env.VITE_ENABLE_DATABASE_PERSISTENCE === "true"
  });
}

// Legacy research sessions hook with database sync - maintained for compatibility
export function useResearchSessions() {
  const enhanced = usePersistentStateEnhanced<ResearchSession[]>(
    'research_sessions',
    [],
    { 
      version: 1,
      enableDatabase: import.meta.env.VITE_ENABLE_DATABASE_PERSISTENCE === "true"
    }
  );

  const addSession = useCallback((session: ResearchSession) => {
    enhanced.setValue(prev => [...prev, session].slice(-10)); // Keep last 10 sessions
  }, [enhanced]);

  const updateSession = useCallback((id: string, updates: Partial<ResearchSession>) => {
    enhanced.setValue(prev =>
      prev.map(session =>
        session.id === id ? { ...session, ...updates } : session
      )
    );
  }, [enhanced]);

  const getSession = useCallback((id: string) => {
    return enhanced.value.find(s => s.id === id);
  }, [enhanced.value]);

  const deleteSession = useCallback((id: string) => {
    enhanced.setValue(prev => prev.filter(s => s.id !== id));
  }, [enhanced]);

  const syncWithDatabase = useCallback(async () => {
    if (!enhanced.isDatabaseConnected) return;
    
    try {
      const userId = sessionStorage.getItem("reveries_user_session_id");
      if (userId) {
        // Sync is handled by the underlying persistent state layer
      }
    } catch (error) {
      console.error('Failed to sync research sessions:', error);
    }
  }, [enhanced.isDatabaseConnected, enhanced.value]);

  return {
    sessions: enhanced.value,
    addSession,
    updateSession,
    getSession,
    deleteSession,
    clearSessions: enhanced.clearValue,
    syncWithDatabase,
    isDatabaseConnected: enhanced.isDatabaseConnected,
    isOnline: navigator.onLine
  };
}

// Legacy database health hook
export function useDatabaseHealth() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const connected = await dbService.isConnected();
        setIsConnected(connected);
        setLastError(null);
      } catch (error) {
        setIsConnected(false);
        setLastError(error as Error);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { isConnected, lastError };
}

// Re-export utility hooks for backward compatibility
export { useDebounce, useCancellableOperation };