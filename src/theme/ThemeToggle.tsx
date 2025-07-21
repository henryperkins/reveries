import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  size = 'md',
  showLabel = false
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;

    // Add transition class for smooth theme changes
    root.classList.add('theme-transition');

    // Apply theme
    root.setAttribute('data-theme', newTheme);

    // Save preference
    localStorage.setItem('theme', newTheme);

    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const sizeClasses = {
    sm: 'w-10 h-5',
    md: 'w-12 h-6',
    lg: 'w-14 h-7'
  };

  const thumbSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (!isMounted) {
    return (
      <div className={cn(
        "theme-toggle-placeholder",
        sizeClasses[size],
        className
      )} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "theme-toggle group",
        "relative inline-flex items-center rounded-full",
        "bg-gray-200 dark:bg-gray-700",
        "transition-colors duration-300",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        sizeClasses[size],
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="sr-only">Toggle theme</span>

      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1">
        <Sun className={cn(
          "w-3 h-3 transition-opacity duration-300",
          theme === 'light' ? 'opacity-100 text-yellow-500' : 'opacity-0'
        )} />
        <Moon className={cn(
          "w-3 h-3 transition-opacity duration-300",
          theme === 'dark' ? 'opacity-100 text-blue-400' : 'opacity-0'
        )} />
      </div>

      {/* Toggle thumb */}
      <span
        className={cn(
          "theme-toggle-thumb",
          "absolute rounded-full bg-white dark:bg-gray-800",
          "shadow-md transition-transform duration-300",
          "flex items-center justify-center",
          thumbSizeClasses[size],
          theme === 'dark' ? 'translate-x-full' : 'translate-x-0',
          size === 'sm' ? 'left-0.5' : 'left-0.5'
        )}
      >
        {theme === 'light' ? (
          <Sun className="w-2.5 h-2.5 text-yellow-500" />
        ) : (
          <Moon className="w-2.5 h-2.5 text-blue-400" />
        )}
      </span>

      {showLabel && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {theme === 'light' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
