// Theme exports
export * from './paradigm';

// Re-export commonly used functions for convenience
export { 
  getParadigmTheme, 
  getParadigmGradient, 
  getParadigmClasses,
  isValidParadigm,
  getParadigmFromString,
  DEFAULT_PARADIGM
} from './paradigm';

// Export types
export type { ParadigmTheme, Paradigm } from './paradigm';