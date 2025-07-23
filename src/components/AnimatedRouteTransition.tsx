import React, { ReactNode, useEffect, useState } from 'react';
import { useAnimation } from '../hooks/useAnimation';

// Mock useLocation for now - replace with actual react-router-dom when available
const useLocation = () => {
  const [pathname, setPathname] = useState('/');
  const [key, setKey] = useState('default');
  
  // In a real app, this would come from react-router
  return { pathname, key, setPathname, setKey };
};

interface AnimatedRouteTransitionProps {
  children: ReactNode;
  transitionType?: 'fade' | 'slide' | 'scale' | 'glitch' | 'morph';
  duration?: number;
}

export const AnimatedRouteTransition: React.FC<AnimatedRouteTransitionProps> = ({
  children,
  transitionType = 'fade',
  duration = 300
}) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const exitAnimation = useAnimation(
    transitionType === 'fade' ? 'fadeIn' : 
    transitionType === 'slide' ? 'slideUp' : 
    transitionType === 'scale' ? 'fadeIn' :
    transitionType === 'glitch' ? 'glitch' : 'morphing',
    {
      duration: `${duration}ms`,
      direction: 'reverse',
      fillMode: 'forwards'
    }
  );
  
  const enterAnimation = useAnimation(
    transitionType === 'fade' ? 'fadeIn' : 
    transitionType === 'slide' ? 'slideUp' : 
    transitionType === 'scale' ? 'fadeIn' :
    transitionType === 'glitch' ? 'glitch' : 'morphing',
    {
      duration: `${duration}ms`,
      fillMode: 'forwards'
    }
  );

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setIsTransitioning(true);
      
      // Play exit animation
      exitAnimation.play();
      
      setTimeout(() => {
        setDisplayLocation(location);
        // Play enter animation
        enterAnimation.play();
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, duration);
      }, duration);
    }
  }, [location, displayLocation, duration, exitAnimation, enterAnimation]);

  return (
    <div 
      ref={(el) => {
        if (el) {
          if (isTransitioning && displayLocation.pathname === location.pathname) {
            enterAnimation.ref.current = el;
          } else if (isTransitioning) {
            exitAnimation.ref.current = el;
          }
        }
      }}
      className="w-full h-full"
      style={{
        opacity: isTransitioning ? undefined : 1,
        transform: isTransitioning ? undefined : 'none'
      }}
    >
      {children}
    </div>
  );
};

// Page transition wrapper with more advanced effects
interface PageTransitionProps {
  children: ReactNode;
  effect?: 'parallax' | 'zoom' | 'rotate' | 'matrix' | 'typewriter';
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  effect = 'parallax'
}) => {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentKey, setCurrentKey] = useState(location.key);

  useEffect(() => {
    if (location.key !== currentKey) {
      setIsAnimating(true);
      
      const timeout = setTimeout(() => {
        setCurrentKey(location.key);
        setIsAnimating(false);
      }, 600);
      
      return () => clearTimeout(timeout);
    }
  }, [location.key, currentKey]);

  const getTransitionClasses = () => {
    switch (effect) {
      case 'parallax':
        return isAnimating 
          ? 'transform translate-x-full opacity-0' 
          : 'transform translate-x-0 opacity-100';
      case 'zoom':
        return isAnimating 
          ? 'transform scale-150 opacity-0' 
          : 'transform scale-100 opacity-100';
      case 'rotate':
        return isAnimating 
          ? 'transform rotate-180 opacity-0' 
          : 'transform rotate-0 opacity-100';
      case 'matrix':
        return isAnimating 
          ? 'animate-matrixRain' 
          : '';
      case 'typewriter':
        return isAnimating 
          ? 'animate-typewriter' 
          : '';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`
        transition-all duration-600 ease-in-out
        ${getTransitionClasses()}
      `}
      style={{
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  );
};

// Hook for programmatic route transitions
export const useAnimatedNavigation = () => {
  const [isNavigating, setIsNavigating] = useState(false);

  const animatedNavigate = async (
    navigate: (path: string) => void, 
    path: string,
    animationDuration = 300
  ) => {
    setIsNavigating(true);
    
    // Trigger exit animation
    document.body.classList.add('page-exit');
    
    await new Promise(resolve => setTimeout(resolve, animationDuration));
    
    navigate(path);
    
    // Trigger enter animation
    document.body.classList.remove('page-exit');
    document.body.classList.add('page-enter');
    
    await new Promise(resolve => setTimeout(resolve, animationDuration));
    
    document.body.classList.remove('page-enter');
    setIsNavigating(false);
  };

  return { animatedNavigate, isNavigating };
};