import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { HomeFeatureTile as HomeFeatureTileType } from '../../constants/homeContent';
import { homeRadius, homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';

type Props = {
  tile: HomeFeatureTileType;
};

export function HomeFeatureTile({ tile }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const themeStyle =
    tile.theme === 'accent' ? s.tileAccent : tile.theme === 'dark' ? s.tileDark : s.tileNeutral;

  return (
    <View style={[s.tile, themeStyle]}>
      <Text style={s.title}>{tile.title}</Text>
      <Text style={s.text}>{tile.text}</Text>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    tile: {
      flexGrow: 1,
      flexBasis: '48%',
      minWidth: '46%',
      borderRadius: homeRadius.card,
      borderWidth: 1,
      borderColor: colors.tileBorder,
      overflow: 'hidden',
      padding: 16,
    },
    tileNeutral: {
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    tileAccent: {
      backgroundColor: 'rgba(59,107,255,0.12)',
      borderColor: 'rgba(59,107,255,0.25)',
    },
    tileDark: {
      backgroundColor: 'rgba(255,255,255,0.02)',
    },
    title: {
      fontSize: homeTypography.tileTitle.fontSize,
      fontWeight: homeTypography.tileTitle.fontWeight,
      color: colors.onDark,
      marginBottom: 6,
    },
    text: {
      fontSize: homeTypography.tileText.fontSize,
      lineHeight: homeTypography.tileText.lineHeight,
      color: colors.onDarkMuted,
    },
  });
}

export function HomeFeatureTileGrid({ children }: { children: React.ReactNode }) {
  return <View style={grid.grid}>{children}</View>;
}

const grid = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: homeSpacing.tileGridGap,
    width: '100%',
  },
});
