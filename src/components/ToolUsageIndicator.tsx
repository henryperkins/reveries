// MIGRATION NOTICE: This file is deprecated.
// Please use FunctionCallDock from '@/components/FunctionCallDock' instead.
// This file remains for backward compatibility only.

import React from 'react';
import { FunctionCallDock } from '@/components/FunctionCallDock';

interface ToolUsageIndicatorProps {
  toolsUsed?: string[];
  recommendedTools?: string[];
}

// Legacy wrapper around FunctionCallDock for backward compatibility.
// Emits a deprecation warning **once** per session instead of every render.
let warned = false;

export const ToolUsageIndicator: React.FC<ToolUsageIndicatorProps> = () => {
  React.useEffect(() => {
    if (!warned) {
      console.warn(
        'ToolUsageIndicator is deprecated. Please migrate to FunctionCallDock. This warning will appear only once.'
      );
      warned = true;
    }
  }, []);

  return (
    <FunctionCallDock
      mode="tools"
      showModeSelector={false}
    />
  );
};
