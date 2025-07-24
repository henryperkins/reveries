// Centralized paradigm theme definitions
// Updated to use CSS custom properties instead of hard-coded values

export type HostParadigm = 'dolores' | 'teddy' | 'bernard' | 'maeve';

export interface ParadigmTheme {
  primary: string;          // CSS custom property
  primaryClass: string;     // Tailwind class using CSS custom properties
  gradient: [string, string]; // CSS custom properties
  gradientClass: string;    // Tailwind gradient class
  text: string;             // Tailwind text color class
  textHex: string;          // CSS custom property reference
  bg: string;               // Tailwind background class
  bgHex: string;            // CSS custom property reference
  border: string;           // Tailwind border class
  borderHex: string;        // CSS custom property reference
  accent: string;           // Tailwind accent class
  accentHex: string;        // CSS custom property reference
}

// Define the color palette using CSS custom properties
export const PARADIGM_COLORS: Record<HostParadigm, ParadigmTheme> = {
  dolores: {
    primary: 'var(--color-dolores-600)',
    primaryClass: 'bg-dolores-600',
    gradient: ['var(--color-dolores-400)', 'var(--color-dolores-600)'],
    gradientClass: 'from-dolores-400 to-dolores-600',
    text: 'text-dolores-600',
    textHex: 'var(--color-dolores-600)',
    bg: 'bg-dolores-50',
    bgHex: 'var(--color-dolores-50)',
    border: 'border-dolores-200',
    borderHex: 'var(--color-dolores-200)',
    accent: 'bg-dolores-700',
    accentHex: 'var(--color-dolores-700)',
  },
  teddy: {
    primary: 'var(--color-teddy-600)',
    primaryClass: 'bg-teddy-600',
    gradient: ['var(--color-teddy-400)', 'var(--color-teddy-600)'],
    gradientClass: 'from-teddy-400 to-teddy-600',
    text: 'text-teddy-600',
    textHex: 'var(--color-teddy-600)',
    bg: 'bg-teddy-50',
    bgHex: 'var(--color-teddy-50)',
    border: 'border-teddy-200',
    borderHex: 'var(--color-teddy-200)',
    accent: 'bg-teddy-700',
    accentHex: 'var(--color-teddy-700)',
  },
  bernard: {
    primary: 'var(--color-bernard-600)',
    primaryClass: 'bg-bernard-600',
    gradient: ['var(--color-bernard-400)', 'var(--color-bernard-600)'],
    gradientClass: 'from-bernard-400 to-bernard-600',
    text: 'text-bernard-600',
    textHex: 'var(--color-bernard-600)',
    bg: 'bg-bernard-50',
    bgHex: 'var(--color-bernard-50)',
    border: 'border-bernard-200',
    borderHex: 'var(--color-bernard-200)',
    accent: 'bg-bernard-700',
    accentHex: 'var(--color-bernard-700)',
  },
  maeve: {
    primary: 'var(--color-maeve-600)',
    primaryClass: 'bg-maeve-600',
    gradient: ['var(--color-maeve-400)', 'var(--color-maeve-600)'],
    gradientClass: 'from-maeve-400 to-maeve-600',
    text: 'text-maeve-600',
    textHex: 'var(--color-maeve-600)',
    bg: 'bg-maeve-50',
    bgHex: 'var(--color-maeve-50)',
    border: 'border-maeve-200',
    borderHex: 'var(--color-maeve-200)',
    accent: 'bg-maeve-700',
    accentHex: 'var(--color-maeve-700)',
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
    primaryClass: theme.primaryClass,
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
