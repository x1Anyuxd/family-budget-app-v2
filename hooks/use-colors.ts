import { useMemo } from 'react';

import { useThemeContext } from '@/lib/theme-provider';
import { getTheme } from '@/lib/themes';

export function useColors() {
  const { currentTheme } = useThemeContext();

  return useMemo(() => {
    const palette = getTheme(currentTheme);
    return {
      ...palette,
      text: palette.foreground,
      background: palette.background,
      tint: palette.primary,
      icon: palette.muted,
      tabIconDefault: palette.muted,
      tabIconSelected: palette.primary,
      income: palette.success,
      expense: palette.error,
    };
  }, [currentTheme]);
}
