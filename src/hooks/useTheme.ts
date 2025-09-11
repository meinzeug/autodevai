import { useEffect } from 'react';
import type { ThemeProviderProps } from '../types';

type Theme = 'dark';

export function useTheme() {
  const theme: Theme = 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    // Remove any stored theme preference since we're dark mode only
    localStorage.removeItem('theme');
  }, []);

  return { theme };
}

// Simple ThemeProvider function - always dark mode
import { createElement } from 'react';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useTheme();
  
  return createElement('div', { 
    'data-theme': theme,
    className: 'theme-provider theme-dark' 
  }, children);
}