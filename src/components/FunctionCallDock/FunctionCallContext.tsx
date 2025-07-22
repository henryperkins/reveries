import { createContext } from 'react';
import { FunctionCallHistory } from '@/types';

export interface LiveFunctionCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
  context?: string; // Human-readable description of what this function is doing
  arguments?: Record<string, any>; // Function arguments for context
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

export const FunctionCallContext = createContext<FunctionCallContextType | undefined>(undefined);
