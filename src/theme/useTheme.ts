// Unified useTheme hook that replaces all existing theme hooks
import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { ThemeContextType } from './types';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Make sure your component is wrapped with <ThemeProvider>.'
    );
  }

  return context;
};

// Convenience hooks for specific theme aspects
export const useThemeMode = () => {
  const { mode, toggleTheme, setTheme } = useTheme();
  return { mode, toggleTheme, setTheme };
};

export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

export const useParadigmTheme = () => {
  const { getParadigmTheme } = useTheme();
  return getParadigmTheme;
};

export const useComponentVariants = () => {
  const { theme, getComponentVariant } = useTheme();
  return { variants: theme.components, getVariant: getComponentVariant };
};
