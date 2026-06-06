import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { SessionListCard } from '../../components/learn/SessionListCard';
import { fetchCareerSessions } from '../../api/career';
import { formatCareerStatus, formatOnboardingMode } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerSessions'>;

import { navigateToCareerSession, sessionIdOf } from '../../lib/career-navigation';

function topicProgressPct(item: Record<string, unknown>): number | null {
  const result = item.result as Record<string, unknown> | undefined;
  const phases = Array.isArray(result?.phases) ? (result!.phases as Record<string, unknown>[]) : [];
  let total = 0;
  let done = 0;
  for (const ph of phases) {
    const modules = Array.isArray(ph.modules) ? (ph.modules as Record<string, unknown>[]) : [];
    for (const mod of modules) {
      const topics = Array.isArray(mod.topics) ? (mod.topics as Record<string, unknown>[]) : [];
      for (const t of topics) {
        total++;
        if (String(t.progressionStatus) === 'completed') done++;
      }
    }
  }
  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

export default function CareerSessionsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { sessions } = await fetchCareerSessions(token);
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
        keyExtractor={(r) => sessionIdOf(r)}
        refreshControl={<RefreshControl refreshing={ref} onRefresh={() => { setRef(true); load(); }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const pct = topicProgressPct(item);
          const mode = formatOnboardingMode(String(item.onboardingMode || ''));
          return (
            <SessionListCard
              title={String(item.directionLabel || item.directionKey || 'Направление')}
              subtitle={String(item.targetRole || '')}
              statusLabel={formatCareerStatus(String(item.status || ''))}
              progressPct={pct}
              badges={mode !== '—' ? [{ label: mode }] : []}
              onPress={() => navigateToCareerSession(navigation, item)}
            />
          );
        }}
        ListEmptyComponent={<Text style={s.muted}>Пока нет сессий — создайте в «Направлениях».</Text>}
      />
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    muted: { textAlign: 'center', color: colors.ink3, marginTop: 32, paddingHorizontal: 24 },
  });
}
