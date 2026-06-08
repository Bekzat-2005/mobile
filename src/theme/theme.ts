/** Design tokens from skillo-fe HomePage.vue — landing page only */

import { useMemo } from 'react';

import { useAppTheme } from '../context/ThemeContext';

export type HomeThemeColors = {
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  accentHover: string;
  accent2: string;
  green: string;
  surface: string;
  surface2: string;
  surface3: string;
  showcaseLightBg: string;
  darkBg: string;
  darkSurface: string;
  darkLine: string;
  onDark: string;
  onDarkSoft: string;
  onDarkMuted: string;
  onDarkFaint: string;
  tileSectionBg: string;
  tileBorder: string;
  statBg: string;
  ecoCardBg: string;
  ctaBg: string;
  primaryBtnText: string;
};

export const homeLightColors: HomeThemeColors = {
  ink: '#0a0e1a',
  ink2: 'rgba(10,14,26,0.64)',
  ink3: 'rgba(10,14,26,0.38)',
  line: 'rgba(10,14,26,0.1)',
  accent: '#3b6bff',
  accentHover: '#2a5aff',
  accent2: '#6b8fff',
  green: '#22c55e',
  surface: '#ffffff',
  surface2: '#f4f6fb',
  surface3: '#eef1f8',
  showcaseLightBg: '#f4f6fb',
  darkBg: '#080c18',
  darkSurface: '#111827',
  darkLine: 'rgba(255,255,255,0.08)',
  onDark: '#ffffff',
  onDarkSoft: 'rgba(255,255,255,0.72)',
  onDarkMuted: 'rgba(255,255,255,0.5)',
  onDarkFaint: 'rgba(255,255,255,0.6)',
  tileSectionBg: '#0a0e1a',
  tileBorder: 'rgba(255,255,255,0.08)',
  statBg: '#ffffff',
  ecoCardBg: '#ffffff',
  ctaBg: '#f4f6fb',
  primaryBtnText: '#ffffff',
};

export const homeDarkColors: HomeThemeColors = {
  ink: '#f5f9ff',
  ink2: 'rgba(245,249,255,0.72)',
  ink3: 'rgba(245,249,255,0.48)',
  line: 'rgba(255,255,255,0.1)',
  accent: '#6b8fff',
  accentHover: '#3b6bff',
  accent2: '#8ba8ff',
  green: '#4ade80',
  surface: '#0b1524',
  surface2: '#111827',
  surface3: '#1a2236',
  showcaseLightBg: '#111827',
  darkBg: '#080c18',
  darkSurface: '#111827',
  darkLine: 'rgba(255,255,255,0.08)',
  onDark: '#ffffff',
  onDarkSoft: 'rgba(255,255,255,0.72)',
  onDarkMuted: 'rgba(255,255,255,0.5)',
  onDarkFaint: 'rgba(255,255,255,0.6)',
  tileSectionBg: '#080c18',
  tileBorder: 'rgba(255,255,255,0.08)',
  statBg: '#111827',
  ecoCardBg: '#111827',
  ctaBg: '#111827',
  primaryBtnText: '#ffffff',
};

/** @deprecated use useHomeTheme().colors */
export const homeColors = homeLightColors;

export function getHomeColors(mode: 'light' | 'dark'): HomeThemeColors {
  return mode === 'dark' ? homeDarkColors : homeLightColors;
}

export function useHomeTheme() {
  const { mode } = useAppTheme();
  const colors = useMemo(() => getHomeColors(mode), [mode]);
  return { mode, colors };
}

export const homeSpacing = {
  screenPaddingH: 16,
  screenPaddingV: 24,
  sectionPaddingV: 32,
  sectionHeadMarginBottom: 32,
  copyGap: 20,
  showcaseCopyGap: 22,
  actionsGap: 10,
  statsGap: 10,
  tileGridGap: 12,
  ecoGridGap: 12,
  ctaGap: 20,
  ctaPadding: 24,
};

export const homeRadius = {
  btn: 8,
  card: 14,
  stat: 10,
  cta: 20,
  badge: 999,
};

export const homeTypography = {
  badge: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.44 },
  heroH1: { fontSize: 64, fontWeight: '900' as const, lineHeight: 59, letterSpacing: -3.2 },
  heroLede: { fontSize: 17, lineHeight: 27, fontWeight: '400' as const },
  btn: { fontSize: 14, fontWeight: '600' as const },
  btnLarge: { fontSize: 15, fontWeight: '600' as const },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.44 },
  sectionH2: { fontSize: 38, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -1.14 },
  showcaseH2: { fontSize: 38, fontWeight: '800' as const, lineHeight: 39, letterSpacing: -1.14 },
  showcaseLede: { fontSize: 17, lineHeight: 28, fontWeight: '400' as const },
  tileTitle: { fontSize: 18, fontWeight: '800' as const },
  tileText: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const },
  ecoTitle: { fontSize: 16, fontWeight: '800' as const },
  ecoText: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const },
  ctaH2: { fontSize: 36, fontWeight: '900' as const, lineHeight: 38, letterSpacing: -1.44 },
  session: { fontSize: 13, fontWeight: '400' as const },
};

export const homeLayout = {
  btnHeight: 42,
  btnHeightLarge: 50,
  btnPaddingH: 20,
  btnPaddingHLarge: 28,
  badgeHeight: 28,
  badgePaddingH: 12,
  statMinWidth: 80,
  statPaddingV: 12,
  statPaddingH: 16,
};
