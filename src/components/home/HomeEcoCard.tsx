import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { HomeEcoItem } from '../../constants/homeContent';
import { homeRadius, homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';

type Props = {
  item: HomeEcoItem;
};

export function HomeEcoCard({ item }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);

  return (
    <View style={s.card}>
      <Text style={s.icon}>{item.icon}</Text>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.text}>{item.text}</Text>
    </View>
  );
}

export function HomeEcoGrid({ children }: { children: React.ReactNode }) {
  return <View style={grid.grid}>{children}</View>;
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    card: {
      flexGrow: 1,
      flexBasis: '48%',
      minWidth: '46%',
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderRadius: homeRadius.card,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.ecoCardBg,
      gap: 10,
    },
    icon: {
      fontSize: 24,
      lineHeight: 28,
    },
    title: {
      fontSize: homeTypography.ecoTitle.fontSize,
      fontWeight: homeTypography.ecoTitle.fontWeight,
      color: colors.ink,
    },
    text: {
      fontSize: homeTypography.ecoText.fontSize,
      lineHeight: homeTypography.ecoText.lineHeight,
      color: colors.ink2,
    },
  });
}

const grid = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: homeSpacing.ecoGridGap,
    width: '100%',
  },
});
