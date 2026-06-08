import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';

import React, { useMemo } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';



import { HomeBadge } from '../../components/home/HomeBadge';

import { HomeButton } from '../../components/home/HomeButton';

import { HomeCtaBlock } from '../../components/home/HomeCtaBlock';

import { HomeEcoCard, HomeEcoGrid } from '../../components/home/HomeEcoCard';

import { HomeFeatureTile, HomeFeatureTileGrid } from '../../components/home/HomeFeatureTile';

import { HomeSectionHead } from '../../components/home/HomeSectionHead';

import { HomeShowcaseBlock } from '../../components/home/HomeShowcaseBlock';

import { HomeStatItem } from '../../components/home/HomeStatItem';

import {

  ECOSYSTEM_BADGE,

  ECOSYSTEM_TITLE,

  GOOGLE_BUTTON_LABEL,

  HERO_BADGE,

  HERO_LEDE,

  HERO_TITLE,

  TILES_BADGE,

  TILES_TITLE,

  ecosystem,

  featureTiles,

  getPrimaryActionLabel,

  getSecondaryActionLabel,

  heroMeta,

  showcaseCards,

} from '../../constants/homeContent';

import { useAuth } from '../../context/AuthContext';

import { useAssistantOverlay } from '../../context/AssistantOverlayContext';

import { useAppTheme } from '../../context/ThemeContext';

import { homeSpacing, homeTypography, useHomeTheme, type HomeThemeColors } from '../../theme/theme';



export default function HomeScreen() {

  const navigation = useNavigation<{

    navigate: (name: 'Login' | 'Register' | 'Learn', params?: object) => void;

  }>();

  const { toggle, mode } = useAppTheme();

  const { colors } = useHomeTheme();

  const s = useMemo(() => styles(colors), [colors]);

  const { user, loginWithGoogle } = useAuth();

  const { open: openAssistant } = useAssistantOverlay();

  const [googlePending, setGooglePending] = React.useState(false);



  const isSignedIn = Boolean(user);

  const displayName = user?.username || user?.email || 'пользователь';

  const primaryLabel = getPrimaryActionLabel(isSignedIn);

  const secondaryLabel = getSecondaryActionLabel(isSignedIn);



  const goPrimary = () => {

    if (isSignedIn) {

      navigation.navigate('Learn', { screen: 'CareerDirections' });

      return;

    }

    navigation.navigate('Register');

  };



  const goSecondary = () => {

    if (isSignedIn) {

      openAssistant();

      return;

    }

    navigation.navigate('Learn', { screen: 'LearnHub' });

  };



  async function onGoogle() {

    setGooglePending(true);

    try {

      await loginWithGoogle();

    } catch {

      // AuthContext surfaces errors on auth screens; home stays silent.

    } finally {

      setGooglePending(false);

    }

  }



  return (

    <SafeAreaView style={s.safe} edges={['top']}>

      <View style={s.topbar}>

        <Text style={s.logo}>Skillo</Text>

        <Pressable onPress={toggle} hitSlop={12} accessibilityLabel="Переключить тему">

          <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.ink} />

        </Pressable>

      </View>



      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>

          <View style={s.heroCopy}>

            <HomeBadge centered>{HERO_BADGE}</HomeBadge>

            <Text style={s.heroTitle}>{HERO_TITLE}</Text>

            <Text style={s.heroLede}>{HERO_LEDE}</Text>



            <View style={s.actions}>

              <HomeButton label={primaryLabel} variant="primary" onPress={goPrimary} />

              <HomeButton label={secondaryLabel} variant="ghost" onPress={goSecondary} />

              {!isSignedIn ? (

                <HomeButton

                  label={GOOGLE_BUTTON_LABEL}

                  variant="outline"

                  onPress={onGoogle}

                  loading={googlePending}

                  showGoogleIcon

                />

              ) : null}

            </View>



            {isSignedIn ? (

              <Text style={s.session}>

                Вы вошли как <Text style={s.sessionStrong}>@{displayName}</Text>

              </Text>

            ) : null}



            <View style={s.stats}>

              {heroMeta.map((item) => (

                <HomeStatItem key={item.label} value={item.value} label={item.label} />

              ))}

            </View>

          </View>

        </View>



        {showcaseCards.map((card) => (

          <HomeShowcaseBlock

            key={card.eyebrow}

            card={card}

            onPrimaryPress={goPrimary}

            onSecondaryPress={goSecondary}

          />

        ))}



        <View style={s.tilesSection}>

          <HomeSectionHead badge={TILES_BADGE} title={TILES_TITLE} dark />

          <HomeFeatureTileGrid>

            {featureTiles.map((tile) => (

              <HomeFeatureTile key={tile.title} tile={tile} />

            ))}

          </HomeFeatureTileGrid>

        </View>



        <View style={s.ecosystemSection}>

          <HomeSectionHead badge={ECOSYSTEM_BADGE} title={ECOSYSTEM_TITLE} centered />

          <HomeEcoGrid>

            {ecosystem.map((item) => (

              <HomeEcoCard key={item.title} item={item} />

            ))}

          </HomeEcoGrid>

        </View>



        <HomeCtaBlock

          primaryLabel={primaryLabel}

          secondaryLabel={secondaryLabel}

          onPrimaryPress={goPrimary}

          onSecondaryPress={goSecondary}

        />



        <View style={s.bottomSpacer} />

      </ScrollView>

    </SafeAreaView>

  );

}



