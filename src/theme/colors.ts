/** Палитра как в skillo-fe/src/styles/global.css */

export const lightColors = {
  ink: '#102033',
  ink2: 'rgba(16, 32, 51, 0.68)',
  ink3: 'rgba(16, 32, 51, 0.48)',
  ink4: 'rgba(16, 32, 51, 0.26)',
  surface: '#f5f9ff',
  surface2: 'rgba(236, 247, 255, 0.82)',
  surface3: 'rgba(218, 238, 255, 0.74)',
  line: 'rgba(10, 132, 255, 0.16)',
  lineStrong: 'rgba(10, 132, 255, 0.28)',
  accent: 'rgba(10, 132, 255, 0.88)',
  accentSolid: '#0A84FF',
  accentMuted: 'rgba(10, 132, 255, 0.12)',
  success: '#248d5a',
  danger: '#d93654',
  warning: '#b76b12',
  info: '#0a84ff',
};

export const darkColors = {
  ink: '#f5f9ff',
  ink2: 'rgba(245, 249, 255, 0.72)',
  ink3: 'rgba(245, 249, 255, 0.48)',
  ink4: 'rgba(245, 249, 255, 0.28)',
  surface: '#0b1524',
  surface2: 'rgba(16, 32, 51, 0.82)',
  surface3: 'rgba(24, 48, 78, 0.74)',
  line: 'rgba(10, 132, 255, 0.22)',
  lineStrong: 'rgba(10, 132, 255, 0.36)',
  accent: 'rgba(95, 179, 255, 0.92)',
  accentSolid: '#5fb3ff',
  accentMuted: 'rgba(10, 132, 255, 0.18)',
  success: '#4ade80',
  danger: '#fb7185',
  warning: '#fbbf24',
  info: '#22d3ee',
};

export type ThemeColors = typeof lightColors;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  pill: 999,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
