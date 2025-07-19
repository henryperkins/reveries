// MIGRATION NOTICE: This file is deprecated.
// Please use FunctionCallDock from '@/components/FunctionCallDock' instead.
// This file remains for backward compatibility only.

import React from 'react';
import { FunctionCallDock } from '@/components/FunctionCallDock';

interface ToolUsageIndicatorProps {
  toolsUsed?: string[];
  recommendedTools?: string[];
}

// Legacy wrapper - use FunctionCallDock with mode="tools" instead
export const ToolUsageIndicator: React.FC<ToolUsageIndicatorProps> = () => {
  console.warn('ToolUsageIndicator is deprecated. Please use FunctionCallDock with mode="tools" instead.');
  
  return (
    <FunctionCallDock 
      mode="tools" 
      showModeSelector={false}
    />
  );
};