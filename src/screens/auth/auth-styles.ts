import { Platform, StyleSheet } from 'react-native';

import type { ThemeColors } from '../../theme/colors';
import { fonts, radius } from '../../theme/colors';

export function authStyles(colors: ThemeColors) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: '#0A84FF',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 32,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 24, paddingBottom: 48 },
    eyebrow: {
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.ink3,
      marginBottom: 8,
      fontFamily: fonts.semibold,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.ink,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: fonts.regular,
      color: colors.ink2,
      lineHeight: 22,
      marginBottom: 28,
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 20,
      backgroundColor: colors.surface2,
      marginBottom: 16,
      ...cardShadow,
    },
    label: {
      fontSize: 11,
      fontFamily: fonts.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.ink3,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      fontFamily: fonts.regular,
      color: colors.ink,
      backgroundColor: '#ffffff',
      marginBottom: 16,
    },
    btn: {
      backgroundColor: colors.accentSolid,
      borderRadius: radius.sm,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
      color: '#ffffff',
      fontSize: 16,
      fontFamily: fonts.semibold,
    },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      paddingVertical: 14,
      backgroundColor: '#ffffff',
      marginBottom: 16,
    },
    googleBtnTxt: {
      fontSize: 15,
      fontFamily: fonts.semibold,
      color: colors.ink,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
    dividerTxt: { fontSize: 12, color: colors.ink3, fontFamily: fonts.medium },
    error: { color: colors.danger, marginBottom: 12, fontFamily: fonts.regular },
    link: {
      color: colors.accentSolid,
      fontSize: 15,
      marginTop: 8,
      fontFamily: fonts.semibold,
      textAlign: 'center',
    },
  });
}
