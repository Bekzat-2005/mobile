import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import {
  fetchSkillAssessmentSession,
  saveSkillAssessmentProgress,
  startSkillAssessmentSession,
  submitSkillAssessmentSession,
} from '../../api/skill-assessment';
import { formatSkillLevel, formatSkillStatus } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'SkillSessionDetail'>;

const QUESTION_TYPE_RU: Record<string, string> = {
  open_ended: 'Открытый вопрос',
  practical_task: 'Практика',
  multiple_choice: 'Выбор ответа',
};

function getAssessment(sess: Record<string, unknown>): Record<string, unknown> {
  return (sess.assessment as Record<string, unknown>) || {};
}

function getQuestions(sess: Record<string, unknown>): Record<string, unknown>[] {
  const q = getAssessment(sess).questions;
  return Array.isArray(q) ? (q as Record<string, unknown>[]) : [];
}

function answersMapFromSession(sess: Record<string, unknown>): Record<string, string> {
  const arr = (getAssessment(sess).answers as { questionId?: string; answer?: string }[]) || [];
  const out: Record<string, string> = {};
  for (const item of arr) {
    if (item.questionId) out[item.questionId] = String(item.answer ?? '');
  }
  return out;
}

function computeQuestionIndex(
  sess: Record<string, unknown>,
  map: Record<string, string>,
  questions: Record<string, unknown>[],
): number {
  if (String(sess.status) === 'completed') {
    return Math.max(questions.length - 1, 0);
  }
  const stored = Number(getAssessment(sess).currentQuestionIndex ?? 0);
  const firstIncomplete = questions.findIndex((q) => !String(map[String(q.id)] || '').trim());
  if (firstIncomplete >= 0) return firstIncomplete;
  return Math.min(Math.max(stored, 0), Math.max(questions.length - 1, 0));
}

function serializeAnswers(
  questions: Record<string, unknown>[],
  map: Record<string, string>,
  includeEmpty: boolean,
): { questionId: string; answer: string }[] {
  return questions
    .map((q) => ({
      questionId: String(q.id),
      answer: String(map[String(q.id)] ?? '').trim(),
    }))
    .filter((a) => includeEmpty || a.answer);
}

function isPracticalQuestion(q: Record<string, unknown>) {
  return String(q.questionType) === 'practical_task';
}

function countAnswered(
  questions: Record<string, unknown>[],
  map: Record<string, string>,
): number {
  return questions.filter((q) => String(map[String(q.id)] || '').trim()).length;
}

function computeSessionStats(
  questions: Record<string, unknown>[],
  map: Record<string, string>,
  assessment: Record<string, unknown>,
  evaluation: Record<string, unknown>,
) {
  const theoryQs = questions.filter((q) => !isPracticalQuestion(q));
  const practicalQs = questions.filter((q) => isPracticalQuestion(q));
  const totalQuestions =
    typeof evaluation.totalQuestions === 'number' ? evaluation.totalQuestions : questions.length;
  const answeredQuestions =
    typeof evaluation.answeredQuestions === 'number'
      ? evaluation.answeredQuestions
      : countAnswered(questions, map);

  const startedAt = assessment.startedAt;
  const submittedAt = assessment.submittedAt;
  let avgTimeSec: number | null = null;
  if (startedAt && submittedAt && totalQuestions > 0) {
    const ms =
      new Date(String(submittedAt)).getTime() - new Date(String(startedAt)).getTime();
    if (ms > 0) {
      avgTimeSec = Math.round((ms / 1000 / totalQuestions) * 10) / 10;
    }
  }

  return {
    totalQuestions,
    answeredQuestions,
    avgTimeSec,
    overallScore: typeof evaluation.overallScore === 'number' ? evaluation.overallScore : null,
    theoryTotal: theoryQs.length,
    theoryAnswered: countAnswered(theoryQs, map),
    practicalTotal: practicalQs.length,
    practicalAnswered: countAnswered(practicalQs, map),
  };
}

