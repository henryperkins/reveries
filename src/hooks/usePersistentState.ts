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
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  // Store the default value in a ref to avoid dependency issues
  const defaultValueRef = useRef(defaultValue);

  // Update the ref when defaultValue changes, but use deep comparison
  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [JSON.stringify(defaultValue)]); // Use JSON.stringify for deep comparison

  // Initialize state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        // First try localStorage
        const localData = localStorage.getItem(storageKey);
        let localParsed: any = null;
        if (localData) {
          try {
            localParsed = JSON.parse(localData);
            const value = localParsed.value !== undefined ? localParsed.value : localParsed;
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
                const dbData = prefs?.[key];
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
  }, [key, storageKey, enableDatabase, onSyncError]); // Removed defaultValue from dependencies

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
        if (userId) {
          const dbService = DatabaseService.getInstance();
          const prefs = await dbService.getUserPreferences(userId);
          const dbData = prefs?.[key];
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
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
