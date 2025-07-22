// Theme exports
export * from './paradigm';
export * from './designTokens';

// Re-export commonly used functions for convenience
export {
  getParadigmTheme,
  getParadigmGradient,
  getParadigmClasses,
  isValidParadigm,
  getParadigmFromString,
  DEFAULT_PARADIGM
} from './paradigm';

// Export types
export type { ParadigmTheme, Paradigm } from './paradigm';

// Re-export the main ThemeContext and ThemeToggle from their correct locations
export { ThemeProvider, useTheme } from '../contexts/ThemeContext';
export { ThemeToggle } from '../components/ThemeToggle';

// Export styled components and CSS variables for CSS-in-JS usage
export { styled, themeVariables, keyframes, themeTransition } from './styled';

// Export design tokens
export { spacing, sizing, zIndex, borderRadius, shadows, transitions, breakpoints } from './designTokens';
