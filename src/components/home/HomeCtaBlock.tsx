import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CTA_BADGE, CTA_TITLE } from '../../constants/homeContent';
import { homeRadius, homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';
import { HomeBadge } from './HomeBadge';
import { HomeButton } from './HomeButton';

type Props = {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
};

export function HomeCtaBlock({
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
}: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);

  return (
    <View style={s.wrap}>
      <View style={s.block}>
        <HomeBadge centered>{CTA_BADGE}</HomeBadge>
        <Text style={s.title}>{CTA_TITLE}</Text>
        <View style={s.actions}>
          <HomeButton
            label={primaryLabel}
            variant="primary"
            size="large"
            onPress={onPrimaryPress}
            fullWidth={false}
          />
          <HomeButton
            label={secondaryLabel}
            variant="ghost"
            size="large"
            onPress={onSecondaryPress}
            fullWidth={false}
          />
        </View>
      </View>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: homeSpacing.screenPaddingH,
      paddingBottom: homeSpacing.sectionPaddingV,
      backgroundColor: colors.surface,
    },
    block: {
      alignItems: 'center',
      gap: homeSpacing.ctaGap,
      padding: homeSpacing.ctaPadding,
      borderRadius: homeRadius.cta,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.ctaBg,
    },
    title: {
      fontSize: homeTypography.ctaH2.fontSize,
      fontWeight: homeTypography.ctaH2.fontWeight,
      lineHeight: homeTypography.ctaH2.lineHeight,
      letterSpacing: homeTypography.ctaH2.letterSpacing,
      color: colors.ink,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: homeSpacing.actionsGap,
    },
  });
}
