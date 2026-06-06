import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../../context/ThemeContext';
import { adminStyles, adminTokens } from '../admin-styles';

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function AdminNavRow({ title, subtitle, icon, onPress }: Props) {
  const { colors } = useAppTheme();
  const s = adminStyles(colors);
  const local = styles(colors);

  return (
    <Pressable style={s.navRow} onPress={onPress}>
      <View style={local.icon}>
        <Ionicons name={icon} size={22} color={adminTokens.accentBlue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.navRowTitle}>{title}</Text>
        <Text style={s.navRowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
    </Pressable>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    icon: {
      width: 40,
      height: 40,
      borderRadius: adminTokens.radiusSm,
      backgroundColor: adminTokens.accentBlueMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
