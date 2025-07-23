import React, { ReactNode } from 'react';
import { useThemeTransition, ThemeTransitionOptions } from '../hooks/useThemeTransition';

interface ThemeTransitionProps extends ThemeTransitionOptions {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const ThemeTransition: React.FC<ThemeTransitionProps> = ({
  children,
  className = '',
  as: Component = 'div',
  ...transitionOptions
}) => {
  const ref = useThemeTransition(transitionOptions);

  return React.createElement(
    Component,
    { ref, className },
    children
  );
};

export const NoThemeTransition: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={className} data-theme-transition-opt-out="true">
      {children}
    </div>
  );
};