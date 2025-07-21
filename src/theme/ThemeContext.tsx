import React, { createContext, useContext, useState, useEffect } from 'react';
import { designSystem } from './designSystem';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: typeof designSystem.colors;
  spacing: typeof designSystem.spacing;
  typography: typeof designSystem.typography;
  shadows: typeof designSystem.shadows;
  borderRadius: typeof designSystem.borderRadius;
  transitions: typeof designSystem.transitions;
  zIndex: typeof designSystem.zIndex;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    colors: designSystem.colors,
    spacing: designSystem.spacing,
    typography: designSystem.typography,
    shadows: designSystem.shadows,
    borderRadius: designSystem.borderRadius,
    transitions: designSystem.transitions,
    zIndex: designSystem.zIndex,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};