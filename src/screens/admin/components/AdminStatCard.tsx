import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../../context/ThemeContext';
import { adminStyles, adminTokens } from '../admin-styles';

type Props = {
  label: string;
  value: number | string;
  meta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
};

export function AdminStatCard({ label, value, meta, icon, tint }: Props) {
  const { colors } = useAppTheme();
  const accent = tint || adminTokens.accentBlue;
  const s = styles(colors, accent);

  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
      {meta ? <Text style={s.meta}>{meta}</Text> : null}
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors'], accent: string) {
  const base = adminStyles(colors);
  return StyleSheet.create({
    card: {
      ...base.card,
      width: '48%',
      flexGrow: 1,
      minWidth: 150,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: adminTokens.radiusSm,
      backgroundColor: `${accent}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    value: { fontSize: 28, fontWeight: '800', color: colors.ink },
    label: { fontSize: 12, fontWeight: '600', color: colors.ink2, marginTop: 4 },
    meta: { fontSize: 11, color: colors.ink3, marginTop: 6, lineHeight: 16 },
  });
}
