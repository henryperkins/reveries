import { useTheme } from './ThemeProvider';
import { AnimationName, AnimationOptions } from '@/hooks/useAnimation';

/**
 * Theme-aware animation variants that adapt to the current theme
 */
export interface ThemeAnimationVariant {
  name: AnimationName;
  options: AnimationOptions;
  themeOptions?: {
    useThemeColors?: boolean;
    paradigmAware?: boolean;
  };
}

/**
 * Hook for theme-aware animations
 */
export function useThemeAnimation() {
  const { theme, getCSSVariable } = useTheme();
  
  const getThemeAnimationOptions = (
    variant: ThemeAnimationVariant,
    paradigm?: string
  ): AnimationOptions => {
    const baseOptions = { ...variant.options };
    
    if (variant.themeOptions?.useThemeColors) {
      // For animations that use colors, we need to apply them via CSS variables
      // The actual color application happens in CSS/styles
      const paradigmColor = paradigm ? 
        getCSSVariable(`--colors-paradigm-${paradigm}-primary`) : 
        getCSSVariable('--colors-westworld-gold');
      
      // Store color info in dataset for CSS to use
      baseOptions.onStart = () => {
        variant.options.onStart?.();
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--animation-color', paradigmColor);
        }
      };
    }
    
    // Use theme transition durations
    if (!baseOptions.duration) {
      baseOptions.duration = getCSSVariable('--transitions-duration-base', '200ms');
    }
    
    return baseOptions;
  };
  
  return { getThemeAnimationOptions };
}

/**
 * Pre-defined theme-aware animation variants
 */
export const themeAnimationVariants = {
  // Entrance animations
  entrance: {
    fadeIn: {
      name: 'fadeIn' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-slow, 300ms)',
        fillMode: 'both' as const,
      }
    },
    slideUp: {
      name: 'slideUp' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-slow, 300ms)',
        fillMode: 'both' as const,
      }
    }
  },
  
  // Feedback animations
  feedback: {
    pulse: {
      name: 'pulse' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-slower, 500ms)',
        iterationCount: 2,
      },
      themeOptions: {
        useThemeColors: true
      }
    },
    glow: {
      name: 'glow' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-slower, 500ms)',
        iterationCount: 1,
      },
      themeOptions: {
        useThemeColors: true,
        paradigmAware: true
      }
    }
  },
  
  // Loading animations
  loading: {
    shimmer: {
      name: 'shimmer' as AnimationName,
      options: {
        duration: '1.5s',
        iterationCount: 'infinite',
      }
    },
    circuit: {
      name: 'circuit' as AnimationName,
      options: {
        duration: '2s',
        fillMode: 'forwards' as const,
        timingFunction: 'var(--transitions-easing-easeOut, ease-out)',
      },
      themeOptions: {
        useThemeColors: true
      }
    }
  },
  
  // Interactive animations
  interactive: {
    hover: {
      name: 'pulse-soft' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-base, 200ms)',
        iterationCount: 1,
      }
    },
    click: {
      name: 'ripple' as AnimationName,
      options: {
        duration: 'var(--transitions-duration-slow, 300ms)',
        fillMode: 'both' as const,
      }
    }
  }
};

/**
 * Get animation class with theme-aware properties
 */
export function getThemeAnimationClass(
  animationType: keyof typeof themeAnimationVariants,
  animationName: keyof typeof themeAnimationVariants[typeof animationType],
  paradigm?: string
): string {
  const variant = themeAnimationVariants[animationType][animationName];
  const classes = [`animate-${variant.name}`];
  
  if (variant.themeOptions?.paradigmAware && paradigm) {
    classes.push(`animate-paradigm-${paradigm}`);
  }
  
  return classes.join(' ');
}