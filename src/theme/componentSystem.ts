// Theme-agnostic component system that decouples from Westworld theme
import { spacing, borderRadius, shadows, transitions } from './designSystem';

// Base component variants that can be themed
export const componentVariants = {
  button: {
    base: 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-4 py-3 text-base rounded-md',
      xl: 'px-6 py-3 text-base rounded-lg',
    },
    variants: {
      primary: 'bg-theme-accent text-white hover:bg-theme-accent-dark focus:ring-theme-accent',
      secondary: 'bg-theme-secondary text-theme-primary hover:bg-theme-secondary/80 focus:ring-theme-border',
      outline: 'border border-theme-border bg-transparent hover:bg-theme-secondary focus:ring-theme-border',
      ghost: 'bg-transparent hover:bg-theme-secondary focus:ring-theme-border',
      danger: 'bg-semantic-error text-white hover:bg-semantic-error-dark focus:ring-semantic-error',
    },
  },

  card: {
    base: 'rounded-lg shadow-md bg-theme-surface',
    variants: {
      elevated: 'shadow-lg hover:shadow-xl transition-shadow duration-200',
      outlined: 'border border-theme-border',
      minimal: 'border-0 shadow-none',
    },
    padding: {
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
  },

  input: {
    base: 'block w-full rounded-md border-theme-border shadow-sm focus:border-semantic-primary focus:ring-semantic-primary transition-all duration-200',
    sizes: {
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-4 py-3 text-base rounded-md',
    },
    states: {
      error: 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error',
      success: 'border-semantic-success focus:border-semantic-success focus:ring-semantic-success',
      warning: 'border-semantic-warning focus:border-semantic-warning focus:ring-semantic-warning',
    },
  },

  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-theme-secondary text-theme-primary',
      primary: 'bg-theme-accent/10 text-theme-accent',
      success: 'bg-semantic-success/10 text-semantic-success',
      warning: 'bg-semantic-warning/10 text-semantic-warning',
      error: 'bg-semantic-error/10 text-semantic-error',
    },
  },

  tooltip: {
    base: 'absolute z-50 px-3 py-2 text-sm bg-theme-primary text-theme-primary rounded-md shadow-lg',
    placement: {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    },
  },
};

// Layout utilities
export const layout = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  stack: {
    vertical: (gap: string = spacing[4]) => `flex flex-col ${gap}`,
    horizontal: (gap: string = spacing[4]) => `flex ${gap}`,
  },
  grid: {
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    auto: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
  },
};

// Utility classes for consistent spacing
export const spacingUtils = {
  margin: {
    top: (size: string) => `mt-${size}`,
    bottom: (size: string) => `mb-${size}`,
    left: (size: string) => `ml-${size}`,
    right: (size: string) => `mr-${size}`,
    x: (size: string) => `mx-${size}`,
    y: (size: string) => `my-${size}`,
    all: (size: string) => `m-${size}`,
  },
  padding: {
    top: (size: string) => `pt-${size}`,
    bottom: (size: string) => `pb-${size}`,
    left: (size: string) => `pl-${size}`,
    right: (size: string) => `pr-${size}`,
    x: (size: string) => `px-${size}`,
    y: (size: string) => `py-${size}`,
    all: (size: string) => `p-${size}`,
  },
  space: {
    x: (size: string) => `space-x-${size}`,
    y: (size: string) => `space-y-${size}`,
  },
};

// Z-index utilities
export const zIndexUtils = {
  modal: 'z-50',
  dropdown: 'z-40',
  tooltip: 'z-30',
  sticky: 'z-20',
  base: 'z-10',
  background: 'z-0',
};

// Responsive utilities
export const responsive = {
  hidden: {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
  },
  stack: {
    sm: 'flex-col sm:flex-row',
    md: 'flex-col md:flex-row',
    lg: 'flex-col lg:flex-row',
  },
};