function styles(colors: HomeThemeColors) {

  return StyleSheet.create({

    safe: {

      flex: 1,

      backgroundColor: colors.surface,

    },

    topbar: {

      flexDirection: 'row',

      justifyContent: 'space-between',

      alignItems: 'center',

      paddingHorizontal: homeSpacing.screenPaddingH,

      paddingVertical: 12,

      borderBottomWidth: StyleSheet.hairlineWidth,

      borderBottomColor: colors.line,

      backgroundColor: colors.surface,

    },

    logo: {

      fontSize: 18,

      fontWeight: '800',

      color: colors.ink,

      letterSpacing: -0.5,

    },

    scroll: {

      paddingBottom: 32,

    },

    hero: {

      backgroundColor: colors.surface,

      paddingHorizontal: homeSpacing.screenPaddingH,

      paddingTop: 32,

      paddingBottom: homeSpacing.sectionPaddingV,

    },

    heroCopy: {

      gap: homeSpacing.copyGap,

      alignItems: 'center',

      width: '100%',

    },

    heroTitle: {

      fontSize: homeTypography.heroH1.fontSize,

      fontWeight: homeTypography.heroH1.fontWeight,

      lineHeight: homeTypography.heroH1.lineHeight,

      letterSpacing: homeTypography.heroH1.letterSpacing,

      color: colors.ink,

      textAlign: 'center',

    },

    heroLede: {

      fontSize: homeTypography.heroLede.fontSize,

      lineHeight: homeTypography.heroLede.lineHeight,

      color: colors.ink2,

      textAlign: 'center',

      maxWidth: 480,

    },

    actions: {

      gap: homeSpacing.actionsGap,

      width: '100%',

    },

    session: {

      fontSize: homeTypography.session.fontSize,

      color: colors.ink3,

      textAlign: 'center',

    },

    sessionStrong: {

      fontWeight: '700',

      color: colors.ink2,

    },

    stats: {

      flexDirection: 'row',

      flexWrap: 'wrap',

      gap: homeSpacing.statsGap,

      width: '100%',

      marginTop: 6,

    },

    tilesSection: {

      backgroundColor: colors.tileSectionBg,

      paddingHorizontal: homeSpacing.screenPaddingH,

      paddingVertical: homeSpacing.sectionPaddingV,

    },

    ecosystemSection: {

      backgroundColor: colors.surface,

      paddingHorizontal: homeSpacing.screenPaddingH,

      paddingVertical: homeSpacing.sectionPaddingV,

      gap: 32,

    },

    bottomSpacer: {

      height: 28,

      backgroundColor: colors.surface,

    },

  });

}


