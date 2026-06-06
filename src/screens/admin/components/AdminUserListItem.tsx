import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AdminUser } from '../../../api/admin';
import { formatUserRole, formatUserStatus } from '../../../lib/status-labels';
import { useAppTheme } from '../../../context/ThemeContext';
import { adminStyles, adminTokens } from '../admin-styles';

type Props = {
  user: AdminUser;
  onPress: () => void;
};

export function AdminUserListItem({ user, onPress }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  const isBanned = user.status === 'banned';

  return (
    <Pressable style={({ pressed }) => [s.row, pressed && s.rowPressed]} onPress={onPress}>
      <View style={s.avatar}>
        <Text style={s.avatarTxt}>
          {String(user.name || user.username || user.email || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>
          {user.name || 'Без имени'}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          @{user.username || '—'} · {user.email || '—'}
        </Text>
        <View style={s.badges}>
          <View style={s.pill}>
            <Text style={s.pillTxt}>{formatUserRole(user.role)}</Text>
          </View>
          <View style={[s.pill, isBanned && s.pillDanger]}>
            <Text style={[s.pillTxt, isBanned && s.pillDangerTxt]}>
              {formatUserStatus(user.status)}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
    </Pressable>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  const base = adminStyles(colors);
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: adminTokens.radiusMd,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      backgroundColor: colors.surface2,
      marginBottom: 10,
    },
    rowPressed: { backgroundColor: adminTokens.accentBlueMuted },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: adminTokens.accentBlueMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: { fontSize: 18, fontWeight: '800', color: adminTokens.accentBlue },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '700', color: colors.ink },
    sub: { fontSize: 13, color: colors.ink3, marginTop: 2 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    pill: base.pill,
    pillTxt: base.pillTxt,
    pillDanger: base.pillDanger,
    pillDangerTxt: base.pillDangerTxt,
  });
}
