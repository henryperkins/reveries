/**
 * HMR State Preservation Utilities
 * 
 * These utilities help preserve complex component state during HMR updates,
 * particularly useful for the Four Hosts Research Architecture components.
 */

interface HMRState {
  [key: string]: any;
}

class HMRStateManager {
  private static instance: HMRStateManager;
  private state: HMRState = {};

  private constructor() {
    // Initialize from HMR data if available
    if (import.meta.hot) {
      this.state = import.meta.hot.data.preservedState || {};
    }
  }

  static getInstance(): HMRStateManager {
    if (!HMRStateManager.instance) {
      HMRStateManager.instance = new HMRStateManager();
    }
    return HMRStateManager.instance;
  }

  /**
   * Save state for a component
   */
  saveState(componentId: string, state: any): void {
    this.state[componentId] = state;
    
    // Persist to HMR data
    if (import.meta.hot) {
      import.meta.hot.data.preservedState = this.state;
    }
  }

  /**
   * Retrieve state for a component
   */
  getState(componentId: string): any {
    return this.state[componentId];
  }

  /**
   * Clear state for a component
   */
  clearState(componentId: string): void {
    delete this.state[componentId];
    
    // Update HMR data
    if (import.meta.hot) {
      import.meta.hot.data.preservedState = this.state;
    }
  }

  /**
   * Clear all preserved state
   */
  clearAll(): void {
    this.state = {};
    
    if (import.meta.hot) {
      import.meta.hot.data.preservedState = {};
    }
  }
}

/**
 * React Hook for HMR state preservation
 */
export function useHMRState<T>(
  componentId: string,
  initialState: T,
  dependencies: any[] = []
): [T, (state: T) => void] {
  const manager = HMRStateManager.getInstance();
  
  // Try to restore state from HMR
  const restoredState = manager.getState(componentId);
  const [state, setState] = useState<T>(restoredState ?? initialState);

  // Save state on changes
  useEffect(() => {
    manager.saveState(componentId, state);
  }, [componentId, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!import.meta.hot) {
        // Only clear in production or when HMR is not active
        manager.clearState(componentId);
      }
    };
  }, [componentId]);

  // Custom setState that also updates HMR state
  const setHMRState = useCallback((newState: T) => {
    setState(newState);
    manager.saveState(componentId, newState);
  }, [componentId]);

  return [state, setHMRState];
}

/**
 * Example usage for paradigm classifier state
 */
export interface ParadigmClassifierState {
  probabilities: {
    dolores: number;
    teddy: number;
    bernard: number;
    maeve: number;
  };
  selectedParadigm: string | null;
  confidence: number;
}

/**
 * Example usage for research context state
 */
export interface ResearchContextState {
  phase: 'analysis' | 'execution' | 'synthesis';
  density: number;
  layers: {
    write: { active: boolean; data: any };
    select: { active: boolean; data: any };
    compress: { active: boolean; data: any };
    isolate: { active: boolean; data: any };
  };
  cache: {
    hits: number;
    misses: number;
    keys: string[];
  };
}

/**
 * HMR setup for a component
 */
export function setupHMR(componentName: string) {
  if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
      if (newModule) {
        console.log(`[HMR] ${componentName} updated, state preserved`);
      }
    });

    import.meta.hot.dispose((data) => {
      // Save any global state before disposal
      data.preservedState = HMRStateManager.getInstance()['state'];
    });

    // Listen for HMR events
    import.meta.hot.on('vite:beforeUpdate', () => {
      console.log(`[HMR] ${componentName} preparing for update...`);
    });

    import.meta.hot.on('vite:error', (err) => {
      console.error(`[HMR] Error in ${componentName}:`, err);
    });
  }
}

// Import React for the hook
import { useState, useEffect, useCallback } from 'react';