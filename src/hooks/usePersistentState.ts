import { useState, useEffect, useCallback, useRef } from "react";
import { DatabaseService } from "databaseService";

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
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<Date>();

  // Initialize state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        // First try localStorage
        const localData = localStorage.getItem(storageKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          setState(parsed);
        }

        // Then try database if enabled
        if (enableDatabase) {
          try {
            const userId = sessionStorage.getItem("reveries_user_session_id");
            if (userId && DatabaseService.checkConnection) {
              const isConnected = await DatabaseService.checkConnection();
              setIsDatabaseConnected(isConnected);

              if (isConnected && DatabaseService.getUserData) {
                const dbData = await DatabaseService.getUserData(userId, key);
                if (dbData && dbData.timestamp > (parsed?.timestamp || 0)) {
                  setState(dbData.value);
                  // Update localStorage with newer database data
                  localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                      value: dbData.value,
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
        setState(defaultValue);
      } finally {
        setIsInitialized(true);
      }
    };

    loadState();
  }, [key, storageKey, defaultValue, enableDatabase, onSyncError]);

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
          if (userId && DatabaseService.saveUserData) {
            await DatabaseService.saveUserData(userId, key, dataToSave);
            lastSyncRef.current = new Date();
          }
        }
      } catch (error) {
        console.error("Failed to save state:", error);
        onSyncError?.(error as Error);
      }
    },
    [storageKey, key, enableDatabase, isDatabaseConnected, isInitialized, onSyncError]
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
        if (userId && DatabaseService.getUserData) {
          const dbData = await DatabaseService.getUserData(userId, key);
          const localData = localStorage.getItem(storageKey);
          const localParsed = localData ? JSON.parse(localData) : null;

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
    setState(defaultValue);
    try {
      localStorage.removeItem(storageKey);
      
      if (enableDatabase && isDatabaseConnected) {
        const userId = sessionStorage.getItem("reveries_user_session_id");
        if (userId && DatabaseService.deleteUserData) {
          DatabaseService.deleteUserData(userId, key).catch(console.error);
        }
      }
    } catch (error) {
      console.error("Failed to clear state:", error);
    }
  }, [storageKey, key, defaultValue, enableDatabase, isDatabaseConnected]);

  // Custom setState that maintains sync
  const setStateWithSync = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (action) => {
      setState(action);
    },
    []
  );

  return [state, setStateWithSync, clearState];
}

// Enhanced version that returns additional persistence information
export function usePersistentStateEnhanced<T>(
  key: string,
  defaultValue: T,
  options: PersistenceOptions = {}
): PersistenceState<T> {
  const [value, setValue, clearValue] = usePersistentState(key, defaultValue, options);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [syncError, setSyncError] = useState<Error>();

  useEffect(() => {
    const checkConnection = async () => {
      if (options.enableDatabase ?? import.meta.env.VITE_ENABLE_DATABASE_PERSISTENCE === "true") {
        try {
          const connected = await DatabaseService.checkConnection?.() ?? false;
          setIsDatabaseConnected(connected);
        } catch (error) {
          setIsDatabaseConnected(false);
        }
      }
      setIsInitialized(true);
    };

    checkConnection();
  }, [options.enableDatabase]);

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

// Utility hooks that were in the original files
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const startOperation = useCallback(() => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { startOperation, cancelOperation };
}