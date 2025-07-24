import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimationName, AnimationOptions } from './useAnimation';

interface ScrollAnimationOptions extends AnimationOptions {
  threshold?: number; // 0-1, percentage of element visible
  rootMargin?: string; // Margin around root
  triggerOnce?: boolean; // Only animate once
  animationName: AnimationName;
}

export function useScrollAnimation(options: ScrollAnimationOptions) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    animationName,
    ...animationOptions
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!hasAnimated || !triggerOnce) {
            setIsVisible(true);
            setHasAnimated(true);
            
            // Apply animation
            const animationString = [
              animationName,
              animationOptions.duration || '0.5s',
              animationOptions.timingFunction || 'ease-out',
              animationOptions.delay || '0s',
              animationOptions.iterationCount || '1',
              animationOptions.direction || 'normal',
              animationOptions.fillMode || 'both'
            ].filter(Boolean).join(' ');
            
            element.style.animation = animationString;
            
            if (animationOptions.onStart) {
              animationOptions.onStart();
            }
            
            const handleAnimationEnd = () => {
              if (animationOptions.onEnd) {
                animationOptions.onEnd();
              }
              element.removeEventListener('animationend', handleAnimationEnd);
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
          }
        } else {
          if (!triggerOnce) {
            setIsVisible(false);
            element.style.animation = '';
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    threshold,
    rootMargin,
    triggerOnce,
    animationName,
    animationOptions,
    hasAnimated
  ]);

  const reset = useCallback(() => {
    setHasAnimated(false);
    setIsVisible(false);
    if (ref.current) {
      ref.current.style.animation = '';
    }
  }, []);

  return {
    ref,
    isVisible,
    hasAnimated,
    reset
  };
}

// Batch scroll animations for multiple elements
export function useScrollAnimationGroup(
  animations: (ScrollAnimationOptions & { id: string })[]
) {
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  const setRef = useCallback((id: string) => (element: HTMLElement | null) => {
    if (element) {
      refs.current.set(id, element);
    } else {
      refs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const observers = observersRef.current;

    animations.forEach((animation) => {
      const element = refs.current.get(animation.id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleElements((prev) => new Set(prev).add(animation.id));

              // Apply animation
              const animationString = [
                animation.animationName,
                animation.duration || '0.5s',
                animation.timingFunction || 'ease-out',
                animation.delay || '0s',
                animation.iterationCount || '1',
                animation.direction || 'normal',
                animation.fillMode || 'both'
              ].filter(Boolean).join(' ');

              entry.target.setAttribute('style', `animation: ${animationString}`);
            } else if (!animation.triggerOnce) {
              setVisibleElements((prev) => {
                const newSet = new Set(prev);
                newSet.delete(animation.id);
                return newSet;
              });
              entry.target.setAttribute('style', '');
            }
          });
        },
        {
          threshold: animation.threshold || 0.1,
          rootMargin: animation.rootMargin || '0px'
        }
      );

      observer.observe(element);
      observers.set(animation.id, observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
      observers.clear();
    };
  }, [animations]);

  return {
    setRef,
    visibleElements,
    isVisible: (id: string) => visibleElements.has(id)
  };
}

// Parallax scroll effect
export function useParallaxScroll(speed = 0.5) {
  const ref = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;

      // Calculate if element is in viewport
      if (elementTop < windowHeight && elementTop + elementHeight > 0) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -speed;
        setOffset(rate);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return {
    ref,
    style: {
      transform: `translateY(${offset}px)`,
      willChange: 'transform'
    }
  };
}

// Reveal on scroll with stagger effect
export function useStaggeredReveal(
  itemCount: number,
  options: {
    staggerDelay?: number;
    threshold?: number;
    animationName?: AnimationName;
  } = {}
) {
  const {
    staggerDelay = 100,
    threshold = 0.1,
    animationName = 'fadeIn'
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            // Apply staggered animations to children
            const children = element.children;
            Array.from(children).forEach((child, index) => {
              if (index < itemCount) {
                const delay = index * staggerDelay;
                (child as HTMLElement).style.animation = `${animationName} 0.5s ease-out ${delay}ms both`;
              }
            });
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [itemCount, staggerDelay, threshold, animationName]);

  return {
    containerRef,
    isVisible
  };
}