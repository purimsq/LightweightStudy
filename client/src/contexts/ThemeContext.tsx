import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'glassmorphism' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark' | 'glassmorphism'; // The actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark' | 'glassmorphism'>('light');

  // Apply theme to document
  const applyTheme = (newTheme: 'light' | 'dark' | 'glassmorphism') => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark', 'glassmorphism');
    
    // Add the appropriate theme class
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'glassmorphism') {
      root.classList.add('glassmorphism');
    }
    
    setActualTheme(newTheme);
  };

  // Handle theme changes
  useEffect(() => {
    if (theme === 'auto') {
      // Use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      // Set initial value
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (theme === 'glassmorphism') {
      // Apply glassmorphism theme
      applyTheme('glassmorphism');
    } else {
      // Use explicit theme (light or dark)
      applyTheme(theme as 'light' | 'dark');
    }
  }, [theme]);

  // Load theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setThemeState(saved as Theme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
