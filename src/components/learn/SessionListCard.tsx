import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const s = styles(colors);
  const pct = progressPct != null ? Math.min(100, Math.max(0, progressPct)) : null;

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]} onPress={onPress}>
      <View style={s.topRow}>
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
        <Ionicons name="chevron-forward" size={18} color={colors.ink4} />
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
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressLbl}>{pct}%</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    textCol: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink },
    subtitle: { fontSize: 13, color: colors.ink3, marginTop: 4 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: colors.accentMuted,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    statusText: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
    chip: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    chipAccent: { borderColor: colors.accentMuted, backgroundColor: colors.accentMuted },
    chipText: { fontSize: 11, fontWeight: '600', color: colors.ink2 },
    chipTextAccent: { color: colors.accent },
    progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    progressTrack: { flex: 1, height: 4, backgroundColor: colors.line, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.accent },
    progressLbl: { fontSize: 12, fontWeight: '700', color: colors.ink3, minWidth: 36, textAlign: 'right' },
  });
}
