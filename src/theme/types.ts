// Unified theme types combining all theme systems
import { designSystem } from './designSystem';
import { ParadigmTheme, HostParadigm } from './paradigm';

export type ThemeMode = 'light' | 'dark';

// Core theme configuration
export interface UnifiedTheme {
  mode: ThemeMode;
  colors: typeof designSystem.colors;
  typography: typeof designSystem.typography;
  spacing: typeof designSystem.spacing;
  borderRadius: typeof designSystem.borderRadius;
  shadows: typeof designSystem.shadows;
  zIndex: typeof designSystem.zIndex;
  transitions: typeof designSystem.transitions;
  breakpoints: typeof designSystem.breakpoints;
  components: typeof designSystem.components;
  paradigms: Record<HostParadigm, ParadigmTheme>;
}

// Theme context type
export interface ThemeContextType {
  theme: UnifiedTheme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  // Utility functions from themeUtils
  getCSSVariable: (variable: string, fallback?: string) => string;
  setCSSVariable: (variable: string, value: string) => void;
  getWestworldColors: () => Record<string, string>;
  // Component system utilities
  getComponentVariant: (component: string, variant: string) => string;
  getParadigmTheme: (paradigm: HostParadigm) => ParadigmTheme;
}

// Re-export types for convenience
export type { ParadigmTheme, HostParadigm };
export { PARADIGM_COLORS } from './paradigm';