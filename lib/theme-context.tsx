import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName, getTheme, THEME_NAMES } from './themes';

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
  const [isLoading, setIsLoading] = useState(true);

  // 初始化主题
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && THEME_NAMES.includes(saved as ThemeName)) {
          setCurrentTheme(saved as ThemeName);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const handleSetTheme = async (theme: ThemeName) => {
    try {
      setCurrentTheme(theme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useThemeColors() {
  const { currentTheme } = useTheme();
  return getTheme(currentTheme);
}
