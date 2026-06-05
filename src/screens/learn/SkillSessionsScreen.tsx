import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { fetchSkillAssessmentSessions } from '../../api/skill-assessment';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'SkillSessions'>;

function sid(row: Record<string, unknown>) {
  return String(row.id ?? row._id ?? '');
}

export default function SkillSessionsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { sessions } = await fetchSkillAssessmentSessions(token);
    setRows((sessions as Record<string, unknown>[]) || []);
    setLoading(false);
    setRef(false);
  }, [token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(r) => sid(r)}
        refreshControl={<RefreshControl refreshing={ref} onRefresh={() => { setRef(true); load(); }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            style={s.card}
            onPress={() => navigation.navigate('SkillSessionDetail', { sessionId: sid(item) })}
          >
            <Text style={s.title}>{String(item.domainLabel || item.domainKey)}</Text>
            <Text style={s.meta}>Уровень: {String(item.targetLevel || '')}</Text>
            <Text style={s.status}>{String(item.status || '')}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={s.muted}>Нет сессий — выберите область выше.</Text>}
      />
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
    title: { fontSize: 16, fontWeight: '600', color: colors.ink },
    meta: { fontSize: 14, color: colors.ink2, marginTop: 4 },
    status: { fontSize: 12, color: colors.accent, marginTop: 8 },
    muted: { textAlign: 'center', color: colors.ink3, marginTop: 32, paddingHorizontal: 24 },
  });
}
