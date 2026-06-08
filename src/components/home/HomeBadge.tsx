import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { homeLayout, homeRadius, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';

type Props = {
  children: string;
  variant?: 'default' | 'light' | 'darkSection';
  centered?: boolean;
};

export function HomeBadge({ children, variant = 'default', centered = false }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const isLight = variant === 'light';
  const isDarkSection = variant === 'darkSection';

  return (
    <View
      style={[
        s.badge,
        centered && s.badgeCentered,
        isLight && s.badgeLight,
        isDarkSection && s.badgeDarkSection,
      ]}
    >
      <Text
        style={[
          s.text,
          isLight && s.textLight,
          isDarkSection && s.textDarkSection,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    badgeCentered: {
      alignSelf: 'center',
    },
    badge: {
      alignSelf: 'flex-start',
      height: homeLayout.badgeHeight,
      paddingHorizontal: homeLayout.badgePaddingH,
      borderRadius: homeRadius.badge,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
      justifyContent: 'center',
    },
    badgeLight: {
      borderColor: 'rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    badgeDarkSection: {
      borderColor: 'rgba(255,255,255,0.12)',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    text: {
      fontSize: homeTypography.badge.fontSize,
      fontWeight: homeTypography.badge.fontWeight,
      letterSpacing: homeTypography.badge.letterSpacing,
      textTransform: 'uppercase',
      color: colors.ink2,
    },
    textLight: {
      color: 'rgba(255,255,255,0.8)',
    },
    textDarkSection: {
      color: colors.onDarkFaint,
    },
  });
}
