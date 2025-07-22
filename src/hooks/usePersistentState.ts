import { useState, useEffect, useCallback, useRef } from "react";
import { DatabaseService } from "@/services"; // Import from index to get adapter
import { ResearchStep } from '@/types';
import { ResearchGraphManager } from '@/researchGraph';

const STORAGE_PREFIX = "reveries_";
const DEFAULT_VERSION = 1;

interface PersistenceOptions {
  version?: number;
  enableDatabase?: boolean;
  syncInterval?: number;
  onSyncError?: (error: Error) => void;
}

interface PersistenceState<T> {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  clearValue: () => void;
  isInitialized: boolean;
  isDatabaseConnected: boolean;
  lastSyncTime?: Date;
  syncError?: Error;
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options: PersistenceOptions = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const {
    version = DEFAULT_VERSION,
    enableDatabase = import.meta.env.VITE_ENABLE_DATABASE_PERSISTENCE === "true",
    syncInterval = 30000, // 30 seconds
    onSyncError,
  } = options;

  const storageKey = `${STORAGE_PREFIX}${key}_v${version}`;
  const [state, setState] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  // Store the default value in a ref to avoid dependency issues
  const defaultValueRef = useRef(defaultValue);
  const defaultValueKey = JSON.stringify(defaultValue);

