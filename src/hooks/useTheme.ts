import { useEffect, useState } from 'react';
import type { ThemeProviderProps } from '../types';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}

// Simple ThemeProvider function - using createElement instead of JSX
import { createElement } from 'react';

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const { theme } = useTheme();
  
  return createElement('div', { 
    'data-theme': theme,
    className: `theme-provider theme-${theme}` 
  }, children);
}