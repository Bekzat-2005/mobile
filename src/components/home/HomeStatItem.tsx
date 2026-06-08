import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { homeLayout, homeRadius, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';

type Props = {
  value: string;
  label: string;
};

export function HomeStatItem({ value, label }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);

  return (
    <View style={s.item}>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    item: {
      flex: 1,
      minWidth: homeLayout.statMinWidth,
      paddingVertical: homeLayout.statPaddingV,
      paddingHorizontal: homeLayout.statPaddingH,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: homeRadius.stat,
      backgroundColor: colors.statBg,
      gap: 2,
    },
    value: {
      fontSize: homeTypography.statValue.fontSize,
      fontWeight: homeTypography.statValue.fontWeight,
      color: colors.accent,
      lineHeight: 20,
    },
    label: {
      fontSize: homeTypography.statLabel.fontSize,
      fontWeight: homeTypography.statLabel.fontWeight,
      letterSpacing: homeTypography.statLabel.letterSpacing,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
  });
}
