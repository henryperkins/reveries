import React, { useEffect, useRef, useState, useCallback } from 'react';

export type AnimationName = 
  | 'fadeIn' 
  | 'slideUp' 
  | 'shimmer' 
  | 'pulse' 
  | 'glow' 
  | 'pulse-soft'
  | 'typewriter'
  | 'matrixRain'
  | 'glitch'
  | 'circuit'
  | 'float'
  | 'ripple'
  | 'shake'
  | 'morphing';

export interface AnimationOptions {
  duration?: string | number;
  delay?: string | number;
  timingFunction?: string;
  iterationCount?: string | number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
  onStart?: () => void;
  onEnd?: () => void;
  onIteration?: () => void;
}

const animationDefaults: Record<AnimationName, Partial<AnimationOptions>> = {
  fadeIn: { duration: '0.3s', fillMode: 'both' },
  slideUp: { duration: '0.4s', fillMode: 'both' },
  shimmer: { duration: '1.5s', iterationCount: 'infinite' },
  pulse: { duration: '2s', iterationCount: 'infinite' },
  'pulse-soft': { duration: '2s', iterationCount: 'infinite' },
  glow: { duration: '2s', iterationCount: 'infinite' },
  typewriter: { duration: '3s', fillMode: 'both', timingFunction: 'steps(40, end)' },
  matrixRain: { duration: '5s', iterationCount: 'infinite', timingFunction: 'linear' },
  glitch: { duration: '0.3s', iterationCount: 'infinite', timingFunction: 'ease-in-out' },
  circuit: { duration: '2s', fillMode: 'forwards', timingFunction: 'ease-out' },
  float: { duration: '3s', iterationCount: 'infinite', timingFunction: 'ease-in-out' },
  ripple: { duration: '0.6s', fillMode: 'both', timingFunction: 'ease-out' },
  shake: { duration: '0.5s', fillMode: 'both', timingFunction: 'ease-in-out' },
  morphing: { duration: '8s', iterationCount: 'infinite', timingFunction: 'ease-in-out' }
};

export function useAnimation(
  animationName: AnimationName,
  options: AnimationOptions = {}
): {
  ref: React.RefObject<HTMLElement | null>;
  play: () => void;
  pause: () => void;
  restart: () => void;
  isPlaying: boolean;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(options.playState !== 'paused');
  const animationRef = useRef<Animation | null>(null);

  // Moved inside useEffect to satisfy react-hooks/exhaustive-deps

  const formatValue = (value: string | number | undefined, suffix = '') => {
    if (value === undefined) return undefined;
    return typeof value === 'number' ? `${value}${suffix || 'ms'}` : value;
  };

  const play = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const restart = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.currentTime = 0;
      animationRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const defaults = animationDefaults[animationName] || {};
    const finalOptions = { ...defaults, ...options };

    const animationStyle = [
      animationName,
      formatValue(finalOptions.duration),
      finalOptions.timingFunction,
      formatValue(finalOptions.delay),
      finalOptions.iterationCount,
      finalOptions.direction,
      finalOptions.fillMode
    ].filter(Boolean).join(' ');

    element.style.animation = animationStyle;

    const handleAnimationStart = () => {
      setIsPlaying(true);
      finalOptions.onStart?.();
    };

    const handleAnimationEnd = () => {
      if (finalOptions.iterationCount === 1 || finalOptions.iterationCount === '1') {
        setIsPlaying(false);
      }
      finalOptions.onEnd?.();
    };

    const handleAnimationIteration = () => {
      finalOptions.onIteration?.();
    };

    element.addEventListener('animationstart', handleAnimationStart);
    element.addEventListener('animationend', handleAnimationEnd);
    element.addEventListener('animationiteration', handleAnimationIteration);

    // Get the Animation object if supported
    if ('getAnimations' in element) {
      const animations = element.getAnimations();
      animationRef.current = animations.find(anim => 
        anim instanceof CSSAnimation && anim.animationName === animationName
      ) as Animation | null;
    }

    return () => {
      element.style.animation = '';
      element.removeEventListener('animationstart', handleAnimationStart);
      element.removeEventListener('animationend', handleAnimationEnd);
      element.removeEventListener('animationiteration', handleAnimationIteration);
    };
  }, [animationName, options]);

  return { ref, play, pause, restart, isPlaying };
}

