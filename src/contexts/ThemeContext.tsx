import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

    // Add transition class for smooth theme changes (but not on initial load)
    const enableTransitions = () => {
      root.classList.add('theme-transition');
    };

    // Remove old classes/attributes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');

    // Apply new theme
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);

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

    // Enable transitions after a short delay (avoid initial flash)
    const timer = setTimeout(enableTransitions, 100);

    return () => {
      clearTimeout(timer);
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

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
