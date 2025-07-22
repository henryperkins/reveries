import { useContext } from 'react';
import { FunctionCallContext } from './FunctionCallContext';

export const useFunctionCalls = () => {
  const context = useContext(FunctionCallContext);
  if (!context) {
    throw new Error('useFunctionCalls must be used within FunctionCallProvider');
  }
  return context;
};

// Re-export for convenience
export { FunctionCallProvider } from './FunctionCallProvider';
export type { LiveFunctionCall } from './FunctionCallContext';
