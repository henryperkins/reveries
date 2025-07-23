import { designSystem, designSystemDark } from './designSystem';
import { ThemeMode } from './types';

// Helper function to convert camelCase to kebab-case
const toKebabCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
};

// Generate CSS variables from design tokens
export const generateCSSVariables = (obj: any, prefix = '--'): Record<string, string> => {
  const variables: Record<string, string> = {};
  
  const traverse = (current: any, path: string[] = []) => {
    for (const [key, value] of Object.entries(current)) {
      const kebabKey = toKebabCase(key);
      const currentPath = [...path, kebabKey];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, currentPath);
      } else {
        const variableName = `${prefix}${currentPath.join('-')}`;
        variables[variableName] = String(value);
      }
    }
  };
  
  traverse(obj);
  return variables;
};

// Apply theme to DOM
export function applyThemeToDOM(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const activeDS = mode === 'dark' ? designSystemDark : designSystem;
  const variables = generateCSSVariables(activeDS);

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
      mode === 'dark'
        ? activeDS.colors.semantic.background
        : activeDS.colors.semantic.surface
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
