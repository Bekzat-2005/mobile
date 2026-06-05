import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { LearnPageHero } from '../../components/learn/LearnPageHero';
import {
  LearnChipGrid,
  LearnFieldLabel,
  LearnSetupModal,
  learnListCardStyle,
} from '../../components/learn/LearnSetupModal';
import {
  createInterviewSession,
  fetchInterviewDomains,
  fetchInterviewSessions,
  type InterviewDomain,
} from '../../api/interview';
import { skillTargetLevels } from '../../constants/career-defaults';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'InterviewHub'>;

const STATUS_RU: Record<string, string> = {
  ready: 'Готова',
  in_progress: 'В работе',
  completed: 'Завершена',
};

function sid(row: Record<string, unknown>) {
  return String(row.id ?? row._id ?? '');
}

export default function InterviewHubScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [domains, setDomains] = useState<InterviewDomain[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [domain, setDomain] = useState<InterviewDomain | null>(null);
  const [level, setLevel] = useState('junior');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [d, se] = await Promise.all([fetchInterviewDomains(token), fetchInterviewSessions(token)]);
    setDomains(d.domains);
    setSessions((se.sessions as Record<string, unknown>[]) || []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  function openNewSession() {
    setErr('');
    setDomain(domains[0] || null);
    setLevel('junior');
    setModal(true);
  }

  async function createI() {
    if (!token || !domain) return;
    setErr('');
    setCreating(true);
    try {
      const { session } = await createInterviewSession(
        { domainKey: domain.key, targetLevel: level },
        token,
      );
      const id = String(session.id ?? session._id ?? '');
      setModal(false);
      setDomain(null);
      navigation.navigate('InterviewSessionDetail', { sessionId: id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const domainOptions = domains.map((d) => ({
    value: d.key,
    label: d.label || d.key,
  }));
  const levelOptions = skillTargetLevels.map((lv) => ({ value: lv.value, label: lv.label }));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={sessions}
        keyExtractor={(r) => sid(r)}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <LearnPageHero
              eyebrow="Интервью"
              title="Режим интервью"
              lead="Выберите область и уровень — получите серию вопросов с обратной связью после ответов. Подходит для подготовки к собеседованию по выбранному стеку."
            />
            <Pressable style={s.newBtn} onPress={openNewSession}>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={s.newTxt}>Новая сессия интервью</Text>
            </Pressable>
            <Text style={s.sectionTitle}>Последние сессии</Text>
          </>
        }
        renderItem={({ item }) => {
          const st = String(item.status || '');
          const stRu = STATUS_RU[st] || st;
          return (
            <Pressable
              style={({ pressed }) => [learnListCardStyle(colors), pressed && { opacity: 0.92 }]}
              onPress={() => navigation.navigate('InterviewSessionDetail', { sessionId: sid(item) })}
            >
              <Text style={s.cardTitle}>{String(item.domainLabel || item.domainKey)}</Text>
              <Text style={s.cardMeta}>Уровень: {String(item.targetLevel || '—')}</Text>
              <View style={s.statusPill}>
                <Text style={s.statusTxt}>{stRu}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Пока нет сессий — создайте первую.</Text>}
      />

      <LearnSetupModal
        visible={modal}
        title="Новая сессия"
        description="Укажите стек и уровень — вопросы подстроятся под вашу специализацию."
        onClose={() => {
          setErr('');
          setModal(false);
        }}
        error={err}
        primaryLabel="Создать"
        onPrimary={createI}
        primaryLoading={creating}
        primaryDisabled={!domain}
      >
        <LearnFieldLabel>Область</LearnFieldLabel>
        <LearnChipGrid
          options={domainOptions}
          value={domain?.key || ''}
          onChange={(key) => setDomain(domains.find((d) => d.key === key) || null)}
          columns={2}
        />
        <LearnFieldLabel>Уровень</LearnFieldLabel>
        <LearnChipGrid options={levelOptions} value={level} onChange={setLevel} columns={2} />
      </LearnSetupModal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    muted: { padding: 20, color: colors.ink2 },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
      paddingVertical: 14,
      marginBottom: 20,
    },
    newTxt: { fontSize: 16, fontWeight: '700', color: colors.accent },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    cardMeta: { fontSize: 14, color: colors.ink2, marginTop: 4 },
    statusPill: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    statusTxt: { fontSize: 12, fontWeight: '600', color: colors.accent },
    empty: { textAlign: 'center', color: colors.ink3, paddingVertical: 24, fontSize: 15 },
  });
}
