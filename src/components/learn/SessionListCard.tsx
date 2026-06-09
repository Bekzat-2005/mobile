import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';
import { cardBackground, cardBorder, cardShadow } from '../../theme/cards';

type Badge = { label: string; accent?: boolean };

type Props = {
  title: string;
  subtitle?: string;
  statusLabel: string;
  progressPct?: number | null;
  badges?: Badge[];
  onPress: () => void;
};

export function SessionListCard({ title, subtitle, statusLabel, progressPct, badges = [], onPress }: Props) {
  const { colors, mode } = useAppTheme();
  const s = styles(colors, mode);
  const pct = progressPct != null ? Math.min(100, Math.max(0, progressPct)) : null;

  return (
    <View style={s.cardOuter}>
      <Pressable
        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <View style={s.headerRow}>
          <View style={s.textCol}>
            <Text style={s.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={s.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={s.chevronWrap}>
            <Ionicons name="chevron-forward" size={20} color={colors.ink4} />
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.statusBadge}>
            <Text style={s.statusText}>{statusLabel}</Text>
          </View>
          {badges.map((b, i) => (
            <View key={i} style={[s.chip, b.accent && s.chipAccent]}>
              <Text style={[s.chipText, b.accent && s.chipTextAccent]}>{b.label}</Text>
            </View>
          ))}
        </View>

        {pct != null ? (
          <View style={s.progressBlock}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>Прогресс</Text>
              <Text style={s.progressValue}>{pct}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors'], mode: 'light' | 'dark') {
  return StyleSheet.create({
    cardOuter: {
      marginBottom: 14,
      ...cardShadow(mode),
    },
    card: {
      backgroundColor: cardBackground(colors, mode),
      borderRadius: 16,
      padding: 16,
      ...cardBorder(mode, colors.line),
    },
    cardPressed: {
      opacity: 0.94,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.ink,
      lineHeight: 24,
    },
    subtitle: {
      fontSize: 14,
      color: colors.ink2,
      marginTop: 4,
      lineHeight: 20,
    },
    chevronWrap: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
    },
    statusBadge: {
      borderRadius: 12,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: colors.accentMuted,
      borderWidth: 1,
      borderColor: colors.line,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accentSolid,
    },
    chip: {
      borderRadius: 12,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: colors.surface3,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipAccent: {
      backgroundColor: colors.accentMuted,
      borderColor: colors.line,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.ink2,
    },
    chipTextAccent: {
      color: colors.accent,
    },
    progressBlock: {
      marginTop: 14,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.ink3,
    },
    progressValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentSolid,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.surface3,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accentSolid,
      borderRadius: 3,
    },
  });
}
