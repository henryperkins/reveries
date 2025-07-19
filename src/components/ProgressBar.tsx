// MIGRATION NOTICE: This file is deprecated.
// Please use ProgressMeter from '@/components/atoms' instead.
// This file remains for backward compatibility only.

import React from "react";
import { ProgressBar as UnifiedProgressBar } from '@/components/atoms';

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  value: number;
}

// Legacy wrapper - use ProgressMeter from '@/components/atoms' instead
export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  console.warn('ProgressBar is deprecated. Please use ProgressMeter from @/components/atoms instead.');
  return <UnifiedProgressBar value={value} />;
};