import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';

type Props = {
  eyebrow: string;
  title: string;
  lead: string;
  linkLabel?: string;
  onLinkPress?: () => void;
};

export function LearnPageHero({ eyebrow, title, lead, linkLabel, onLinkPress }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  return (
    <View style={s.hero}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.lead}>{lead}</Text>
      {linkLabel && onLinkPress ? (
        <Pressable style={s.link} onPress={onLinkPress}>
          <Text style={s.linkText}>{linkLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    hero: {
      paddingTop: 4,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      marginBottom: 16,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
    lead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 10 },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 14,
      alignSelf: 'flex-start',
    },
    linkText: { fontSize: 15, fontWeight: '600', color: colors.accent },
  });
}
