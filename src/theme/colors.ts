/** Палитра как в skillo-fe/src/styles/global.css (minimal) */

export const lightColors = {
  ink: '#000000',
  ink2: 'rgba(0,0,0,0.68)',
  ink3: 'rgba(0,0,0,0.46)',
  ink4: 'rgba(0,0,0,0.24)',
  surface: '#ffffff',
  surface2: 'rgba(0,0,0,0.04)',
  surface3: 'rgba(0,0,0,0.08)',
  line: 'rgba(0,0,0,0.14)',
  accent: '#4f46e5',
  accentMuted: 'rgba(79, 70, 229, 0.12)',
  success: '#15803d',
  danger: '#dc2626',
  warning: '#b45309',
  info: '#0e7490',
};

export const darkColors = {
  ink: '#ffffff',
  ink2: 'rgba(255,255,255,0.68)',
  ink3: 'rgba(255,255,255,0.46)',
  ink4: 'rgba(255,255,255,0.24)',
  surface: '#000000',
  surface2: 'rgba(255,255,255,0.06)',
  surface3: 'rgba(255,255,255,0.1)',
  line: 'rgba(255,255,255,0.18)',
  accent: '#a78bfa',
  accentMuted: 'rgba(167, 139, 250, 0.15)',
  success: '#4ade80',
  danger: '#fb7185',
  warning: '#fbbf24',
  info: '#22d3ee',
};

export type ThemeColors = typeof lightColors;
