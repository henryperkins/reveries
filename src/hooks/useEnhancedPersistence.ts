import { useEffect, useCallback, useState } from 'react';
import { ResearchStep } from '../types';
import { ResearchGraphManager } from '../researchGraph';
import { databaseService } from 'databaseService';

interface PersistenceState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export function useEnhancedPersistence(sessionId: string) {
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  });

  // Check database connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await databaseService.getRecentSessions(sessionId, 1);
        setPersistenceState(prev => ({ ...prev, isConnected: true }));
      } catch (error) {
        console.warn('Database not available, using localStorage fallback');
        setPersistenceState(prev => ({
          ...prev,
          isConnected: false,
          syncError: 'Database connection failed'
        }));
      }
    };
    checkConnection();
  }, []);

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
        await databaseService.saveResearchStep(sessionId, step, parentId);
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
      nodes: Array.from(graphManager.getNodes().values()),
      edges: [], // TODO: Add getEdges() method to ResearchGraphManager
      statistics: graphManager.getStatistics(),
    };

    // Save to localStorage
    saveToLocalStorage('graph', graphData);

    // Try to save to database
    if (persistenceState.isConnected) {
      try {
        await databaseService.saveResearchGraph(sessionId, graphData);
      } catch (error) {
        console.error('Database graph save failed:', error);
      }
    }
  }, [sessionId, persistenceState.isConnected, saveToLocalStorage]);

  // Load research data
  const loadResearchData = useCallback(async (): Promise<{
    steps: ResearchStep[],
    graph: any,
    session: any
  } | null> => {
    // Try database first
    if (persistenceState.isConnected) {
      try {
        const [session, graph, steps] = await Promise.all([
          databaseService.getResearchSession(sessionId),
          databaseService.getResearchGraph(sessionId),
          databaseService.getResearchSteps(sessionId),
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

        if (localSession) {
          await databaseService.saveResearchSession(
            sessionId,
            localSession
          );
        }

        if (localGraph) {
          await databaseService.saveResearchGraph(sessionId, localGraph);
        }

        for (const item of localSteps) {
          await databaseService.saveResearchStep(
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