  // Update the ref when defaultValue changes, but use deep comparison
  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue, defaultValueKey]); // Use key instead of defaultValue

  // Initialize state from storage
  useEffect(() => {
    const shouldLoadFromStorage = !isInitialized && state === defaultValueRef.current;

    if (shouldLoadFromStorage) {
      const loadState = async () => {
        try {
          // First try localStorage
          const localData = localStorage.getItem(storageKey);
          let localParsed: { value?: T; timestamp?: number } | null = null;
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              // Handle both old format (direct value) and new format ({value, timestamp})
              if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                localParsed = parsed as { value: T; timestamp: number };
              } else {
                // Old format - just the value
                localParsed = { value: parsed, timestamp: 0 };
              }
              const value = localParsed.value;
              setState(value !== null && value !== undefined ? value : defaultValueRef.current);
            } catch (error) {
              console.warn('Failed to parse localStorage data:', error);
              setState(defaultValueRef.current);
            }
          }

          // Then try database if enabled
          if (enableDatabase) {
            try {
              const dbService = DatabaseService.getInstance();
              const userId = sessionStorage.getItem("reveries_user_session_id");
              if (userId) {
                const isConnected = await dbService.isConnected();
                setIsDatabaseConnected(isConnected);

                if (isConnected) {
                  const prefs = await dbService.getUserPreferences(userId);
                  const dbData = prefs?.[key] as { value: T; timestamp: number } | undefined;
                  if (dbData && dbData.timestamp > (localParsed?.timestamp || 0)) {
                    const value = dbData.value !== null && dbData.value !== undefined ? dbData.value : defaultValueRef.current;
                    setState(value);
                    // Update localStorage with newer database data
                    localStorage.setItem(
                      storageKey,
                      JSON.stringify({
                        value: value,
                        timestamp: dbData.timestamp,
                      })
                    );
                  }
                }
              }
            } catch (dbError) {
              console.warn("Database load failed, using localStorage:", dbError);
              onSyncError?.(dbError as Error);
            }
          }
        } catch (error) {
          console.error("Failed to load persisted state:", error);
          setState(defaultValueRef.current);
        } finally {
          setIsInitialized(true);
        }
      };

      loadState();
    }
  }, [storageKey, isInitialized, state, enableDatabase, onSyncError, key]);

  // Save state to storage
  const saveState = useCallback(
    async (newValue: T) => {
      if (!isInitialized) return;

      const timestamp = Date.now();
      const dataToSave = { value: newValue, timestamp };

      try {
        // Always save to localStorage first
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));

        // Save to database if enabled and connected
        if (enableDatabase && isDatabaseConnected) {
          const userId = sessionStorage.getItem("reveries_user_session_id");
          if (userId) {
            // Note: DatabaseService stub doesn't have a save method for preferences
            // This would need to be implemented in the actual DatabaseService
            lastSyncRef.current = new Date();
          }
        }
      } catch (error) {
        console.error("Failed to save state:", error);
        onSyncError?.(error as Error);
      }
    },
    [storageKey, enableDatabase, isDatabaseConnected, isInitialized, onSyncError]
  );

  // Debounced save effect
  useEffect(() => {
    if (!isInitialized) return;

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout for saving
    syncTimeoutRef.current = setTimeout(() => {
      saveState(state);
    }, 500); // 500ms debounce

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, saveState, isInitialized]);

  // Periodic sync with database
  useEffect(() => {
    if (!enableDatabase || !isDatabaseConnected || !syncInterval) return;

    const interval = setInterval(async () => {
      try {
        const userId = sessionStorage.getItem("reveries_user_session_id");
        if (userId) {
          const dbService = DatabaseService.getInstance();
          const prefs = await dbService.getUserPreferences(userId);
          const dbData = prefs?.[key] as { value: T; timestamp: number } | undefined;
          const localData = localStorage.getItem(storageKey);
          let localParsed: { value?: T; timestamp?: number } | null = null;
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                localParsed = parsed;
              } else {
                localParsed = { value: parsed, timestamp: 0 };
              }
            } catch {
              localParsed = null;
            }
          }

          // If database has newer data, update local state
          if (dbData && dbData.timestamp > (localParsed?.timestamp || 0)) {
            setState(dbData.value);
            localStorage.setItem(storageKey, JSON.stringify(dbData));
          }
        }
      } catch (error) {
        console.warn("Periodic sync failed:", error);
        onSyncError?.(error as Error);
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [enableDatabase, isDatabaseConnected, syncInterval, key, storageKey, onSyncError]);

  // Clear state function
  const clearState = useCallback(() => {
    setState(defaultValueRef.current);
    try {
      localStorage.removeItem(storageKey);

      if (enableDatabase && isDatabaseConnected) {
        const userId = sessionStorage.getItem("reveries_user_session_id");
        if (userId) {
          const dbService = DatabaseService.getInstance();
          dbService.getUserPreferences(userId).then(prefs => {
            if (prefs && prefs[key]) {
              delete prefs[key];
              // Note: DatabaseService stub doesn't have a save method for preferences
              return Promise.resolve();
            }
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error("Failed to clear state:", error);
      onSyncError?.(error as Error);
    }
  }, [storageKey, key, enableDatabase, isDatabaseConnected, onSyncError]);

  return [state, setState, clearState];
}

export function usePersistentStateEnhanced<T>(
  key: string,
  defaultValue: T,
  options: PersistenceOptions = {}
): PersistenceState<T> {
  const [value, setValue, clearValue] = usePersistentState(key, defaultValue, options);
  // Local meta‐state used by legacy consumers of this hook.
  // Only the getter parts are required, so we purposefully ignore
  // the setter returned by `useState` to avoid unused-variable
  // TypeScript errors when `noUnusedLocals` is enabled.
  const [isDatabaseConnected] = useState(false);
  const [lastSyncTime] = useState<Date | undefined>(undefined);
  const [syncError] = useState<Error | undefined>(undefined);
  const [isInitialized] = useState(false);

  return {
    value,
    setValue,
    clearValue,
    isInitialized,
    isDatabaseConnected,
    lastSyncTime,
    syncError,
  };
}

// Utility hooks
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

export function useCancellableOperation() {
  const cancelRef = useRef<(() => void) | null>(null);

  const cancelCurrent = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  const setCancelFunction = useCallback((cancelFn: () => void) => {
    cancelCurrent(); // Cancel any existing operation
    cancelRef.current = cancelFn;
  }, [cancelCurrent]);

  useEffect(() => {
    return () => {
      cancelCurrent();
    };
  }, [cancelCurrent]);

  return { setCancelFunction, cancelCurrent };
}

// Research session interface
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
  paradigm?: any;
  paradigmProbabilities?: any;
  phase?: any;
}

// Research sessions hook with database sync
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
  }, [enhanced.isDatabaseConnected]);

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

// Enhanced persistence hook with research-specific features
interface EnhancedPersistenceState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export function useEnhancedPersistence(sessionId: string) {
  const [persistenceState, setPersistenceState] = useState<EnhancedPersistenceState>({
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  });

  // Check database connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.getRecentSessions(1);
        setPersistenceState(prev => ({ ...prev, isConnected: true }));
      } catch (_error) {
        console.warn('Database not available, using localStorage fallback');
        setPersistenceState(prev => ({
          ...prev,
          isConnected: false,
          syncError: 'Database connection failed'
        }));
      }
    };
    checkConnection();
  }, [sessionId]);

  // Save to localStorage
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`reveries_${sessionId}_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('LocalStorage save failed:', error);
    }
  }, [sessionId]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((key: string) => {
    try {
      const data = localStorage.getItem(`reveries_${sessionId}_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('LocalStorage load failed:', error);
      return null;
    }
  }, [sessionId]);

  // Save research step with hybrid storage
  const saveResearchStep = useCallback(async (
    step: ResearchStep,
    parentId?: string
  ) => {
    setPersistenceState(prev => ({ ...prev, isSyncing: true }));

    // Always save to localStorage first
    const localSteps = loadFromLocalStorage('steps') || [];
    localSteps.push({ step, parentId, timestamp: new Date().toISOString() });
    saveToLocalStorage('steps', localSteps);

    // Try to save to database if connected
    if (persistenceState.isConnected) {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.saveResearchStep(sessionId, step, parentId);
        setPersistenceState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          syncError: null
        }));
      } catch (error) {
        console.error('Database save failed:', error);
        setPersistenceState(prev => ({
          ...prev,
          isSyncing: false,
          syncError: 'Failed to sync to database'
        }));
      }
    } else {
      setPersistenceState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [sessionId, persistenceState.isConnected, saveToLocalStorage, loadFromLocalStorage]);

  // Save research graph
  const saveResearchGraph = useCallback(async (graphManager: ResearchGraphManager) => {
    const graphData = {
      nodes: graphManager.getNodes(),
      edges: graphManager.getEdges(),
      statistics: graphManager.getStatistics(),
    };

    // Save to localStorage
    saveToLocalStorage('graph', graphData);

    // Use the built-in persistence method which handles database connectivity automatically
    try {
      await graphManager.persistGraph(sessionId);
    } catch (error) {
      console.error('Graph persistence failed:', error);
    }
  }, [sessionId, saveToLocalStorage]);

  // Load research data
  const loadResearchData = useCallback(async (): Promise<{
    steps: ResearchStep[],
    graph: any,
    session: any
  } | null> => {
    // Try database first
    if (persistenceState.isConnected) {
      try {
        const dbService = DatabaseService.getInstance();
        const [session, graph, steps] = await Promise.all([
          dbService.getResearchSession(sessionId),
          dbService.getResearchGraph(sessionId),
          dbService.getResearchSteps(sessionId),
        ]);

        if (session || graph || steps.length > 0) {
          return { session, graph, steps };
        }
      } catch (error) {
        console.error('Database load failed:', error);
      }
    }

    // Fallback to localStorage
    const localSteps = loadFromLocalStorage('steps') || [];
    const localGraph = loadFromLocalStorage('graph');
    const localSession = loadFromLocalStorage('session');

    if (localSteps.length > 0 || localGraph || localSession) {
      return {
        steps: localSteps.map((item: any) => item.step),
        graph: localGraph,
        session: localSession,
      };
    }

    return null;
  }, [sessionId, persistenceState.isConnected, loadFromLocalStorage]);

  // Sync localStorage to database when connection is restored
  useEffect(() => {
    if (!persistenceState.isConnected) return;

    const syncLocalToDatabase = async () => {
      try {
        const localSteps = loadFromLocalStorage('steps') || [];
        const localGraph = loadFromLocalStorage('graph');
        const localSession = loadFromLocalStorage('session');
        const dbService = DatabaseService.getInstance();

        if (localSession) {
          await dbService.saveResearchSession(
            sessionId,
            localSession
          );
        }

        if (localGraph) {
          await dbService.saveResearchGraph(sessionId, localGraph);
        }

        for (const item of localSteps) {
          await dbService.saveResearchStep(
            sessionId,
            item.step,
            item.parentId
          );
        }

        setPersistenceState(prev => ({
          ...prev,
          lastSyncTime: new Date(),
          syncError: null,
        }));
      } catch (error) {
        console.error('Sync to database failed:', error);
        setPersistenceState(prev => ({
          ...prev,
          syncError: 'Failed to sync local data to database',
        }));
      }
    };

    syncLocalToDatabase();
  }, [persistenceState.isConnected, sessionId, loadFromLocalStorage]);

  return {
    persistenceState,
    saveResearchStep,
    saveResearchGraph,
    loadResearchData,
    saveToLocalStorage,
    loadFromLocalStorage,
  };
}

// Database health hook
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

// Legacy exports for backward compatibility
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  version = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  console.warn('usePersistedState is deprecated. Please use usePersistentState instead.');
  return usePersistentState(key, defaultValue, { version });
}

export function useEnhancedPersistedState<T>(
  key: string,
  defaultValue: T,
  version = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  console.warn('useEnhancedPersistedState is deprecated. Please use usePersistentState instead.');
  return usePersistentState(key, defaultValue, {
    version,
    enableDatabase: import.meta.env.VITE_ENABLE_DATABASE_PERSISTENCE === "true"
  });
}
