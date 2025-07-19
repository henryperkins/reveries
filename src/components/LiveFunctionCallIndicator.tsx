// MIGRATION NOTICE: This file is deprecated.
// Please use FunctionCallDock from '@/components/FunctionCallDock' instead.
// This file remains for backward compatibility only.

import React from 'react';
import { FunctionCallDock } from '@/components/FunctionCallDock';

interface LiveFunctionCallIndicatorProps {
  calls?: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp: number;
    duration?: number;
  }>;
}

// Legacy wrapper - use FunctionCallDock with mode="live" instead
export const LiveFunctionCallIndicator: React.FC<LiveFunctionCallIndicatorProps> = () => {
  console.warn('LiveFunctionCallIndicator is deprecated. Please use FunctionCallDock with mode="live" instead.');
  
  return (
    <FunctionCallDock 
      mode="live" 
      showModeSelector={false}
    />
  );
};