import React, { useState, useEffect } from 'react';
import { ThemeContext } from './ThemeProviderContext';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check local storage first
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;

    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme-related classes and attributes first
    root.classList.remove('light', 'dark', 'theme-transition');
    root.removeAttribute('data-theme');

    // Apply new theme using Tailwind's dark mode class strategy
    if (theme === 'dark') {
      root.classList.add('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1A1512' : '#FAF6F2'
      );
    }

    // Add transition class after a delay to avoid initial flash
    const timer = setTimeout(() => {
      root.classList.add('theme-transition');
    }, 100);

    return () => {
      clearTimeout(timer);
      root.classList.remove('theme-transition');
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