export function useAnimationGroup(
  animations: { name: AnimationName; options?: AnimationOptions; delay?: number }[]
) {
  const refs = useRef<React.RefObject<HTMLElement | null>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    refs.current = animations.map(() => React.createRef<HTMLElement | null>());
  }, [animations.length]);

  const playSequence = useCallback(() => {
    setIsPlaying(true);
    setCurrentIndex(0);

    const playNext = (index: number) => {
      if (index >= animations.length) {
        setIsPlaying(false);
        return;
      }

      const animation = animations[index];
      const ref = refs.current[index];
      if (!ref?.current) return;

      setTimeout(() => {
        const element = ref.current;
        if (!element) return;

        const options = {
          ...animation.options,
          onEnd: () => {
            animation.options?.onEnd?.();
            playNext(index + 1);
          }
        };

        const animationStyle = [
          animation.name,
          options.duration || '0.3s',
          options.timingFunction || 'ease',
          options.delay || '0s',
          options.iterationCount || '1',
          options.direction || 'normal',
          options.fillMode || 'both'
        ].join(' ');

        element.style.animation = animationStyle;
      }, animation.delay || 0);
    };

    playNext(0);
  }, [animations]);

  return {
    refs: refs.current,
    playSequence,
    currentIndex,
    isPlaying
  };
}

// Animation composition utilities
export interface AnimationChain {
  animations: Array<{
    name: AnimationName;
    options?: AnimationOptions;
    element?: HTMLElement | null;
  }>;
  add: (name: AnimationName, options?: AnimationOptions) => AnimationChain;
  delay: (ms: number) => AnimationChain;
  stagger: (ms: number) => AnimationChain;
  parallel: () => AnimationChain;
  sequential: () => AnimationChain;
  play: () => Promise<void>;
}

export function createAnimationChain(): AnimationChain {
  let animations: AnimationChain['animations'] = [];
  let mode: 'sequential' | 'parallel' = 'sequential';
  let staggerDelay = 0;
  let globalDelay = 0;

  const chain: AnimationChain = {
    animations,
    
    add(name: AnimationName, options?: AnimationOptions) {
      animations.push({ name, options });
      return chain;
    },
    
    delay(ms: number) {
      globalDelay = ms;
      return chain;
    },
    
    stagger(ms: number) {
      staggerDelay = ms;
      return chain;
    },
    
    parallel() {
      mode = 'parallel';
      return chain;
    },
    
    sequential() {
      mode = 'sequential';
      return chain;
    },
    
    async play() {
      if (mode === 'parallel') {
        const promises = animations.map((anim, index) => {
          const delay = globalDelay + (staggerDelay * index);
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              if (anim.element) {
                const defaults = animationDefaults[anim.name] || {};
                const options = { ...defaults, ...anim.options };
                const animationStyle = [
                  anim.name,
                  options.duration,
                  options.timingFunction,
                  options.delay,
                  options.iterationCount,
                  options.direction,
                  options.fillMode
                ].filter(Boolean).join(' ');
                
                anim.element.style.animation = animationStyle;
                
                const handleEnd = () => {
                  anim.element?.removeEventListener('animationend', handleEnd);
                  resolve();
                };
                
                anim.element.addEventListener('animationend', handleEnd);
              } else {
                resolve();
              }
            }, delay);
          });
        });
        
        await Promise.all(promises);
      } else {
        // Sequential mode
        for (let i = 0; i < animations.length; i++) {
          const anim = animations[i];
          const delay = globalDelay + (staggerDelay * i);
          
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              if (anim.element) {
                const defaults = animationDefaults[anim.name] || {};
                const options = { ...defaults, ...anim.options };
                const animationStyle = [
                  anim.name,
                  options.duration,
                  options.timingFunction,
                  options.delay,
                  options.iterationCount,
                  options.direction,
                  options.fillMode
                ].filter(Boolean).join(' ');
                
                anim.element.style.animation = animationStyle;
                
                const handleEnd = () => {
                  anim.element?.removeEventListener('animationend', handleEnd);
                  resolve();
                };
                
                anim.element.addEventListener('animationend', handleEnd);
              } else {
                resolve();
              }
            }, delay);
          });
        }
      }
    }
  };
  
  return chain;
}

// Hook for animation composition
export function useAnimationChain() {
  const chainRef = useRef<AnimationChain | null>(null);
  
  const createChain = useCallback(() => {
    chainRef.current = createAnimationChain();
    return chainRef.current;
  }, []);
  
  const attachToElement = useCallback((element: HTMLElement | null, animationIndex: number) => {
    if (chainRef.current && chainRef.current.animations[animationIndex]) {
      chainRef.current.animations[animationIndex].element = element;
    }
  }, []);
  
  return {
    createChain,
    attachToElement,
    chain: chainRef.current
  };
}