function fmtAvgTime(secs: number | null): string {
  if (secs == null || secs <= 0) return '—';
  if (secs < 60) return `${Math.round(secs)} с`;
  const minutes = Math.floor(secs / 60);
  const rest = Math.round(secs % 60);
  return `${minutes} мин ${rest} с`;
}

export default function SkillSessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const answersRef = useRef(answers);
  const indexRef = useRef(currentIndex);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const applySession = useCallback((next: Record<string, unknown>) => {
    const qs = getQuestions(next);
    const map = answersMapFromSession(next);
    setSession(next);
    setAnswers(map);
    setCurrentIndex(computeQuestionIndex(next, map, qs));
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    const { session: se } = await fetchSkillAssessmentSession(sessionId, token);
    applySession(se as Record<string, unknown>);
    setLoading(false);
    setRef(false);
  }, [sessionId, token, applySession]);

  useEffect(() => {
    load().catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
  }, [load]);

  async function start() {
    if (!token || !session) return;
    setStarting(true);
    setError('');
    try {
      const { session: se } = await startSkillAssessmentSession(sessionId, token);
      applySession(se as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  const persistProgress = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!token || !session) return null;
    if (String(session.status) === 'completed') return null;
    const started = getAssessment(session).startedAt;
    if (!started) return null;

    setSaving(true);
    setError('');
    try {
      const qs = getQuestions(session);
      const payload = {
        answers: serializeAnswers(qs, answersRef.current, false),
        currentQuestionIndex: indexRef.current,
      };
      const { session: se } = await saveSkillAssessmentProgress(sessionId, payload, token);
      applySession(se as Record<string, unknown>);
      return se as Record<string, unknown>;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setSaving(false);
    }
  }, [token, session, sessionId, applySession]);

  function scheduleProgressSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persistProgress();
    }, 450);
  }

  function setAnswerFor(questionId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
    scheduleProgressSave();
  }

  async function goPrev() {
    if (currentIndex <= 0) return;
    await persistProgress();
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  async function goNext() {
    const qs = session ? getQuestions(session) : [];
    if (!qs.length) return;
    if (currentIndex >= qs.length - 1) {
      Alert.alert(
        'Завершить тест?',
        'Ответы уйдут на оценку ИИ. Пустые ответы будут считаться пропусками.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Отправить',
            style: 'default',
            onPress: () => void submitAssessment(),
          },
        ],
      );
      return;
    }
    await persistProgress();
    setCurrentIndex((i) => Math.min(i + 1, qs.length - 1));
  }

  async function submitAssessment() {
    if (!token || !session) return;
    setSubmitting(true);
    setError('');
    try {
      const afterSave = await persistProgress();
      const sess = afterSave ?? session;
      const qs = getQuestions(sess);
      const body = serializeAnswers(qs, answersRef.current, true);
      const { session: se } = await submitSkillAssessmentSession(sessionId, body, token);
      applySession(se as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !session) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const status = String(session.status || '');
  const statusRu = formatSkillStatus(status);
  const targetLevel = String(session.targetLevel || '');
  const levelRu = formatSkillLevel(targetLevel);
  const domainTitle = String(session.domainLabel || session.domainKey || 'Оценка');
  const assessment = getAssessment(session);
  const questions = getQuestions(session);
  const intro = '';
  const assessmentTitle = String(assessment.title || 'Тест навыков');
  const estMinutes = typeof assessment.estimatedDurationMinutes === 'number' ? assessment.estimatedDurationMinutes : 25;
  const startedAt = assessment.startedAt;
  const isStarted = Boolean(startedAt);
  const isCompleted = status === 'completed';
  const evaluation = (session.evaluation as Record<string, unknown>) || {};

  const currentQ = questions[currentIndex] as Record<string, unknown> | undefined;
  const qid = currentQ ? String(currentQ.id) : '';
  const answerType = String(currentQ?.answerType || 'long_text');
  const options = Array.isArray(currentQ?.options) ? (currentQ!.options as string[]) : [];
  const progress =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const answeredCount = questions.filter((q) => String(answers[String(q.id)] || '').trim()).length;
  const sessionStats = computeSessionStats(questions, answers, assessment, evaluation);

  const showTestRunner =
    status === 'in_progress' && isStarted && questions.length > 0 && !isCompleted;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={ref}
              onRefresh={() => {
                setRef(true);
                void load();
              }}
            />
          }
        >
          <View style={s.hero}>
            <Text style={s.heroEyebrow}>Оценка навыков</Text>
            <Text style={s.heroTitle}>{domainTitle}</Text>
            <View style={s.heroMetaRow}>
              <View style={s.pill}>
                <Text style={s.pillText}>Цель: {levelRu}</Text>
              </View>
              <View style={[s.pill, s.pillAccent]}>
                <Text style={[s.pillText, s.pillTextAccent]}>{statusRu}</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={s.errBox}>
              <Text style={s.errTitle}>Ошибка</Text>
              <Text style={s.errText}>{error}</Text>
            </View>
          ) : null}

          {isCompleted ? (
            <>
            <View style={s.statsSection}>
              <View style={s.statsSectionHead}>
                <Ionicons name="stats-chart-outline" size={22} color={colors.accent} />
                <Text style={s.statsSectionTitle}>Теория / Результаты</Text>
              </View>

              <View style={s.statsGrid}>
                <View style={s.statCard}>
                  <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
                  <Text style={s.statValue}>{sessionStats.totalQuestions}</Text>
                  <Text style={s.statLabel}>Жалпы сұрақтар</Text>
                </View>
                <View style={s.statCard}>
                  <Ionicons name="time-outline" size={20} color={colors.accent} />
                  <Text style={s.statValue}>{fmtAvgTime(sessionStats.avgTimeSec)}</Text>
                  <Text style={s.statLabel}>Орташа уақыт</Text>
                </View>
                <View style={s.statCard}>
                  <Ionicons name="trophy-outline" size={20} color={colors.accent} />
                  <Text style={s.statValue}>
                    {sessionStats.overallScore != null ? `${sessionStats.overallScore}%` : '—'}
                  </Text>
                  <Text style={s.statLabel}>Балл</Text>
                </View>
              </View>

              <View style={s.typeBreakdown}>
                <View style={s.typeRow}>
                  <View style={s.typeRowLeft}>
                    <Ionicons name="book-outline" size={18} color={colors.ink2} />
                    <Text style={s.typeLabel}>Теориялық сұрақтар</Text>
                  </View>
                  <Text style={s.typeScore}>
                    {sessionStats.theoryAnswered}/{sessionStats.theoryTotal}
                  </Text>
                </View>
                <View style={s.typeDivider} />
                <View style={s.typeRow}>
                  <View style={s.typeRowLeft}>
                    <Ionicons name="code-slash-outline" size={18} color={colors.ink2} />
                    <Text style={s.typeLabel}>Практикалық сұрақтар</Text>
                  </View>
                  <Text style={s.typeScore}>
                    {sessionStats.practicalAnswered}/{sessionStats.practicalTotal}
                  </Text>
                </View>
              </View>

              <Text style={s.statsFootnote}>
                {sessionStats.answeredQuestions}/{sessionStats.totalQuestions} жауап берілді
              </Text>
            </View>

            <View style={s.card}>
              <View style={s.resultHead}>
                <Ionicons name="ribbon-outline" size={28} color={colors.accent} />
                <Text style={s.cardTitle}>Результат</Text>
              </View>
              <View style={s.scoreRow}>
                <Text style={s.scoreBig}>{String(evaluation.overallScore ?? '—')}</Text>
                <Text style={s.scoreSuffix}>/ 100</Text>
              </View>
              <Text style={s.resultLevel}>
                Подтверждённый уровень:{' '}
                <Text style={s.resultLevelStrong}>
                  {formatSkillLevel(String(evaluation.validatedLevel || ''))}
                </Text>
              </Text>
              {evaluation.summary ? <Text style={s.body}>{String(evaluation.summary)}</Text> : null}
              {Array.isArray(evaluation.strengths) && evaluation.strengths.length ? (
                <>
                  <Text style={s.miniHead}>Сильные стороны</Text>
                  {(evaluation.strengths as string[]).map((t, i) => (
                    <Text key={i} style={s.bullet}>
                      ✓ {t}
                    </Text>
                  ))}
                </>
              ) : null}
              {Array.isArray(evaluation.weakAreas) && evaluation.weakAreas.length ? (
                <>
                  <Text style={[s.miniHead, { marginTop: 12 }]}>Зоны роста</Text>
                  {(evaluation.weakAreas as string[]).map((t, i) => (
                    <Text key={i} style={s.bulletMuted}>
                      → {t}
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
            </>
          ) : null}

          {status === 'ready' ? (
            <View style={s.card}>
              <Text style={s.cardEyebrow}>К тесту</Text>
              <Text style={s.cardTitle}>{assessmentTitle}</Text>
              {intro ? <Text style={s.body}>{intro}</Text> : null}
              <View style={s.statsRow}>
                <View style={s.statCell}>
                  <Text style={s.statVal}>{questions.length}</Text>
                  <Text style={s.statLbl}>вопросов</Text>
                </View>
                <View style={s.statSep} />
                <View style={s.statCell}>
                  <Text style={s.statVal}>{estMinutes}</Text>
                  <Text style={s.statLbl}>минут</Text>
                </View>
                <View style={s.statSep} />
                <View style={s.statCell}>
                  <Text style={s.statVal}>{answeredCount}</Text>
                  <Text style={s.statLbl}>с ответом</Text>
                </View>
              </View>
              <Pressable
                style={[s.btnPrimary, starting && s.btnDisabled]}
                disabled={starting}
                onPress={() => void start()}
              >
                <Ionicons name="play" size={20} color={colors.surface} />
                <Text style={s.btnPrimaryTxt}>{starting ? 'Запуск…' : 'Начать тест'}</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'in_progress' && !isStarted ? (
            <View style={s.card}>
              <Text style={s.body}>
                Сессия в статусе «В работе», но время старта не зафиксировано. Нажмите, чтобы продолжить.
              </Text>
              <Pressable
                style={[s.btnPrimary, starting && s.btnDisabled]}
                disabled={starting}
                onPress={() => void start()}
              >
                <Text style={s.btnPrimaryTxt}>{starting ? '…' : 'Продолжить'}</Text>
              </Pressable>
            </View>
          ) : null}

          {showTestRunner && currentQ ? (
            <View style={s.card}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                Вопрос {currentIndex + 1} из {questions.length}
                {saving ? ' · сохранение…' : ''}
              </Text>

              <View style={s.qMeta}>
                <Text style={s.qArea}>{String(currentQ.skillArea || '')}</Text>
                <Text style={s.qType}>
                  {QUESTION_TYPE_RU[String(currentQ.questionType)] || String(currentQ.questionType)}
                </Text>
              </View>
              <Text style={s.qPrompt}>{String(currentQ.prompt || '')}</Text>

              {answerType === 'single_choice' && options.length ? (
                <View style={s.options}>
                  {options.map((opt) => {
                    const sel = answers[qid] === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[s.optRow, sel && s.optRowOn]}
                        onPress={() => setAnswerFor(qid, opt)}
                      >
                        <View style={[s.radio, sel && s.radioOn]}>
                          {sel ? <View style={s.radioDot} /> : null}
                        </View>
                        <Text style={[s.optTxt, sel && s.optTxtOn]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={s.textArea}
                  multiline
                  placeholder={String(currentQ.placeholder || 'Ваш ответ…')}
                  placeholderTextColor={colors.ink3}
                  value={answers[qid] || ''}
                  onChangeText={(t) => setAnswerFor(qid, t)}
                />
              )}

              <View style={s.navRow}>
                <Pressable
                  style={[s.btnGhost, currentIndex === 0 && s.btnDisabled]}
                  disabled={currentIndex === 0 || saving || submitting}
                  onPress={() => void goPrev()}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.ink} />
                  <Text style={s.btnGhostTxt}>Назад</Text>
                </Pressable>
                <Pressable
                  style={[s.btnPrimarySm, (saving || submitting) && s.btnDisabled]}
                  disabled={saving || submitting}
                  onPress={() => void goNext()}
                >
                  <Text style={s.btnPrimaryTxt}>
                    {submitting ? 'Отправка…' : currentIndex >= questions.length - 1 ? 'Завершить' : 'Далее'}
                  </Text>
                  {currentIndex < questions.length - 1 ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.surface} />
                  ) : null}
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isCompleted && status !== 'ready' && !showTestRunner && status === 'in_progress' && isStarted ? (
            <View style={s.card}>
              <Text style={s.body}>Нет вопросов в сессии. Обновите экран или создайте оценку заново.</Text>
            </View>
          ) : null}

          <Pressable style={s.btnOutline} onPress={() => navigation.navigate('SkillSessions')}>
            <Text style={s.btnOutlineTxt}>Все оценки</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    hero: {
      marginBottom: 16,
      padding: 18,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    heroTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 8, lineHeight: 30 },
    heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surface3,
    },
    pillAccent: { backgroundColor: colors.accentMuted },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
    pillTextAccent: { color: colors.accent },
    errBox: {
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 14,
      marginBottom: 14,
      backgroundColor: colors.surface2,
    },
    errTitle: { fontWeight: '700', color: colors.danger, marginBottom: 6 },
    errText: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 14,
      backgroundColor: colors.surface2,
    },
    cardEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 10, lineHeight: 24 },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginVertical: 18,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    statCell: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 22, fontWeight: '800', color: colors.ink },
    statLbl: { fontSize: 12, color: colors.ink3, marginTop: 4 },
    statSep: { width: 1, height: 36, backgroundColor: colors.line },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.ink,
      paddingVertical: 15,
    },
    btnPrimarySm: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.ink,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    btnPrimaryTxt: { color: colors.surface, fontWeight: '700', fontSize: 16 },
    btnDisabled: { opacity: 0.55 },
    btnOutline: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    btnOutlineTxt: { fontWeight: '600', color: colors.ink },
    progressTrack: {
      height: 6,
      backgroundColor: colors.surface3,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
    progressLabel: { fontSize: 13, color: colors.ink3, marginBottom: 16 },
    qMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    qArea: { fontSize: 12, fontWeight: '700', color: colors.accent, flex: 1, marginRight: 8 },
    qType: { fontSize: 12, color: colors.ink3 },
    qPrompt: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 24, marginBottom: 16 },
    options: { gap: 0 },
    optRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },
    optRowOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.line,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: colors.accent },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    optTxt: { flex: 1, fontSize: 15, color: colors.ink2, lineHeight: 22 },
    optTxtOn: { color: colors.ink, fontWeight: '600' },
    textArea: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    btnGhost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    btnGhostTxt: { fontSize: 16, fontWeight: '600', color: colors.ink },
    statsSection: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 14,
      backgroundColor: colors.surface2,
      gap: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    statsSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statsSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
    statsGrid: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 14,
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
      }),
    },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2 },
    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.ink3,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    typeBreakdown: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      gap: 12,
    },
    typeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    typeLabel: { fontSize: 14, fontWeight: '600', color: colors.ink2, flex: 1 },
    typeScore: { fontSize: 16, fontWeight: '800', color: colors.accent },
    typeDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
    statsFootnote: { fontSize: 13, color: colors.ink3, textAlign: 'center' },
    resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
    scoreBig: { fontSize: 40, fontWeight: '800', color: colors.accent },
    scoreSuffix: { fontSize: 18, color: colors.ink3, marginLeft: 4 },
    resultLevel: { fontSize: 15, color: colors.ink2, marginBottom: 12 },
    resultLevelStrong: { fontWeight: '700', color: colors.ink },
    miniHead: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    bullet: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 4 },
    bulletMuted: { fontSize: 14, color: colors.ink3, lineHeight: 20, marginBottom: 4 },
  });
}
