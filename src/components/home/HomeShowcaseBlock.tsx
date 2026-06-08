import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { HomeShowcaseCard } from '../../constants/homeContent';
import { SHOWCASE_DETAILS_LABEL, SHOWCASE_TRY_LABEL } from '../../constants/homeContent';
import { homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';
import { HomeBadge } from './HomeBadge';
import { HomeButton } from './HomeButton';

type Props = {
  card: HomeShowcaseCard;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
};

export function HomeShowcaseBlock({ card, onPrimaryPress, onSecondaryPress }: Props) {
  const { colors } = useHomeTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const isDark = card.tone === 'dark';

  return (
    <View style={[s.section, isDark ? s.sectionDark : s.sectionLight]}>
      <View style={s.copy}>
        <HomeBadge variant={isDark ? 'light' : 'default'}>{card.eyebrow}</HomeBadge>
        <Text style={[s.title, isDark && s.titleDark]}>{card.title}</Text>
        <Text style={[s.lede, isDark && s.ledeDark]}>{card.text}</Text>
        <View style={s.actions}>
          <HomeButton label={SHOWCASE_TRY_LABEL} variant="primary" onPress={onPrimaryPress} />
          <HomeButton
            label={SHOWCASE_DETAILS_LABEL}
            variant={isDark ? 'ghostLight' : 'ghost'}
            onPress={onSecondaryPress}
          />
        </View>
      </View>
    </View>
  );
}

function styles(colors: HomeThemeColors) {
  return StyleSheet.create({
    section: {
      paddingHorizontal: homeSpacing.screenPaddingH,
      paddingVertical: homeSpacing.sectionPaddingV,
    },
    sectionLight: {
      backgroundColor: colors.showcaseLightBg,
    },
    sectionDark: {
      backgroundColor: colors.darkBg,
    },
    copy: {
      gap: homeSpacing.showcaseCopyGap,
      width: '100%',
    },
    title: {
      fontSize: homeTypography.showcaseH2.fontSize,
      fontWeight: homeTypography.showcaseH2.fontWeight,
      lineHeight: homeTypography.showcaseH2.lineHeight,
      letterSpacing: homeTypography.showcaseH2.letterSpacing,
      color: colors.ink,
    },
    titleDark: {
      color: colors.onDark,
    },
    lede: {
      fontSize: homeTypography.showcaseLede.fontSize,
      lineHeight: homeTypography.showcaseLede.lineHeight,
      color: colors.ink2,
      maxWidth: 480,
    },
    ledeDark: {
      color: colors.onDarkFaint,
    },
    actions: {
      gap: homeSpacing.actionsGap,
      width: '100%',
    },
  });
}
