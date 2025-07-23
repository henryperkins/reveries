import { generateCSSVariables } from './themeConfig';

/**
 * Unified Design System for Reveries
 * Single source of truth for all design tokens and theme configuration
 */

export const designSystem = {
  // Color Palette
  colors: {
    // Westworld Theme Colors
    westworld: {
      cream: '#FAF6F2',
      beige: '#F5EDE4',
      tan: '#E8D5C4',
      brown: '#8B6F47',
      darkBrown: '#6B5637',
      nearBlack: '#2A2522',
      black: '#1A1512',
      gold: '#D4AF37',
      darkGold: '#B8941F',
      rust: '#A85732',
      copper: '#C87543',
      darkCopper: '#A65E36',
      white: '#FFFFFF',
    },

    // Semantic Colors
    semantic: {
      primary: '#D4AF37', // gold
      primaryDark: '#B8941F',
      secondary: '#C87543', // copper
      secondaryDark: '#A65E36',
      background: '#F5EDE4', // beige
      surface: '#FAF6F2', // cream
      text: '#2A2522', // near-black
      textMuted: '#8B6F47', // brown
      border: '#E8D5C4', // tan

      // State colors
      success: '#10B981',
      successLight: '#D1FAE5',
      warning: '#F59E0B',
      warningLight: '#FEF3C7',
      error: '#EF4444',
      errorLight: '#FEE2E2',
      info: '#3B82F6',
      infoLight: '#DBEAFE',
    },
  },

  // Typography Scale
  typography: {
    'font-family': {
      sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      serif: "'Georgia', 'Times New Roman', serif",
      mono: "'JetBrains Mono', 'Consolas', 'Monaco', monospace",
    },

    'font-size': {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },

    'font-weight': {
      thin: 100,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    'line-height': {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Spacing Scale
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

    // Custom shadows
    glow: '0 0 10px rgba(212, 175, 55, 0.5)',
    glowLg: '0 0 20px rgba(212, 175, 55, 0.8), 0 0 30px rgba(212, 175, 55, 0.6)',
  },

  // Z-index Scale
  zIndex: {
    auto: 'auto',
    0: 0,
    base: 1,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
    top: 90,
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },

    timing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component Variants
  components: {
    button: {
      base: 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      sizes: {
        sm: {
          px: '0.75rem',
          py: '0.375rem',
          fontSize: '0.875rem',
        },
        md: {
          px: '1rem',
          py: '0.5rem',
          fontSize: '1rem',
        },
        lg: {
          px: '1.5rem',
          py: '0.75rem',
          fontSize: '1.125rem',
        },
        xl: {
          px: '2rem',
          py: '1rem',
          fontSize: '1.25rem',
        },
      },

      variants: {
        primary: {
          bg: 'westworld.gold',
          color: 'westworld.nearBlack',
          hoverBg: 'westworld.darkGold',
        },
        secondary: {
          bg: 'westworld.copper',
          color: 'westworld.white',
          hoverBg: 'westworld.darkCopper',
        },
        outline: {
          bg: 'transparent',
          color: 'westworld.brown',
          border: 'westworld.tan',
          hoverBg: 'westworld.tan',
          hoverColor: 'westworld.nearBlack',
        },
        ghost: {
          bg: 'transparent',
          color: 'westworld.brown',
          border: 'westworld.tan',
          hoverBg: 'westworld.tan',
          hoverColor: 'westworld.nearBlack',
        },
        danger: {
          bg: 'semantic.error',
          color: 'westworld.white',
          hoverBg: 'semantic.errorDark',
        },
      },
    },

    card: {
      base: 'rounded-lg bg-white shadow-md',
      variants: {
        elevated: 'shadow-lg hover:shadow-xl transition-shadow',
        outlined: 'border border-gray-200',
        minimal: 'border-0 shadow-none',
      },
      padding: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    },

    input: {
      sizes: {
        sm: {
          px: '0.75rem',
          py: '0.375rem',
          fontSize: '0.875rem',
        },
        md: {
          px: '1rem',
          py: '0.5rem',
          fontSize: '1rem',
        },
        lg: {
          px: '1.25rem',
          py: '0.625rem',
          fontSize: '1.125rem',
        },
      },
    },
  },
};

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

// Helper function to get CSS variables
export const getCSSVariable = (path: string) => {
  const keys = path.split('.');
  let value: unknown = designSystem;

  for (const key of keys) {
    value = (value as Record<string, unknown>)[key];
    if (value === undefined) return undefined;
  }

  return value;
};

// Generate all CSS variables
export const cssVariables = generateCSSVariables(designSystem);

// Export individual sections for convenience
export const { colors, typography, spacing, shadows, zIndex, transitions, breakpoints, components } = designSystem;
export const borderRadius = designSystem.borderRadius;
