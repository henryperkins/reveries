// Theme utility functions for consistent theme handling across the application

/**
 * Get the current theme from the document
 */
export function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';

  const htmlElement = document.documentElement;
  return htmlElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Apply theme to document with proper transitions
 */
export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Enable transitions
  root.classList.add('theme-transition');

  // Remove old theme classes
  root.classList.remove('light', 'dark');
  root.removeAttribute('data-theme');

  // Apply new theme
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? '#1A1512' : '#FAF6F2'
    );
  }

  // Save to localStorage
  localStorage.setItem('theme', theme);
}

/**
 * Get CSS variable value with fallback
 */
export function getCSSVariable(variable: string, fallback?: string): string {
  if (typeof document === 'undefined') return fallback || '';

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();

  return value || fallback || '';
}

/**
 * Set CSS variable value
 */
export function setCSSVariable(variable: string, value: string) {
  if (typeof document === 'undefined') return;

  document.documentElement.style.setProperty(variable, value);
}

/**
 * Check if system prefers dark mode
 */
export function systemPrefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initializeTheme(): 'light' | 'dark' {
  // Check localStorage first
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  // Fall back to system preference
  return systemPrefersDarkMode() ? 'dark' : 'light';
}

/**
 * Get Westworld theme colors for the current theme
 */
export function getWestworldColors() {
  return {
    cream: getCSSVariable('--color-westworld-cream'),
    beige: getCSSVariable('--color-westworld-beige'),
    tan: getCSSVariable('--color-westworld-tan'),
    brown: getCSSVariable('--color-westworld-brown'),
    darkBrown: getCSSVariable('--color-westworld-dark-brown'),
    nearBlack: getCSSVariable('--color-westworld-near-black'),
    black: getCSSVariable('--color-westworld-black'),
    gold: getCSSVariable('--color-westworld-gold'),
    darkGold: getCSSVariable('--color-westworld-dark-gold'),
    rust: getCSSVariable('--color-westworld-rust'),
    copper: getCSSVariable('--color-westworld-copper'),
    darkCopper: getCSSVariable('--color-westworld-dark-copper'),
    white: getCSSVariable('--color-westworld-white'),
  };
}

/**
 * Utility to check if the theme system is working properly
 */
export function validateThemeImplementation(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if document exists
  if (typeof document === 'undefined') {
    errors.push('Document is not available (SSR environment)');
    return { isValid: false, errors, warnings };
  }

  const root = document.documentElement;

  // Check if theme classes are applied
  const hasThemeClass = root.classList.contains('light') || root.classList.contains('dark');
  if (!hasThemeClass) {
    errors.push('No theme class (light/dark) found on document element');
  }

  // Check if data-theme attribute is set
  const hasDataTheme = root.hasAttribute('data-theme');
  if (!hasDataTheme) {
    warnings.push('data-theme attribute not found on document element');
  }

  // Check if CSS variables are defined
  const testVariables = [
    '--color-westworld-cream',
    '--color-westworld-gold',
    '--shadow-md',
    '--spacing-md'
  ];

  testVariables.forEach(variable => {
    const value = getCSSVariable(variable);
    if (!value) {
      errors.push(`CSS variable ${variable} is not defined or has no value`);
    }
  });

  // Check if ThemeProvider is in the React tree (basic check)
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) {
    warnings.push('Theme toggle button not found - ThemeProvider may not be properly implemented');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
