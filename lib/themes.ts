export type ThemeName = 'default' | 'blue' | 'purple' | 'orange' | 'pink' | 'teal';

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  default: {
    primary: '#4CAF82',
    background: '#F7F9FC',
    surface: '#FFFFFF',
    foreground: '#1A1F36',
    muted: '#8A94A6',
    border: '#E4E9F2',
    success: '#4CAF82',
    warning: '#F5A623',
    error: '#F26B5B',
  },
  blue: {
    primary: '#3B82F6',
    background: '#F3F7FF',
    surface: '#FFFFFF',
    foreground: '#13223B',
    muted: '#7C8DA6',
    border: '#D8E4FF',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  purple: {
    primary: '#8B5CF6',
    background: '#F8F5FF',
    surface: '#FFFFFF',
    foreground: '#261A3C',
    muted: '#8B84A8',
    border: '#E8DEFF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  orange: {
    primary: '#F97316',
    background: '#FFF7F1',
    surface: '#FFFFFF',
    foreground: '#3D2212',
    muted: '#9B877B',
    border: '#FFE3CF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#E11D48',
  },
  pink: {
    primary: '#EC4899',
    background: '#FFF5FA',
    surface: '#FFFFFF',
    foreground: '#3E1C33',
    muted: '#A0869A',
    border: '#FFD9EC',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#F43F5E',
  },
  teal: {
    primary: '#14B8A6',
    background: '#F1FCFA',
    surface: '#FFFFFF',
    foreground: '#133733',
    muted: '#7B9995',
    border: '#D0F1EC',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export const THEME_LABELS: Record<ThemeName, string> = {
  default: '绿色',
  blue: '蓝色',
  purple: '紫色',
  orange: '橙色',
  pink: '粉色',
  teal: '青色',
};

export function getTheme(name: ThemeName): ThemeColors {
  return THEMES[name] ?? THEMES.default;
}
