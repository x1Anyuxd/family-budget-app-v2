import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import type { ThemeName } from './themes';
import { THEME_NAMES } from './themes';

export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  currentTheme: ThemeName;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  setCurrentTheme: (theme: ThemeName) => Promise<void>;
}

const COLOR_SCHEME_KEY = 'app_color_scheme';
const THEME_NAME_KEY = 'app_theme_name';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  const [currentTheme, setCurrentThemeState] = useState<ThemeName>('default');

  useEffect(() => {
    (async () => {
      try {
        const [savedScheme, savedTheme] = await Promise.all([
          AsyncStorage.getItem(COLOR_SCHEME_KEY),
          AsyncStorage.getItem(THEME_NAME_KEY),
        ]);

        if (savedScheme === 'light' || savedScheme === 'dark') {
          setColorSchemeState(savedScheme);
        }

        if (savedTheme && THEME_NAMES.includes(savedTheme as ThemeName)) {
          setCurrentThemeState(savedTheme as ThemeName);
        }
      } catch (e) {
        console.warn('Failed to load theme settings', e);
      }
    })();
  }, []);

  const setColorScheme = async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
  };

  const setCurrentTheme = async (theme: ThemeName) => {
    setCurrentThemeState(theme);
    await AsyncStorage.setItem(THEME_NAME_KEY, theme);
  };

  const value = useMemo(
    () => ({ colorScheme, currentTheme, setColorScheme, setCurrentTheme }),
    [colorScheme, currentTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  // Return a default value instead of throwing to prevent crash during initial mount
  if (!context) {
    return {
      colorScheme: 'light' as ColorScheme,
      currentTheme: 'default' as ThemeName,
      setColorScheme: async () => {},
      setCurrentTheme: async () => {},
    };
  }
  return context;
}
