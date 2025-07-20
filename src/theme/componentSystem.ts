// Theme-agnostic component system that decouples from Westworld theme
import { spacing, borderRadius, shadows, transitions } from './designTokens';

// Base component variants that can be themed
export const componentVariants = {
  button: {
    base: 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    sizes: {
      sm: `px-3 py-1.5 text-sm ${borderRadius.md}`,
      md: `px-4 py-2 text-sm ${borderRadius.md}`,
      lg: `px-4 py-3 text-base ${borderRadius.md}`,
      xl: `px-6 py-3 text-base ${borderRadius.lg}`,
    },
    variants: {
      primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
      secondary: 'bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    },
  },

  card: {
    base: `rounded-lg ${shadows.md} bg-white`,
    variants: {
      elevated: `${shadows.lg} hover:${shadows.xl} transition-shadow ${transitions.base}`,
      outlined: 'border border-gray-200',
      minimal: 'border-0 shadow-none',
    },
    padding: {
      sm: spacing.sm,
      md: spacing.md,
      lg: spacing.lg,
      xl: spacing.xl,
    },
  },

  input: {
    base: `block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${transitions.base}`,
    sizes: {
      sm: `px-3 py-2 text-sm ${borderRadius.md}`,
      md: `px-4 py-2 text-sm ${borderRadius.md}`,
      lg: `px-4 py-3 text-base ${borderRadius.md}`,
    },
    states: {
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
    },
  },

  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-primary-light text-primary-dark',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
    },
  },

  tooltip: {
    base: 'absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg',
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
    vertical: (gap: string = spacing.md) => `flex flex-col ${gap}`,
    horizontal: (gap: string = spacing.md) => `flex ${gap}`,
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
