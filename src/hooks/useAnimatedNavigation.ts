import { useState } from 'react';

/**
 * Hook for programmatic route transitions with animations
 * @returns {Object} { animatedNavigate, isNavigating }
 */
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
