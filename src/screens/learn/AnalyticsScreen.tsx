import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { LearnPageHero } from '../../components/learn/LearnPageHero';
import {
  fetchMyAnalytics,
  fetchTestHistory,
  generateAnalyticsAiAnalysis,
  recomputeAnalytics,
  trackAnalyticsEvent,
  type AnalyticsMetrics,
  type TestHistoryItem,
} from '../../api/analytics';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'Analytics'>;

const ACTIVITY_RU: Record<string, string> = {
  high: 'Высокая',
  medium: 'Средняя',
  low: 'Низкая',
  inactive: 'Неактивен',
};

const TEST_TYPE_RU: Record<string, string> = {
  skill_assessment: 'Оценка навыка',
  career_assessment: 'Карьерная оценка',
  vacancy_assessment: 'Вакансия',
  interview: 'Интервью',
  roadmap_topic_quiz: 'Тема плана',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function AnalyticsScreen({}: Props) {
  const { colors } = useAppTheme();
  const { token, user } = useAuth();
  const s = styles(colors);

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setErr('');
    try {
      const [mRes, hRes] = await Promise.all([fetchMyAnalytics(token), fetchTestHistory(token)]);
      setMetrics(mRes.metrics);
      setHistory(hRes.history || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void trackAnalyticsEvent('SESSION_STARTED', { context: 'analytics_mobile' }, token).catch(() => {});
    void load();
  }, [token, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  async function recompute() {
    if (!token) return;
    try {
      const res = await recomputeAnalytics(token);
      setMetrics(res.metrics);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка пересчёта');
    }
  }

  async function runAiAnalysis() {
    if (!token || analyzing) return;
    setAnalyzing(true);
    setAnalyzeErr('');
    try {
      const direction = Array.isArray(user?.techStack) ? String(user!.techStack[0] || '') : '';
      const res = await generateAnalyticsAiAnalysis(direction, token);
      setMetrics(res.metrics);
    } catch (e) {
      setAnalyzeErr(e instanceof Error ? e.message : 'Анализ недоступен');
    } finally {
      setAnalyzing(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт для аналитики.</Text>
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

  const analysis = metrics?.lastAnalysis;
  const topics = (metrics?.topicStats || [])
    .filter((t) => (t.total || 0) >= 1)
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 6);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LearnPageHero
          eyebrow="Прогресс"
          title="Аналитика"
          lead="Метрики по тестам и активности: точность, темы, история прохождений. ИИ-разбор обновляется не чаще раза в сутки."
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricVal}>{metrics?.totalQuestionsAnswered ?? 0}</Text>
            <Text style={s.metricLbl}>ответов</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>
              {metrics ? Math.round((metrics.accuracyRate || 0) * 100) : 0}%
            </Text>
            <Text style={s.metricLbl}>точность</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>
              {ACTIVITY_RU[String(metrics?.activityFrequency)] || '—'}
            </Text>
            <Text style={s.metricLbl}>активность</Text>
          </View>
        </View>

        <View style={s.actions}>
          <Pressable style={s.btnGhost} onPress={recompute}>
            <Text style={s.btnGhostTxt}>Пересчитать</Text>
          </Pressable>
          <Pressable style={[s.btnPrimary, analyzing && s.btnDisabled]} onPress={runAiAnalysis} disabled={analyzing}>
            <Text style={s.btnPrimaryTxt}>{analyzing ? 'Анализ…' : 'ИИ-разбор'}</Text>
          </Pressable>
        </View>
        {analyzeErr ? <Text style={s.err}>{analyzeErr}</Text> : null}

        {analysis?.overallInsight ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>ИИ-инсайт</Text>
            <Text style={s.body}>{analysis.overallInsight}</Text>
            {analysis.generatedAt ? (
              <Text style={s.meta}>Обновлено: {fmtDate(String(analysis.generatedAt))}</Text>
            ) : null}
            {(analysis.strengths || []).map((t, i) => (
              <Text key={`s-${i}`} style={s.bullet}>
                ✓ {t}
              </Text>
            ))}
            {(analysis.weakAreas || []).map((t, i) => (
              <Text key={`w-${i}`} style={s.bulletMuted}>
                → {t}
              </Text>
            ))}
          </View>
        ) : null}

        {topics.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>Темы</Text>
            {topics.map((t, i) => (
              <View key={i} style={s.topicRow}>
                <Text style={s.topicName}>{t.domain || 'Тема'}</Text>
                <Text style={s.topicStat}>
                  {Math.round((t.accuracy || 0) * 100)}% · {t.total} отв.
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={s.sectionTitle}>История тестов</Text>
        {history.length === 0 ? (
          <Text style={s.muted}>Пока нет завершённых тестов в аналитике.</Text>
        ) : (
          history.slice(0, 15).map((item, i) => (
            <View key={i} style={s.histCard}>
              <Text style={s.histTitle}>{item.title || 'Тест'}</Text>
              <Text style={s.histSub}>
                {TEST_TYPE_RU[String(item.testType)] || item.testType || 'Тест'}
                {item.subtitle ? ` · ${item.subtitle}` : ''}
              </Text>
              <View style={s.histFoot}>
                <Text style={s.histScore}>
                  {item.percentage != null ? `${item.percentage}%` : item.score != null ? `${item.score}` : '—'}
                </Text>
                <Text style={s.histDate}>{fmtDate(String(item.completedAt))}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },
    muted: { color: colors.ink3, padding: 20, fontSize: 15 },
    err: { color: colors.danger, marginBottom: 12, fontSize: 14 },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    metric: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      alignItems: 'center',
      backgroundColor: colors.surface2,
    },
    metricVal: { fontSize: 20, fontWeight: '800', color: colors.ink },
    metricLbl: { fontSize: 11, color: colors.ink3, marginTop: 4, textTransform: 'uppercase' },
    actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    btnGhost: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnGhostTxt: { fontWeight: '600', color: colors.ink },
    btnPrimary: { flex: 1, backgroundColor: colors.ink, paddingVertical: 12, alignItems: 'center' },
    btnPrimaryTxt: { fontWeight: '700', color: colors.surface },
    btnDisabled: { opacity: 0.55 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 14,
      backgroundColor: colors.surface2,
    },
    cardKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    meta: { fontSize: 12, color: colors.ink3, marginTop: 10 },
    bullet: { fontSize: 14, color: colors.ink2, marginTop: 6 },
    bulletMuted: { fontSize: 14, color: colors.ink3, marginTop: 6 },
    topicRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    topicName: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
    topicStat: { fontSize: 13, color: colors.ink3 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 8,
    },
    histCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.surface2,
    },
    histTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    histSub: { fontSize: 13, color: colors.ink2, marginTop: 4 },
    histFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    histScore: { fontSize: 14, fontWeight: '700', color: colors.accent },
    histDate: { fontSize: 12, color: colors.ink3 },
  });
}
