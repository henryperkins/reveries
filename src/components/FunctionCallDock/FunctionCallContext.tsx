import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FunctionCallHistory } from '@/types';

export interface LiveFunctionCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
}

interface FunctionCallContextType {
  history: FunctionCallHistory[];
  liveCalls: LiveFunctionCall[];
  toolsUsed: string[];
  recommendedTools: string[];
  addToHistory: (call: FunctionCallHistory) => void;
  addLiveCall: (call: Omit<LiveFunctionCall, 'id'>) => string;
  updateLiveCall: (id: string, updates: Partial<LiveFunctionCall>) => void;
  addToolUsed: (tool: string) => void;
  setRecommendedTools: (tools: string[]) => void;
  clearHistory: () => void;
  clearLiveCalls: () => void;
}

const FunctionCallContext = createContext<FunctionCallContextType | undefined>(undefined);

export const useFunctionCalls = () => {
  const context = useContext(FunctionCallContext);
  if (!context) {
    throw new Error('useFunctionCalls must be used within a FunctionCallProvider');
  }
  return context;
};

interface FunctionCallProviderProps {
  children: ReactNode;
  initialHistory?: FunctionCallHistory[];
  initialTools?: string[];
}

export const FunctionCallProvider: React.FC<FunctionCallProviderProps> = ({
  children,
  initialHistory = [],
  initialTools = [],
}) => {
  const [history, setHistory] = useState<FunctionCallHistory[]>(initialHistory);
  const [liveCalls, setLiveCalls] = useState<LiveFunctionCall[]>([]);
  const [toolsUsed, setToolsUsed] = useState<string[]>(initialTools);
  const [recommendedTools, setRecommendedTools] = useState<string[]>([]);

  const addToHistory = useCallback((call: FunctionCallHistory) => {
    setHistory((prev) => [...prev, call]);
  }, []);

  const addLiveCall = useCallback((call: Omit<LiveFunctionCall, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCall: LiveFunctionCall = { ...call, id };
    setLiveCalls((prev) => [...prev, newCall].slice(-5)); // Keep last 5
    return id;
  }, []);

  const updateLiveCall = useCallback((id: string, updates: Partial<LiveFunctionCall>) => {
    setLiveCalls((prev) =>
      prev.map((call) =>
        call.id === id
          ? {
              ...call,
              ...updates,
              duration: updates.endTime && call.startTime
                ? updates.endTime - call.startTime
                : call.duration,
            }
          : call
      )
    );
  }, []);

  const addToolUsed = useCallback((tool: string) => {
    setToolsUsed((prev) => {
      if (!prev.includes(tool)) {
        return [...prev, tool];
      }
      return prev;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const clearLiveCalls = useCallback(() => {
    setLiveCalls([]);
  }, []);

  const value: FunctionCallContextType = {
    history,
    liveCalls,
    toolsUsed,
    recommendedTools,
    addToHistory,
    addLiveCall,
    updateLiveCall,
    addToolUsed,
    setRecommendedTools,
    clearHistory,
    clearLiveCalls,
  };

  return (
    <FunctionCallContext.Provider value={value}>
      {children}
    </FunctionCallContext.Provider>
  );
};