// MIGRATION NOTICE: This file is deprecated.
// Please use FunctionCallDock from '@/components/FunctionCallDock' instead.
// This file remains for backward compatibility only.

import React from 'react';
import { FunctionCallHistory } from '@/types';
import { FunctionCallDock } from '@/components/FunctionCallDock';

interface FunctionCallVisualizerProps {
  history: FunctionCallHistory[];
}

// Legacy wrapper - use FunctionCallDock with mode="history" instead
export const FunctionCallVisualizer: React.FC<FunctionCallVisualizerProps> = () => {
  console.warn('FunctionCallVisualizer is deprecated. Please use FunctionCallDock with mode="history" instead.');
  
  // Create a temporary provider with the history data
  return (
    <div className="function-call-history">
      <FunctionCallDock 
        mode="history" 
        showModeSelector={false}
      />
    </div>
  );
};