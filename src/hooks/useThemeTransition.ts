import { useEffect, useRef } from 'react';

export interface ThemeTransitionOptions {
  duration?: 'fast' | 'base' | 'slow' | 'slower' | number;
  properties?: string[];
  disabled?: boolean;
  delay?: number;
  timingFunction?: string;
}

const defaultProperties = ['background-color', 'color', 'border-color', 'box-shadow'];

const durationMap = {
  fast: 'var(--transitions-duration-fast)',
  base: 'var(--transitions-duration-base)', 
  slow: 'var(--transitions-duration-slow)',
  slower: 'var(--transitions-duration-slower)'
};

export function useThemeTransition(
  options: ThemeTransitionOptions = {}
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    duration = 'slow',
    properties = defaultProperties,
    disabled = false,
    delay = 0,
    timingFunction = 'ease-in-out'
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const durationValue = typeof duration === 'number' 
      ? `${duration}ms` 
      : durationMap[duration];

    const transitionValue = properties
      .map(prop => `${prop} ${durationValue} ${timingFunction} ${delay}ms`)
      .join(', ');

    element.style.setProperty('transition', transitionValue);

    return () => {
      if (element) {
        element.style.removeProperty('transition');
      }
    };
  }, [duration, properties, disabled, delay, timingFunction]);

  return ref;
}

export function useThemeTransitionControl() {
  const addClass = (element: HTMLElement) => {
    element.classList.add('theme-transition-controlled');
  };

  const removeClass = (element: HTMLElement) => {
    element.classList.remove('theme-transition-controlled');
  };

  const optOut = (element: HTMLElement) => {
    element.setAttribute('data-theme-transition-opt-out', 'true');
  };

  const optIn = (element: HTMLElement) => {
    element.removeAttribute('data-theme-transition-opt-out');
  };

  return { addClass, removeClass, optOut, optIn };
}