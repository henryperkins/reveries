import React, { createContext, useContext, useState, ReactNode } from 'react';
import { HostParadigm } from './paradigm';

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
}

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  currentParadigm: HostParadigm;
  setCurrentParadigm: (paradigm: HostParadigm) => void;
}

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
  },
  fonts: {
    body: 'system-ui, -apple-system, sans-serif',
    heading: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  currentParadigm: 'dolores',
  setCurrentParadigm: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeConfig;
  initialParadigm?: HostParadigm;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = defaultTheme,
  initialParadigm = 'dolores',
}) => {
  const [theme, setTheme] = useState<ThemeConfig>(initialTheme);
  const [currentParadigm, setCurrentParadigm] = useState<HostParadigm>(initialParadigm);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentParadigm, setCurrentParadigm }}>
      <div style={{
        '--color-primary': theme.colors.primary,
        '--color-secondary': theme.colors.secondary,
        '--color-accent': theme.colors.accent,
        '--color-background': theme.colors.background,
        '--color-surface': theme.colors.surface,
        '--color-text': theme.colors.text,
        '--color-text-secondary': theme.colors.textSecondary,
        '--color-border': theme.colors.border,
        '--color-error': theme.colors.error,
        '--color-warning': theme.colors.warning,
        '--color-success': theme.colors.success,
        '--font-body': theme.fonts.body,
        '--font-heading': theme.fonts.heading,
        '--font-mono': theme.fonts.mono,
      } as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
