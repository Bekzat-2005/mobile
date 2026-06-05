import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { SessionListCard } from '../../components/learn/SessionListCard';
import { fetchSkillAssessmentSessions } from '../../api/skill-assessment';
import { formatSkillLevel, formatSkillStatus } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'SkillSessions'>;

function sid(row: Record<string, unknown>) {
  return String(row.id ?? row._id ?? '');
}

function answerProgressPct(item: Record<string, unknown>): number | null {
  const assessment = item.assessment as Record<string, unknown> | undefined;
  const questions = Array.isArray(assessment?.questions) ? (assessment!.questions as unknown[]) : [];
  const answers = Array.isArray(assessment?.answers) ? (assessment!.answers as { answer?: string }[]) : [];
  if (questions.length === 0) return null;
  const answered = answers.filter((a) => String(a.answer || '').trim()).length;
  return Math.round((answered / questions.length) * 100);
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
        renderItem={({ item }) => {
          const level = formatSkillLevel(String(item.targetLevel || ''));
          const eval_ = item.evaluation as Record<string, unknown> | undefined;
          const score = typeof eval_?.overallScore === 'number' ? eval_!.overallScore : null;
          return (
            <SessionListCard
              title={String(item.domainLabel || item.domainKey)}
              subtitle={level}
              statusLabel={formatSkillStatus(String(item.status || ''))}
              progressPct={
                String(item.status) === 'completed' && score != null ? score : answerProgressPct(item)
              }
              badges={score != null && String(item.status) === 'completed' ? [{ label: `${score}%`, accent: true }] : []}
              onPress={() => navigation.navigate('SkillSessionDetail', { sessionId: sid(item) })}
            />
          );
        }}
        ListEmptyComponent={<Text style={s.muted}>Нет сессий — выберите область выше.</Text>}
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
