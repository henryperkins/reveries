// Unified theme system exports

// Core theme system
export { ThemeProvider } from './ThemeProvider';
export { useTheme, useThemeMode, useThemeColors, useParadigmTheme, useComponentVariants } from './useTheme';

// Theme UI components
export { ThemeToggle } from '../components/ThemeToggle';

// Theme configuration and utilities
export { generateCSSVariables, applyThemeToDOM, initializeTheme } from './themeConfig';

// Types
export type { ThemeMode, UnifiedTheme, ThemeContextType, ParadigmTheme, HostParadigm } from './types';

// Design system components
export { designSystem, designSystemDark, getCSSVariable } from './designSystem';
export { componentVariants, layout, spacingUtils, zIndexUtils, responsive } from './componentSystem';

// Paradigm system
export {
  PARADIGM_COLORS,
  getParadigmTheme,
  getParadigmGradient,
  getParadigmClasses,
  isValidParadigm,
  getParadigmFromString,
  DEFAULT_PARADIGM
} from './paradigm';

// Design tokens (for backward compatibility)
export { spacing, zIndex, shadows, transitions, breakpoints, borderRadius } from './designSystem';

// CSS-in-JS utilities (for advanced usage)
export { styled, keyframes, themeTransition } from './styled';

// Theme-aware animations
export { useThemeAnimation, themeAnimationVariants, getThemeAnimationClass } from './animations';
