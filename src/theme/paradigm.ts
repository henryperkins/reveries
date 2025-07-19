// Centralized paradigm theme definitions
// This file provides a single source of truth for all paradigm-related colors and styles

export type HostParadigm = 'dolores' | 'teddy' | 'bernard' | 'maeve';

export interface ParadigmTheme {
  primary: string;          // Primary color (hex)
  primaryClass: string;     // Tailwind primary class
  gradient: [string, string]; // Gradient colors (hex)
  gradientClass: string;    // Tailwind gradient class
  text: string;             // Text color class
  textHex: string;          // Text color (hex)
  bg: string;               // Background color class
  bgHex: string;            // Background color (hex)
  border: string;           // Border color class
  borderHex: string;        // Border color (hex)
  accent: string;           // Accent color class
  accentHex: string;        // Accent color (hex)
}

// Define the color palette with both Tailwind classes and hex values
export const PARADIGM_COLORS: Record<HostParadigm, ParadigmTheme> = {
  dolores: {
    primary: '#DC2626',       // red-600
    primaryClass: 'bg-red-500',
    gradient: ['#F87171', '#DC2626'], // red-400 to red-600
    gradientClass: 'from-red-400 to-red-600',
    text: 'text-red-600',
    textHex: '#DC2626',
    bg: 'bg-red-50',
    bgHex: '#FEF2F2',
    border: 'border-red-200',
    borderHex: '#FECACA',
    accent: 'bg-red-700',
    accentHex: '#B91C1C',
  },
  teddy: {
    primary: '#F59E0B',       // amber-600
    primaryClass: 'bg-amber-500',
    gradient: ['#FCD34D', '#F59E0B'], // amber-400 to amber-600
    gradientClass: 'from-amber-400 to-amber-600',
    text: 'text-amber-600',
    textHex: '#F59E0B',
    bg: 'bg-amber-50',
    bgHex: '#FFFBEB',
    border: 'border-amber-200',
    borderHex: '#FDE68A',
    accent: 'bg-amber-700',
    accentHex: '#D97706',
  },
  bernard: {
    primary: '#2563EB',       // blue-600
    primaryClass: 'bg-blue-500',
    gradient: ['#60A5FA', '#2563EB'], // blue-400 to blue-600
    gradientClass: 'from-blue-400 to-blue-600',
    text: 'text-blue-600',
    textHex: '#2563EB',
    bg: 'bg-blue-50',
    bgHex: '#EFF6FF',
    border: 'border-blue-200',
    borderHex: '#BFDBFE',
    accent: 'bg-blue-700',
    accentHex: '#1D4ED8',
  },
  maeve: {
    primary: '#9333EA',       // purple-600
    primaryClass: 'bg-purple-500',
    gradient: ['#C084FC', '#9333EA'], // purple-400 to purple-600
    gradientClass: 'from-purple-400 to-purple-600',
    text: 'text-purple-600',
    textHex: '#9333EA',
    bg: 'bg-purple-50',
    bgHex: '#FAF5FF',
    border: 'border-purple-200',
    borderHex: '#E9D5FF',
    accent: 'bg-purple-700',
    accentHex: '#7C3AED',
  },
} as const;

// Helper function to get theme for a paradigm
export function getParadigmTheme(paradigm: HostParadigm): ParadigmTheme {
  return PARADIGM_COLORS[paradigm];
}

// Helper function to get gradient style
export function getParadigmGradient(paradigm: HostParadigm): string {
  const theme = PARADIGM_COLORS[paradigm];
  return `linear-gradient(to right, ${theme.gradient[0]}, ${theme.gradient[1]})`;
}

// Helper function to get all classes for a paradigm
export function getParadigmClasses(paradigm: HostParadigm) {
  const theme = PARADIGM_COLORS[paradigm];
  return {
    container: `${theme.bg} ${theme.border} border`,
    text: theme.text,
    button: `${theme.primaryClass} hover:${theme.accent} text-white`,
    gradient: `bg-gradient-to-r ${theme.gradientClass}`,
    badge: `${theme.bg} ${theme.text} ${theme.border} border`,
  };
}

// Export type for use in components
export type { HostParadigm as Paradigm };

// Default paradigm if none is specified
export const DEFAULT_PARADIGM: HostParadigm = 'dolores';

// Function to validate paradigm string
export function isValidParadigm(value: string): value is HostParadigm {
  return ['dolores', 'teddy', 'bernard', 'maeve'].includes(value);
}

// Function to get paradigm from string with fallback
export function getParadigmFromString(value: string | undefined | null): HostParadigm {
  if (!value || !isValidParadigm(value)) {
    return DEFAULT_PARADIGM;
  }
  return value;
}