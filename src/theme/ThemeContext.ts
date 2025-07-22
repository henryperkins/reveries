// Unified theme context that combines all theme systems
import { createContext } from 'react';
import { ThemeContextType } from './types';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

ThemeContext.displayName = 'ThemeContext';