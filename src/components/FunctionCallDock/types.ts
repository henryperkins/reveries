import { FunctionCallHistory } from '@/types';

export interface LiveFunctionCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
  context?: string;
  arguments?: Record<string, any>;
}

export type FunctionCall = FunctionCallHistory;