import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';
import { HomeBadge } from './HomeBadge';

type Props = {
  badge: string;
  title: string;
  centered?: boolean;
  dark?: boolean;
};

export function HomeSectionHead({ badge, title, centered = false, dark = false }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);

  return (
    <View style={[s.head, centered && s.centered]}>
      <HomeBadge variant={dark ? 'darkSection' : 'default'} centered={centered}>
        {badge}
      </HomeBadge>
      <Text style={[s.title, centered && s.titleCentered, dark && s.titleDark]}>{title}</Text>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    head: {
      gap: 16,
      marginBottom: homeSpacing.sectionHeadMarginBottom,
      width: '100%',
    },
    centered: {
      alignItems: 'center',
    },
    title: {
      fontSize: homeTypography.sectionH2.fontSize,
      fontWeight: homeTypography.sectionH2.fontWeight,
      lineHeight: homeTypography.sectionH2.lineHeight,
      letterSpacing: homeTypography.sectionH2.letterSpacing,
      color: colors.ink,
    },
    titleCentered: {
      textAlign: 'center',
    },
    titleDark: {
      color: colors.onDark,
    },
  });
}
