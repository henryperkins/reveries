import { spacing, sizing, zIndex, borderRadius, shadows, transitions, breakpoints } from './designTokens';

// Color palette for light and dark themes
export const colors = {
  // Primary colors
  primary: {
    light: '#3B82F6',
    dark: '#60A5FA',
    hover: {
      light: '#2563EB',
      dark: '#3B82F6',
    },
  },

  // Secondary colors
  secondary: {
    light: '#F3F4F6',
    dark: '#374151',
    hover: {
      light: '#E5E7EB',
      dark: '#4B5563',
    },
  },

  // Accent colors
  accent: {
    light: '#F59E0B',
    dark: '#FBBF24',
  },

  // Background colors
  background: {
    light: '#F9FAFB',
    dark: '#111827',
    secondary: {
      light: '#FFFFFF',
      dark: '#1F2937',
    },
  },

  // Surface colors
  surface: {
    light: '#FFFFFF',
    dark: '#1F2937',
  },

  // Text colors
  text: {
    primary: {
      light: '#111827',
      dark: '#F9FAFB',
    },
    secondary: {
      light: '#6B7280',
      dark: '#9CA3AF',
    },
    muted: {
      light: '#9CA3AF',
      dark: '#6B7280',
    },
  },

  // Border colors
  border: {
    light: '#E5E7EB',
    dark: '#374151',
  },

  // Status colors
  success: {
    light: '#10B981',
    dark: '#34D399',
  },

  warning: {
    light: '#F59E0B',
    dark: '#FBBF24',
  },

  error: {
    light: '#EF4444',
    dark: '#F87171',
  },

  info: {
    light: '#3B82F6',
    dark: '#60A5FA',
  },

  // Shimmer colors for loading states
  shimmer: {
    light: '#F3F4F6',
    secondary: {
      light: '#E5E7EB',
      dark: '#374151',
    },
    dark: '#374151',
  },

  // Westworld theme colors
  westworld: {
    cream: {
      light: '#F7F3E9',
      dark: '#1A1A1A',
    },
    beige: {
      light: '#E8E2D5',
      dark: '#2A2A2A',
    },
    tan: {
      light: '#D4C4A8',
      dark: '#3A3A3A',
    },
    brown: {
      light: '#8B4513',
      dark: '#B87333',
    },
    darkBrown: {
      light: '#654321',
      dark: '#D4AF37',
    },
    nearBlack: {
      light: '#1A1A1A',
      dark: '#FAFAFA',
    },
    black: {
      light: '#000000',
      dark: '#FFFFFF',
    },
    gold: {
      light: '#FFD700',
      dark: '#F4CF57',
    },
    darkGold: {
      light: '#B8860B',
      dark: '#E4BF47',
    },
    rust: {
      light: '#B7410E',
      dark: '#D4733D',
    },
    copper: {
      light: '#B87333',
      dark: '#E89353',
    },
    darkCopper: {
      light: '#8B4513',
      dark: '#D88343',
    },
    white: {
      light: '#FFFFFF',
      dark: '#0A0A0A',
    },
  },
};

// Typography
export const typography = {
  fontFamily: {
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Dark mode shadows
export const darkShadows = {
  sm: '0 1px 2px 0 rgba(255, 255, 255, 0.05)',
  md: '0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -2px rgba(255, 255, 255, 0.1)',
  lg: '0 10px 15px -3px rgba(255, 255, 255, 0.1), 0 4px 6px -4px rgba(255, 255, 255, 0.1)',
  xl: '0 20px 25px -5px rgba(255, 255, 255, 0.1), 0 8px 10px -6px rgba(255, 255, 255, 0.1)',
  '2xl': '0 25px 50px -12px rgba(255, 255, 255, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.05)',
};

// Complete theme object
export const theme = {
  colors,
  spacing,
  sizing,
  zIndex,
  borderRadius,
  shadows: {
    ...shadows,
    dark: darkShadows,
  },
  transitions,
  breakpoints,
  typography,
};

// Helper function to get theme-aware styles
interface ColorValue {
  light: string;
  dark: string;
}

export const getThemeValue = (path: string, isDark = false): string | undefined => {
  const keys = path.split('.');
  let value: unknown = theme;

  for (const key of keys) {
    if (typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  if (typeof value === 'object' && value !== null && 'light' in value && 'dark' in value) {
    const colorValue = value as ColorValue;
    return isDark ? colorValue.dark || colorValue.light : colorValue.light || colorValue.dark;
  }

  return typeof value === 'string' ? value : undefined;
};

// CSS variables for runtime theming
export const cssVariables = {
  light: {
    '--color-primary': colors.primary.light,
    '--color-secondary': colors.secondary.light,
    '--color-accent': colors.accent.light,
    '--color-background': colors.background.light,
    '--color-surface': colors.surface.light,
    '--color-text-primary': colors.text.primary.light,
    '--color-text-secondary': colors.text.secondary.light,
    '--color-text-muted': colors.text.muted.light,
    '--color-border': colors.border.light,
    '--color-success': colors.success.light,
    '--color-warning': colors.warning.light,
    '--color-error': colors.error.light,
    '--color-info': colors.info.light,
    '--shadow-sm': shadows.sm,
    '--shadow-md': shadows.md,
    '--shadow-lg': shadows.lg,
    '--shadow-xl': shadows.xl,
  },
  dark: {
    '--color-primary': colors.primary.dark,
    '--color-secondary': colors.secondary.dark,
    '--color-accent': colors.accent.dark,
    '--color-background': colors.background.dark,
    '--color-surface': colors.surface.dark,
    '--color-text-primary': colors.text.primary.dark,
    '--color-text-secondary': colors.text.secondary.dark,
    '--color-text-muted': colors.text.muted.dark,
    '--color-border': colors.border.dark,
    '--color-success': colors.success.dark,
    '--color-warning': colors.warning.dark,
    '--color-error': colors.error.dark,
    '--color-info': colors.info.dark,
    '--shadow-sm': darkShadows.sm,
    '--shadow-md': darkShadows.md,
    '--shadow-lg': darkShadows.lg,
    '--shadow-xl': darkShadows.xl,
  },
};
