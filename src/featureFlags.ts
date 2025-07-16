// Feature flags for gradual migration
export const USE_REFACTORED_RESEARCH = 
  import.meta.env.VITE_USE_REFACTORED_RESEARCH === 'true' ||
  process.env.VITE_USE_REFACTORED_RESEARCH === 'true' ||
  false; // Default to false for safety

// Add to existing constants
export const FEATURE_FLAGS = {
  USE_REFACTORED_RESEARCH,
  // Add other feature flags here as needed
} as const;
