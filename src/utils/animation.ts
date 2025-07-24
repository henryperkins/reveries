// Re-export animation utilities for convenient access
export {
  useAnimation,
  useAnimationGroup,
  useAnimationChain,
  createAnimationChain,
  type AnimationName,
  type AnimationOptions,
  type AnimationChain
} from '../hooks/useAnimation';
export { useThemeTransition, useThemeTransitionControl, type ThemeTransitionOptions } from '../hooks/useThemeTransition';
export { AnimatedComponent, AnimationSequence } from '../components/AnimatedComponent';
export { ThemeTransition, NoThemeTransition } from '../components/ThemeTransition';
export {
  useScrollAnimation,
  useScrollAnimationGroup,
  useParallaxScroll,
  useStaggeredReveal
} from '../hooks/useScrollAnimation';
export {
  AnimatedRouteTransition,
  PageTransition
} from '../components/AnimatedRouteTransition';

export { useAnimatedNavigation } from '../hooks/useAnimatedNavigation';
export { AnimatedResearchGraph } from '../components/AnimatedResearchGraph';

// Animation presets for common use cases
export const animationPresets = {
  // Page transitions
  pageEnter: { animation: 'fadeIn' as const, duration: '0.5s' },
  pageExit: { animation: 'fadeOut' as const, duration: '0.3s' },

  // Modal animations
  modalShow: { animation: 'scaleIn' as const, duration: '0.3s' },
  modalHide: { animation: 'scaleOut' as const, duration: '0.2s' },

  // List item animations
  listItemEnter: { animation: 'slideUp' as const, duration: '0.4s' },
  listItemExit: { animation: 'slideDown' as const, duration: '0.3s' },

  // Loading states
  loading: { animation: 'shimmer' as const, iterationCount: 'infinite' },
  skeleton: { animation: 'pulse' as const, iterationCount: 'infinite', duration: '1.5s' },

  // Interactive feedback
  hover: { animation: 'pulse-soft' as const, trigger: 'hover' as const, iterationCount: 1 },
  click: { animation: 'bounce-soft' as const, trigger: 'click' as const, duration: '0.3s' },

  // Attention seekers
  glow: { animation: 'glow' as const, iterationCount: 'infinite', duration: '2s' },
  shake: { animation: 'shake' as const, duration: '0.5s' },

  // Westworld-themed animations
  typewriter: { animation: 'typewriter' as const, duration: '3s', fillMode: 'both' },
  matrixRain: { animation: 'matrixRain' as const, duration: '5s', iterationCount: 'infinite' },
  glitch: { animation: 'glitch' as const, duration: '0.3s', iterationCount: 3 },
  circuit: { animation: 'circuit' as const, duration: '2s', fillMode: 'forwards' },

  // Motion effects
  float: { animation: 'float' as const, duration: '3s', iterationCount: 'infinite' },
  ripple: { animation: 'ripple' as const, duration: '0.6s', fillMode: 'both' },
  morphing: { animation: 'morphing' as const, duration: '8s', iterationCount: 'infinite' }
} as const;

// Theme transition presets
export const transitionPresets = {
  // Global theme switch
  themeSwitch: { duration: 'slow' as const, properties: ['background-color', 'color', 'border-color'] },

  // Component-specific transitions
  button: { duration: 'fast' as const, properties: ['background-color', 'border-color', 'transform'] },
  card: { duration: 'base' as const, properties: ['background-color', 'box-shadow'] },
  text: { duration: 'fast' as const, properties: ['color', 'opacity'] },

  // State changes
  hover: { duration: 'fast' as const, delay: 0 },
  focus: { duration: 'fast' as const, properties: ['border-color', 'box-shadow'] },
  disabled: { duration: 'base' as const, properties: ['opacity', 'cursor'] }
} as const;
