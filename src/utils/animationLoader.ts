/**
 * Animation Loader Utility
 * Dynamically loads animation CSS modules based on usage
 */

export type AnimationModule = 
  | 'loading'
  | 'interactive' 
  | 'westworld'
  | 'advanced';

// Track loaded modules
const loadedModules = new Set<AnimationModule>();

// Module dependencies
const moduleDependencies: Record<AnimationModule, AnimationModule[]> = {
  loading: [],
  interactive: [],
  westworld: [],
  advanced: ['interactive'] // Advanced animations depend on interactive
};

/**
 * Load animation CSS module on demand
 */
export async function loadAnimationModule(module: AnimationModule): Promise<void> {
  // Skip if already loaded
  if (loadedModules.has(module)) {
    return;
  }

  // Load dependencies first
  const dependencies = moduleDependencies[module] || [];
  await Promise.all(dependencies.map(dep => loadAnimationModule(dep)));

  // Add class to body to trigger CSS import
  document.body.classList.add(`needs-${module}-animations`);
  
  // Mark as loaded
  loadedModules.add(module);
  
  // Wait for CSS to load (rough estimate)
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Preload animation modules for better performance
 */
export function preloadAnimationModules(modules: AnimationModule[]): void {
  modules.forEach(module => {
    // Use link preload for better performance
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = `/src/styles/animations-${module}.css`;
    document.head.appendChild(link);
  });
}

/**
 * Get required animation module for a given animation name
 */
export function getAnimationModule(animationName: string): AnimationModule | null {
  const moduleMap: Record<string, AnimationModule> = {
    // Loading animations
    'shimmer': 'loading',
    'progress-stripes': 'loading',
    'dots': 'loading',
    'skeleton': 'loading',
    
    // Interactive animations
    'bounce-soft': 'interactive',
    'ripple': 'interactive',
    'shake': 'interactive',
    'float': 'interactive',
    'hover-grow': 'interactive',
    'click': 'interactive',
    
    // Westworld animations
    'typewriter': 'westworld',
    'matrix-rain': 'westworld',
    'glitch': 'westworld',
    'circuit': 'westworld',
    'glow': 'westworld',
    
    // Advanced animations
    'morph': 'advanced',
    'parallax': 'advanced',
    'magnetic': 'advanced'
  };
  
  return moduleMap[animationName] || null;
}

/**
 * React hook for loading animations
 */
export function useAnimationLoader(animationName: string) {
  const module = getAnimationModule(animationName);
  
  if (module && typeof window !== 'undefined') {
    loadAnimationModule(module);
  }
}

/**
 * Check if animation module is loaded
 */
export function isAnimationModuleLoaded(module: AnimationModule): boolean {
  return loadedModules.has(module);
}

/**
 * Get all loaded animation modules
 */
export function getLoadedAnimationModules(): AnimationModule[] {
  return Array.from(loadedModules);
}

/**
 * Animation performance hints
 */
export const animationPerformanceHints = {
  // Use transform and opacity for best performance
  performant: ['fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'scaleIn', 'scaleOut'],
  
  // These may cause repaints
  moderate: ['bounce-soft', 'shake', 'float'],
  
  // These are expensive, use sparingly
  expensive: ['glitch', 'matrix-rain', 'morph']
};

/**
 * Get CSS variable value for animations
 */
export function getAnimationCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '';
  
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

/**
 * Set animation CSS variable
 */
export function setAnimationCSSVariable(variable: string, value: string): void {
  if (typeof window === 'undefined') return;
  
  document.documentElement.style.setProperty(variable, value);
}