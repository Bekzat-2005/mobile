import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { fetchInterviewSession, startInterviewSession } from '../../api/interview';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'InterviewSessionDetail'>;

export default function InterviewSessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { session: se } = await fetchInterviewSession(sessionId, token);
    setSession(se as Record<string, unknown>);
    setLoading(false);
    setRef(false);
  }, [sessionId, token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  async function start() {
    if (!token) return;
    setStarting(true);
    try {
      await startInterviewSession(sessionId, token);
      await load();
    } finally {
      setStarting(false);
    }
  }

  if (loading || !session) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const interview = session.interview as Record<string, unknown> | undefined;
  const questions = (interview?.questions as unknown[]) || [];
  const status = String(session.status || '');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={ref} onRefresh={() => { setRef(true); load(); }} />}
      >
        <Text style={s.h1}>{String(session.domainLabel || session.domainKey)}</Text>
        <Text style={s.meta}>Уровень: {String(session.targetLevel || '')}</Text>
        <Text style={s.status}>Статус: {status}</Text>
        <Text style={s.hint}>Вопросов: {questions.length}</Text>
        <Text style={s.note}>
          Запись ответов голосом на телефоне — в следующих версиях; сейчас можно начать сессию и посмотреть статус. Полный режим — на сайте.
        </Text>
        {status === 'ready' ? (
          <Pressable style={[s.btn, starting && { opacity: 0.6 }]} disabled={starting} onPress={start}>
            <Text style={s.btnTxt}>{starting ? '…' : 'Начать интервью'}</Text>
          </Pressable>
        ) : null}
        <Pressable style={s.out} onPress={() => navigation.navigate('InterviewHub')}>
          <Text style={s.outTxt}>К списку</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    h1: { fontSize: 22, fontWeight: '700', color: colors.ink },
    meta: { fontSize: 15, color: colors.ink2, marginTop: 8 },
    status: { fontSize: 14, color: colors.accent, marginTop: 12 },
    hint: { fontSize: 14, color: colors.ink, marginTop: 16 },
    note: { fontSize: 13, color: colors.ink3, marginTop: 10, lineHeight: 18 },
    btn: { marginTop: 20, backgroundColor: colors.ink, padding: 14, alignItems: 'center' },
    btnTxt: { color: colors.surface, fontWeight: '700' },
    out: { marginTop: 16, borderWidth: 1, borderColor: colors.line, padding: 14, alignItems: 'center' },
    outTxt: { color: colors.ink, fontWeight: '600' },
  });
}
