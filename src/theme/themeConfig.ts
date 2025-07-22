// Theme configuration builder that combines all theme systems
import { designSystem } from './designSystem';
import { PARADIGM_COLORS } from './paradigm';
import { ThemeMode, UnifiedTheme } from './types';

// Generate CSS variables from design system
export function generateCSSVariables(mode: ThemeMode): Record<string, string> {
  const variables: Record<string, string> = {};
  const isDark = mode === 'dark';

  // Westworld color variables - use camelCase to match Tailwind config
  const westworldColors = designSystem.colors.westworld;
  Object.entries(westworldColors).forEach(([key, value]) => {
    variables[`--color-westworld-${key}`] = value;
  });

  // Semantic color variables - use camelCase to match Tailwind config
  const semanticColors = designSystem.colors.semantic;
  Object.entries(semanticColors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      variables[`--color-${key}`] = value;
    }
  });

  // Theme-specific semantic variables
  if (isDark) {
    variables['--color-bg-primary'] = '#1A1512';
    variables['--color-bg-secondary'] = '#2A2522';
    variables['--color-bg-tertiary'] = '#3A3532';
    variables['--color-text-primary'] = '#FAF6F2';
    variables['--color-text-secondary'] = '#E8D5C4';
    variables['--color-text-muted'] = '#A68B6F';
    variables['--color-border'] = '#3A3532';
    variables['--color-border-light'] = 'rgba(58, 53, 50, 0.5)';
    variables['--color-accent'] = '#D4AF37';
    variables['--color-accent-hover'] = '#E4BF47';
    variables['--color-surface'] = '#2A2522';
    variables['--color-surface-hover'] = '#3A3532';
    variables['--color-input-bg'] = '#2A2522';
    variables['--color-input-border'] = '#3A3532';
    variables['--color-button-primary'] = '#D4AF37';
    variables['--color-button-secondary'] = '#3A3532';
  } else {
    variables['--color-bg-primary'] = '#FAF6F2';
    variables['--color-bg-secondary'] = '#F5EDE4';
    variables['--color-bg-tertiary'] = '#E8D5C4';
    variables['--color-text-primary'] = '#2A2522';
    variables['--color-text-secondary'] = '#6B5637';
    variables['--color-text-muted'] = '#8B6F47';
    variables['--color-border'] = '#E8D5C4';
    variables['--color-border-light'] = 'rgba(232, 213, 196, 0.5)';
    variables['--color-accent'] = '#D4AF37';
    variables['--color-accent-hover'] = '#B8941F';
    variables['--color-surface'] = '#FFFFFF';
    variables['--color-surface-hover'] = '#FAF6F2';
    variables['--color-input-bg'] = '#FFFFFF';
    variables['--color-input-border'] = '#E8D5C4';
    variables['--color-button-primary'] = '#D4AF37';
    variables['--color-button-secondary'] = '#8B6F47';
  }

  // Typography variables
  Object.entries(designSystem.typography['font-size']).forEach(([key, value]) => {
    variables[`--text-${key}`] = value as string;
  });

  // Spacing variables
  Object.entries(designSystem.spacing).forEach(([key, value]) => {
    variables[`--spacing-${key}`] = value;
  });

  // Shadow variables
  Object.entries(designSystem.shadows).forEach(([key, value]) => {
    if (key !== 'glow' && key !== 'glowLg') {
      variables[`--shadow-${key}`] = value;
    }
  });

  // Special glow shadows
  variables['--shadow-glow'] = designSystem.shadows.glow;
  variables['--shadow-glow-lg'] = designSystem.shadows.glowLg;

  // Border radius variables
  Object.entries(designSystem['border-radius']).forEach(([key, value]) => {
    variables[`--radius-${key}`] = value as string;
  });

  // Transition variables
  Object.entries(designSystem.transitions.duration).forEach(([key, value]) => {
    variables[`--transition-${key}`] = value;
  });

  // Z-index variables
  Object.entries(designSystem.zIndex).forEach(([key, value]) => {
    variables[`--z-${key}`] = String(value);
  });

  // Component-specific size variables
  variables['--height-research-area-min'] = '200px';
  variables['--height-input-min'] = '24px';
  variables['--height-input-max'] = '200px';
  variables['--height-textarea-min'] = '100px';
  variables['--width-progress-group-min'] = '200px';
  
  // Tooltip-specific variables
  variables['--color-tooltip-bg'] = isDark ? '#111827' : '#1F2937';
  variables['--color-tooltip-text'] = '#FFFFFF';
  variables['--spacing-tooltip-margin'] = '8px';

  return variables;
}

// Create unified theme configuration
export function createThemeConfig(mode: ThemeMode): UnifiedTheme {
  return {
    mode,
    colors: designSystem.colors,
    typography: designSystem.typography,
    spacing: designSystem.spacing,
    borderRadius: designSystem['border-radius'],
    shadows: designSystem.shadows,
    zIndex: designSystem.zIndex,
    transitions: designSystem.transitions,
    breakpoints: designSystem.breakpoints,
    components: designSystem.components,
    paradigms: PARADIGM_COLORS,
  };
}

// Apply theme to DOM
export function applyThemeToDOM(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const variables = generateCSSVariables(mode);

  // Remove old theme classes
  root.classList.remove('light', 'dark', 'theme-transition');
  root.removeAttribute('data-theme');

  // Apply new theme
  root.classList.add(mode);
  root.setAttribute('data-theme', mode);

  // Set CSS variables
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      mode === 'dark' ? designSystem.colors.westworld['near-black'] : designSystem.colors.westworld.cream
    );
  }

  // Add transition class after a delay to avoid initial flash
  setTimeout(() => {
    root.classList.add('theme-transition');
  }, 50);

  // Save to localStorage
  localStorage.setItem('theme', mode);
}

// Initialize theme from localStorage or system preference
export function initializeTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  // Check localStorage first
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
