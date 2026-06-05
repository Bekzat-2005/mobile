import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SkillRadarChart, type VerifiedSkill } from '../../components/learn/SkillRadarChart';
import {
  fetchMyAnalytics,
  fetchTestHistory,
  generateAnalyticsAiAnalysis,
  recomputeAnalytics,
  trackAnalyticsEvent,
  type AnalyticsMetrics,
  type AnalyticsStudyPlanStep,
  type AnalyticsWeakArea,
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

const HISTORY_ORDER = [
  'roadmap_topic_quiz',
  'skill_assessment',
  'interview',
  'career_assessment',
  'vacancy_assessment',
  'unknown',
];

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

function fmtTime(secs?: number) {
  if (!secs) return '—';
  if (secs < 60) return `${Math.round(secs)} с`;
  return `${Math.floor(secs / 60)} м ${Math.round(secs % 60)} с`;
}

function barColor(accuracy: number, colors: ReturnType<typeof useAppTheme>['colors']) {
  if (accuracy >= 0.75) return colors.accent;
  if (accuracy >= 0.45) return colors.ink2;
  return colors.danger;
}

function weakAreaText(item: string | AnalyticsWeakArea): string {
  if (typeof item === 'string') return item;
  const parts = [item.topic, item.explanation, item.suggestedFocus].filter(Boolean);
  return parts.join(' — ') || '—';
}

function studyPlanText(item: string | AnalyticsStudyPlanStep): string {
  if (typeof item === 'string') return item;
  const step = item.step || '';
  const rationale = item.rationale ? ` (${item.rationale})` : '';
  return `${step}${rationale}`.trim() || '—';
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
  const [recomputing, setRecomputing] = useState(false);

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
    setRecomputing(true);
    try {
      const res = await recomputeAnalytics(token);
      setMetrics(res.metrics);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка пересчёта');
    } finally {
      setRecomputing(false);
    }
  }

  async function runAiAnalysis() {
    if (!token || analyzing || !canAnalyze) return;
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

  const analysis = metrics?.lastAnalysis;
  const cooldownRemaining = useMemo(() => {
    if (!analysis?.generatedAt) return 0;
    const elapsed = Date.now() - new Date(String(analysis.generatedAt)).getTime();
    return Math.max(0, COOLDOWN_MS - elapsed);
  }, [analysis?.generatedAt]);

  const canAnalyze = cooldownRemaining === 0;
  const cooldownLabel = useMemo(() => {
    if (!cooldownRemaining) return '';
    const h = Math.floor(cooldownRemaining / 3600000);
    const m = Math.floor((cooldownRemaining % 3600000) / 60000);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  }, [cooldownRemaining]);

  const topics = useMemo(
    () =>
      (metrics?.topicStats || [])
        .filter((t) => (t.total || 0) >= 1)
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .slice(0, 8),
    [metrics?.topicStats],
  );

  const verifiedSkills = useMemo(() => {
    const raw = user?.verifiedSkills;
    if (!Array.isArray(raw)) return [] as VerifiedSkill[];
    return raw as VerifiedSkill[];
  }, [user?.verifiedSkills]);

  const historyByType = useMemo(() => {
    const groups: Record<string, TestHistoryItem[]> = {};
    history.forEach((item) => {
      const t = String(item.testType || 'unknown');
      if (!groups[t]) groups[t] = [];
      groups[t].push(item);
    });
    return HISTORY_ORDER.filter((t) => groups[t]?.length).map((t) => ({
      testType: t,
      items: groups[t],
    }));
  }, [history]);

  const hasEnoughData = (metrics?.totalQuestionsAnswered || 0) >= 5;

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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LearnPageHero
          eyebrow="Прогресс"
          title="Аналитика"
          lead="Персональная статистика: точность, темы, поведение и история тестов. ИИ-разбор — не чаще раза в сутки."
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <Text style={s.sectionTitle}>Обзор</Text>
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricVal}>{metrics?.totalQuestionsAnswered ?? 0}</Text>
            <Text style={s.metricLbl}>ответов</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>{metrics ? Math.round((metrics.accuracyRate || 0) * 100) : 0}%</Text>
            <Text style={s.metricLbl}>точность</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>{ACTIVITY_RU[String(metrics?.activityFrequency)] || '—'}</Text>
            <Text style={s.metricLbl}>активность</Text>
          </View>
        </View>

        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricVal}>{fmtTime(metrics?.avgTimePerQuestion)}</Text>
            <Text style={s.metricLbl}>ср. время</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>{metrics?.totalSessions ?? 0}</Text>
            <Text style={s.metricLbl}>сессий</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricVal}>{metrics?.correctAnswers ?? 0}</Text>
            <Text style={s.metricLbl}>верных</Text>
          </View>
        </View>

        <View style={s.actions}>
          <Pressable style={[s.btnGhost, recomputing && s.btnDisabled]} onPress={recompute} disabled={recomputing}>
            <Text style={s.btnGhostTxt}>{recomputing ? 'Пересчёт…' : 'Обновить данные'}</Text>
          </Pressable>
          <Pressable
            style={[s.btnPrimary, (analyzing || !canAnalyze) && s.btnDisabled]}
            onPress={runAiAnalysis}
            disabled={analyzing || !canAnalyze}
          >
            <Text style={s.btnPrimaryTxt}>
              {analyzing ? 'Анализ…' : canAnalyze ? 'ИИ-разбор' : `Через ${cooldownLabel}`}
            </Text>
          </Pressable>
        </View>
        {!hasEnoughData ? (
          <Text style={s.hint}>Для осмысленного ИИ-разбора нужно минимум 5 ответов в аналитике.</Text>
        ) : null}
        {analyzeErr ? <Text style={s.err}>{analyzeErr}</Text> : null}

        <Text style={s.sectionTitle}>Поведение</Text>
        <View style={s.card}>
          <View style={s.behaviorRow}>
            <Text style={s.behaviorLbl}>Повторные попытки</Text>
            <Text style={s.behaviorVal}>{Math.round((metrics?.retryRate || 0) * 100)}%</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${Math.round((metrics?.retryRate || 0) * 100)}%`, backgroundColor: colors.ink2 }]} />
          </View>
          <View style={[s.behaviorRow, { marginTop: 12 }]}>
            <Text style={s.behaviorLbl}>Отказы от заданий</Text>
            <Text style={s.behaviorVal}>{Math.round((metrics?.dropoffRate || 0) * 100)}%</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${Math.round((metrics?.dropoffRate || 0) * 100)}%`, backgroundColor: colors.danger }]} />
          </View>
        </View>

        {(metrics?.weakestTopics?.length || metrics?.strongestTopics?.length) ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>Сильные и слабые темы</Text>
            {(metrics?.strongestTopics || []).slice(0, 4).map((t, i) => (
              <Text key={`st-${i}`} style={s.chipStrong}>✓ {t}</Text>
            ))}
            {(metrics?.weakestTopics || []).slice(0, 4).map((t, i) => (
              <Text key={`wk-${i}`} style={s.chipWeak}>→ {t}</Text>
            ))}
          </View>
        ) : null}

        {topics.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>По темам</Text>
            {topics.map((t, i) => {
              const acc = t.accuracy || 0;
              return (
                <View key={i} style={s.topicBlock}>
                  <View style={s.topicRow}>
                    <Text style={s.topicName}>{t.topic || 'Тема'}</Text>
                    <Text style={s.topicStat}>
                      {Math.round(acc * 100)}% · {t.total} отв.
                    </Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round(acc * 100)}%`, backgroundColor: barColor(acc, colors) }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <Text style={s.sectionTitle}>Навыки</Text>
        <View style={s.card}>
          <SkillRadarChart skills={verifiedSkills} />
        </View>

        {analysis?.overallInsight ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>ИИ-инсайт</Text>
            <Text style={s.body}>{analysis.overallInsight}</Text>
            {analysis.generatedAt ? (
              <Text style={s.meta}>Обновлено: {fmtDate(String(analysis.generatedAt))}</Text>
            ) : null}
            {(analysis.strengths || []).map((t, i) => (
              <Text key={`s-${i}`} style={s.bullet}>✓ {t}</Text>
            ))}
            {(analysis.weakAreas || []).map((t, i) => (
              <Text key={`w-${i}`} style={s.bulletMuted}>→ {weakAreaText(t)}</Text>
            ))}
            {(analysis.recommendations || []).map((t, i) => (
              <Text key={`r-${i}`} style={s.bulletMuted}>• {t}</Text>
            ))}
            {(analysis.nextTopics || []).length ? (
              <Text style={s.subKicker}>Следующие темы</Text>
            ) : null}
            {(analysis.nextTopics || []).map((t, i) => (
              <Text key={`n-${i}`} style={s.bulletMuted}>→ {t}</Text>
            ))}
            {(analysis.studyPlan || []).length ? (
              <Text style={s.subKicker}>План обучения</Text>
            ) : null}
            {(analysis.studyPlan || []).map((t, i) => (
              <Text key={`p-${i}`} style={s.bulletMuted}>{i + 1}. {studyPlanText(t)}</Text>
            ))}
          </View>
        ) : null}

        {(metrics?.mostLikedTopics?.length || metrics?.completedDomains?.length) ? (
          <View style={s.card}>
            <Text style={s.cardKicker}>Интересы</Text>
            {(metrics?.mostLikedTopics || []).map((t, i) => (
              <Text key={`l-${i}`} style={s.bullet}>♥ {t}</Text>
            ))}
            {(metrics?.completedDomains || []).map((t, i) => (
              <Text key={`d-${i}`} style={s.bulletMuted}>✓ {t}</Text>
            ))}
          </View>
        ) : null}

        <Text style={s.sectionTitle}>История тестов</Text>
        {history.length === 0 ? (
          <Text style={s.muted}>Пока нет завершённых тестов в аналитике.</Text>
        ) : (
          historyByType.map((group) => (
            <View key={group.testType} style={s.histGroup}>
              <Text style={s.histGroupTitle}>{TEST_TYPE_RU[group.testType] || group.testType}</Text>
              {group.items.slice(0, 8).map((item, i) => (
                <View key={i} style={s.histCard}>
                  <Text style={s.histTitle}>{item.title || 'Тест'}</Text>
                  {item.subtitle ? <Text style={s.histSub}>{item.subtitle}</Text> : null}
                  <View style={s.histFoot}>
                    <Text style={s.histScore}>
                      {item.percentage != null ? `${item.percentage}%` : item.score != null ? `${item.score}` : '—'}
                    </Text>
                    <Text style={s.histDate}>{fmtDate(String(item.completedAt))}</Text>
                  </View>
                </View>
              ))}
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
    muted: { color: colors.ink3, padding: 4, fontSize: 15, marginBottom: 12 },
    hint: { fontSize: 13, color: colors.ink3, marginBottom: 12 },
    err: { color: colors.danger, marginBottom: 12, fontSize: 14 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 8,
    },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    metric: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      alignItems: 'center',
      backgroundColor: colors.surface2,
    },
    metricVal: { fontSize: 18, fontWeight: '800', color: colors.ink },
    metricLbl: { fontSize: 10, color: colors.ink3, marginTop: 4, textTransform: 'uppercase' },
    actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    btnGhost: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnGhostTxt: { fontWeight: '600', color: colors.ink },
    btnPrimary: { flex: 1, backgroundColor: colors.ink, paddingVertical: 12, alignItems: 'center' },
    btnPrimaryTxt: { fontWeight: '700', color: colors.surface, fontSize: 13 },
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
    subKicker: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.ink3,
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 4,
    },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    meta: { fontSize: 12, color: colors.ink3, marginTop: 10 },
    bullet: { fontSize: 14, color: colors.ink2, marginTop: 6 },
    bulletMuted: { fontSize: 14, color: colors.ink3, marginTop: 6 },
    chipStrong: { fontSize: 13, color: colors.accent, marginTop: 4 },
    chipWeak: { fontSize: 13, color: colors.danger, marginTop: 4 },
    behaviorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    behaviorLbl: { fontSize: 14, color: colors.ink2 },
    behaviorVal: { fontSize: 14, fontWeight: '700', color: colors.ink },
    barTrack: { height: 6, backgroundColor: colors.line, overflow: 'hidden' },
    barFill: { height: '100%' },
    topicBlock: { marginBottom: 12 },
    topicRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    topicName: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
    topicStat: { fontSize: 13, color: colors.ink3 },
    histGroup: { marginBottom: 14 },
    histGroupTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink2,
      marginBottom: 8,
      textTransform: 'uppercase',
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
