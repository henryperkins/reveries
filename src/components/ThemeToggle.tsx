// Unified ThemeToggle component using the new theme system
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/theme';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  size = 'md',
  showLabel = false
}) => {
  const { mode, toggleTheme } = useThemeMode();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const iconSize = sizeClasses[size];

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle group relative ${className}`}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      type="button"
    >
      <span className="theme-toggle-thumb">
        {mode === 'light' ? (
          <Sun className={iconSize} />
        ) : (
          <Moon className={iconSize} />
        )}
      </span>
      {showLabel && (
        <span className="ml-2 text-sm">
          {mode === 'light' ? 'Dark' : 'Light'} mode
        </span>
      )}
      <span className="sr-only">
        {mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      </span>
    </button>
  );
};