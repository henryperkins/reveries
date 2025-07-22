// Unified ThemeProvider that combines all theme systems
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';
import { ThemeMode, ThemeContextType } from './types';
import { createThemeConfig, applyThemeToDOM, initializeTheme } from './themeConfig';
import { getParadigmTheme } from './paradigm';
import { componentVariants } from './componentSystem';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return defaultMode || initializeTheme();
  });

  // Apply theme to DOM whenever mode changes
  useEffect(() => {
    applyThemeToDOM(mode);
  }, [mode]);

  // Create unified theme configuration
  const theme = useMemo(() => createThemeConfig(mode), [mode]);

  // Theme switching functions
  const toggleTheme = useCallback(() => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  // Utility functions (from themeUtils)
  const getCSSVariable = useCallback((variable: string, fallback?: string): string => {
    if (typeof document === 'undefined') return fallback || '';

    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();

    return value || fallback || '';
  }, []);

  const setCSSVariable = useCallback((variable: string, value: string) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(variable, value);
  }, []);

  const getWestworldColors = useCallback(() => {
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
  }, [getCSSVariable]);

  // Component system utilities
  const getComponentVariant = useCallback((component: string, variant: string): string => {
    const componentConfig = componentVariants[component as keyof typeof componentVariants];
    if (!componentConfig) return '';

    const variantConfig = componentConfig.variants?.[variant];
    if (!variantConfig) return '';

    return typeof variantConfig === 'string' ? variantConfig : '';
  }, []);

  // Context value
  const contextValue: ThemeContextType = useMemo(() => ({
    theme,
    mode,
    toggleTheme,
    setTheme: setThemeMode,
    getCSSVariable,
    setCSSVariable,
    getWestworldColors,
    getComponentVariant,
    getParadigmTheme,
  }), [
    theme,
    mode,
    toggleTheme,
    setThemeMode,
    getCSSVariable,
    setCSSVariable,
    getWestworldColors,
    getComponentVariant,
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
