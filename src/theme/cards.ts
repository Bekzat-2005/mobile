import { Platform, type ViewStyle } from 'react-native';

import type { ThemeColors } from './colors';

export function cardBackground(colors: ThemeColors, mode: 'light' | 'dark'): string {
  return mode === 'dark' ? colors.surface2 : '#FFFFFF';
}

export function cardShadow(mode: 'light' | 'dark'): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: mode === 'dark' ? 0.22 : 0.05,
      shadowRadius: 8,
    },
    android: { elevation: mode === 'dark' ? 2 : 3 },
    default: {},
  }) as ViewStyle;
}

export function cardBorder(mode: 'light' | 'dark', line: string): ViewStyle {
  return mode === 'dark' ? { borderWidth: 1, borderColor: line } : {};
}
