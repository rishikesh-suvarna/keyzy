'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'dark' | 'light';
  resolvedTheme: 'dark' | 'light';
};

const ThemeProviderContext = createContext<ThemeProviderContextType>({} as ThemeProviderContextType);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme && ['dark', 'light', 'system'].includes(storedTheme)) {
        setTheme(storedTheme);
      }
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
    }
    setMounted(true);
  }, [storageKey]);

  // Apply theme to document - Updated for Tailwind CSS 3
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    // Remove both dark and light classes first
    root.classList.remove('dark', 'light');

    // Add the correct class for Tailwind CSS 3
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    }
    // For light mode, we don't add a class in Tailwind CSS 3

    // Set color scheme for native styling
    root.style.colorScheme = resolvedTheme;

    console.log('Theme applied:', {
      theme,
      resolvedTheme,
      htmlClasses: root.className,
      hasRootDarkClass: root.classList.contains('dark')
    });

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  }, [theme, systemTheme, mounted, storageKey]);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const value = {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    console.warn('useTheme must be used within a ThemeProvider. Using fallback values.');

    return {
      theme: 'light' as Theme,
      setTheme: (theme: Theme) => {
        console.warn('setTheme called outside of ThemeProvider:', theme);
      },
      systemTheme: 'light' as 'dark' | 'light',
      resolvedTheme: 'light' as 'dark' | 'light',
    };
  }

  return context;
};