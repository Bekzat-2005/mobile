import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { cardBackground, cardShadow } from '../../theme/cards';
import { radius } from '../../theme/colors';

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

function formatRemainingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getSessionTopics(questions: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const q of questions) {
    const area = String(q.skillArea || '').trim();
    if (area && !seen.has(area)) {
      seen.add(area);
      topics.push(area);
    }
  }
  return topics;
}

export default function SkillSessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors, mode } = useAppTheme();
  const { token } = useAuth();
  const s = useMemo(() => styles(colors, mode), [colors, mode]);

  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const answersRef = useRef(answers);
  const indexRef = useRef(currentIndex);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitTriggered = useRef(false);

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

  const applySession = useCallback(
    (next: Record<string, unknown>, options?: { preserveQuestionIndex?: boolean }) => {
      const qs = getQuestions(next);
      const map = answersMapFromSession(next);
      setSession(next);
      setAnswers(map);
      if (!options?.preserveQuestionIndex) {
        setCurrentIndex(computeQuestionIndex(next, map, qs));
      }
      if (String(next.status) !== 'completed') {
        autoSubmitTriggered.current = false;
      }
    },
    [],
  );

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
      applySession(se as Record<string, unknown>, { preserveQuestionIndex: true });
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

  useEffect(() => {
    if (!session) return;
    const status = String(session.status || '');
    const started = getAssessment(session).startedAt;
    if (status !== 'in_progress' || !started) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session || submitting || autoSubmitTriggered.current) return;
    if (String(session.status) === 'completed') return;
    const assessment = getAssessment(session);
    if (!assessment.startedAt) return;
    const est =
      typeof assessment.estimatedDurationMinutes === 'number'
        ? assessment.estimatedDurationMinutes
        : 25;
    const durationSec = est * 60;
    const elapsed = Math.max(
      Math.floor((now - new Date(String(assessment.startedAt)).getTime()) / 1000),
      0,
    );
    const remaining = Math.max(durationSec - elapsed, 0);
    if (remaining === 0 && getQuestions(session).length > 0) {
      autoSubmitTriggered.current = true;
      void submitAssessment();
    }
  }, [now, session, submitting]);

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
  const sessionStats = computeSessionStats(questions, answers, assessment, evaluation);
  const sessionTopics = getSessionTopics(questions);
  const showTestRunner =
    status === 'in_progress' && isStarted && questions.length > 0 && !isCompleted;
  const durationSeconds = estMinutes * 60;
  const remainingSeconds = (() => {
    if (!isStarted || isCompleted) return durationSeconds;
    const elapsed = Math.max(
      Math.floor((now - new Date(String(startedAt)).getTime()) / 1000),
      0,
    );
    return Math.max(durationSeconds - elapsed, 0);
  })();
  const timerDanger = showTestRunner && remainingSeconds < 180;
  const currentSkillArea = String(currentQ?.skillArea || '').trim();

  const sessionInfoRows = [
    { label: 'Домен', value: domainTitle },
    { label: 'Цель', value: levelRu },
    { label: 'Статус', value: statusRu },
    { label: 'Вопросов', value: String(questions.length) },
    { label: 'Время', value: `~${estMinutes} мин` },
  ];
  const assessmentIntro = String(assessment.introduction || '').trim();
  const showTopicsInHeader = !showTestRunner && status === 'ready' && sessionTopics.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
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
          <View style={s.compactHeader}>
            <Pressable
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={8}
              accessibilityLabel="Назад"
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <Text style={s.compactTitle} numberOfLines={1}>
              {domainTitle}
            </Text>
            {showTestRunner ? (
              <View style={[s.timerBox, timerDanger && s.timerBoxDanger]}>
                <Text style={s.timerCaption}>Осталось</Text>
                <Text style={[s.timerValue, timerDanger && s.timerValueDanger]}>
                  {formatRemainingTime(remainingSeconds)}
                </Text>
              </View>
            ) : (
              <Pressable
                style={s.infoBtn}
                onPress={() => setInfoExpanded((v) => !v)}
                hitSlop={8}
                accessibilityLabel="Информация о сессии"
              >
                <Ionicons
                  name={infoExpanded ? 'information-circle' : 'information-circle-outline'}
                  size={22}
                  color={colors.accentSolid}
                />
              </Pressable>
            )}
          </View>

          {showTestRunner ? (
            <View style={s.testProgressBar}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                Вопрос {currentIndex + 1} из {questions.length}
                {saving ? ' · сохранение…' : ''}
              </Text>
            </View>
          ) : null}

          {showTopicsInHeader ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.topicsRow}
              style={s.topicsScroll}
            >
              {sessionTopics.map((topic) => (
                <View key={topic} style={s.topicPill}>
                  <Text style={s.topicPillTxt}>{topic}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {!showTestRunner && infoExpanded ? (
            <View style={s.infoPanel}>
              {assessmentIntro ? <Text style={s.infoIntro}>{assessmentIntro}</Text> : null}
              {sessionInfoRows.map((row) => (
                <View key={row.label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
              {sessionTopics.length > 0 ? (
                <View style={s.infoTopicsBlock}>
                  <Text style={s.infoLabel}>Темы</Text>
                  <View style={s.infoTopicsWrap}>
                    {sessionTopics.map((topic) => (
                      <Text key={topic} style={s.infoTopicChip}>
                        {topic}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {error ? (
            <View style={s.errBox}>
              <Text style={s.errText}>{error}</Text>
            </View>
          ) : null}

          {isCompleted ? (
            <>
              <View style={s.card}>
                <Text style={s.resultScore}>{String(evaluation.overallScore ?? '—')}</Text>
                <Text style={s.resultScoreSuffix}>из 100</Text>
                <Text style={s.resultLevel}>
                  Уровень:{' '}
                  <Text style={s.resultLevelStrong}>
                    {formatSkillLevel(String(evaluation.validatedLevel || ''))}
                  </Text>
                </Text>
                {evaluation.summary ? <Text style={s.body}>{String(evaluation.summary)}</Text> : null}
              </View>

              <View style={s.statsStack}>
                <View style={s.statRow}>
                  <Text style={s.statRowLabel}>Вопросов</Text>
                  <Text style={s.statRowValue}>{sessionStats.totalQuestions}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statRowLabel}>Среднее время</Text>
                  <Text style={s.statRowValue}>{fmtAvgTime(sessionStats.avgTimeSec)}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statRowLabel}>Теория</Text>
                  <Text style={s.statRowValue}>
                    {sessionStats.theoryAnswered}/{sessionStats.theoryTotal}
                  </Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statRowLabel}>Практика</Text>
                  <Text style={s.statRowValue}>
                    {sessionStats.practicalAnswered}/{sessionStats.practicalTotal}
                  </Text>
                </View>
              </View>

              {Array.isArray(evaluation.strengths) && evaluation.strengths.length ? (
                <View style={s.card}>
                  <Text style={s.sectionLabel}>Сильные стороны</Text>
                  {(evaluation.strengths as string[]).map((t, i) => (
                    <Text key={i} style={s.bullet}>
                      {t}
                    </Text>
                  ))}
                </View>
              ) : null}

              {Array.isArray(evaluation.weakAreas) && evaluation.weakAreas.length ? (
                <View style={s.card}>
                  <Text style={s.sectionLabel}>Зоны роста</Text>
                  {(evaluation.weakAreas as string[]).map((t, i) => (
                    <Text key={i} style={s.bulletMuted}>
                      {t}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {status === 'ready' ? (
            <View style={s.card}>
              <Text style={s.readyMeta}>
                {questions.length} вопросов · ~{estMinutes} мин · {levelRu}
              </Text>
              <Text style={s.readyHint}>Таймер запустится после старта. Прогресс сохраняется автоматически.</Text>
              <Pressable
                style={[s.btnPrimary, starting && s.btnDisabled]}
                disabled={starting}
                onPress={() => void start()}
              >
                <Ionicons name="play" size={18} color="#ffffff" />
                <Text style={s.btnPrimaryTxt}>{starting ? 'Запуск…' : 'Начать тест'}</Text>
              </Pressable>
            </View>
          ) : null}

          {status === 'in_progress' && !isStarted ? (
            <View style={s.card}>
              <Text style={s.body}>
                Сессия не была запущена. Нажмите, чтобы продолжить.
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
            <View style={s.questionBlock}>
              {(currentSkillArea ||
                QUESTION_TYPE_RU[String(currentQ.questionType)] ||
                currentQ.questionType) ? (
                <Text style={s.qMeta} numberOfLines={1}>
                  {[currentSkillArea, QUESTION_TYPE_RU[String(currentQ.questionType)]]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
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
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sel }}
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
                  style={[s.btnSecondary, currentIndex === 0 && s.btnDisabled]}
                  disabled={currentIndex === 0 || saving || submitting}
                  onPress={() => void goPrev()}
                >
                  <Text style={s.btnSecondaryTxt}>Назад</Text>
                </Pressable>
                <Pressable
                  style={[s.btnPrimary, s.btnPrimaryFlex, (saving || submitting) && s.btnDisabled]}
                  disabled={saving || submitting}
                  onPress={() => void goNext()}
                >
                  <Text style={s.btnPrimaryTxt}>
                    {submitting
                      ? 'Отправка…'
                      : currentIndex >= questions.length - 1
                        ? 'Завершить'
                        : 'Далее'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!isCompleted && status !== 'ready' && !showTestRunner && status === 'in_progress' && isStarted ? (
            <View style={s.card}>
              <Text style={s.body}>Нет вопросов в сессии. Обновите экран или создайте оценку заново.</Text>
            </View>
          ) : null}

          {!showTestRunner ? (
            <Pressable style={s.linkBtn} onPress={() => navigation.navigate('SkillSessions')}>
              <Text style={s.linkBtnTxt}>Все оценки</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors'], mode: 'light' | 'dark') {
  const shadow = cardShadow(mode);
  const cardBg = cardBackground(colors, mode);

  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 32 },
    compactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface3,
    },
    compactTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
      letterSpacing: -0.3,
    },
    infoBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    testProgressBar: { marginBottom: 12, gap: 6 },
    timerBox: {
      minWidth: 64,
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
    },
    timerBoxDanger: { backgroundColor: 'rgba(217, 54, 84, 0.12)' },
    timerCaption: { fontSize: 9, fontWeight: '600', color: colors.ink3, textTransform: 'uppercase' },
    timerValue: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 },
    timerValueDanger: { color: colors.danger },
    topicsScroll: { marginBottom: 10, maxHeight: 32 },
    topicsRow: { gap: 6, paddingRight: 4 },
    topicPill: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
    },
    topicPillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink3 },
    infoPanel: {
      marginBottom: 12,
      padding: 14,
      borderRadius: radius.sm,
      backgroundColor: cardBg,
      gap: 10,
      ...shadow,
    },
    infoIntro: { fontSize: 14, color: colors.ink2, lineHeight: 21, marginBottom: 2 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    infoLabel: { fontSize: 13, color: colors.ink3 },
    infoValue: { fontSize: 13, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
    infoTopicsBlock: { gap: 8, marginTop: 2 },
    infoTopicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoTopicChip: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.ink2,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
      overflow: 'hidden',
    },
    errBox: {
      marginBottom: 12,
      padding: 12,
      borderRadius: radius.sm,
      backgroundColor: colors.surface3,
    },
    errText: { fontSize: 14, color: colors.danger, lineHeight: 20 },
    card: {
      marginBottom: 12,
      padding: 14,
      borderRadius: radius.sm,
      backgroundColor: cardBg,
      ...shadow,
    },
    readyMeta: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 6 },
    readyHint: { fontSize: 13, color: colors.ink3, lineHeight: 19, marginBottom: 14 },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 20,
      borderRadius: radius.sm,
      backgroundColor: colors.accentSolid,
    },
    btnPrimaryFlex: { flex: 1 },
    btnPrimaryTxt: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
    btnSecondary: {
      minHeight: 48,
      minWidth: 96,
      paddingHorizontal: 16,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface3,
    },
    btnSecondaryTxt: { fontSize: 15, fontWeight: '600', color: colors.ink },
    btnDisabled: { opacity: 0.45 },
    linkBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    linkBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.accentSolid },
    progressTrack: {
      height: 4,
      backgroundColor: colors.surface3,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.accentSolid, borderRadius: 2 },
    progressLabel: { fontSize: 12, fontWeight: '600', color: colors.ink3 },
    questionBlock: {
      marginBottom: 8,
      gap: 12,
    },
    qMeta: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentSolid,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    qPrompt: { fontSize: 17, fontWeight: '600', color: colors.ink, lineHeight: 25 },
    options: { gap: 8 },
    optRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 52,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      backgroundColor: cardBg,
      ...shadow,
    },
    optRowOn: { backgroundColor: colors.accentMuted },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: colors.accentSolid },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentSolid },
    optTxt: { flex: 1, fontSize: 15, color: colors.ink2, lineHeight: 22 },
    optTxtOn: { color: colors.ink, fontWeight: '600' },
    textArea: {
      minHeight: 128,
      borderRadius: radius.sm,
      padding: 14,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: cardBg,
      textAlignVertical: 'top',
      ...shadow,
    },
    navRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch', marginTop: 4 },
    statsStack: {
      marginBottom: 12,
      padding: 14,
      borderRadius: radius.sm,
      backgroundColor: cardBg,
      gap: 10,
      ...shadow,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statRowLabel: { fontSize: 14, color: colors.ink2 },
    statRowValue: { fontSize: 15, fontWeight: '700', color: colors.ink },
    resultScore: { fontSize: 36, fontWeight: '800', color: colors.accentSolid, lineHeight: 40 },
    resultScoreSuffix: { fontSize: 14, color: colors.ink3, marginBottom: 8 },
    resultLevel: { fontSize: 15, color: colors.ink2, marginBottom: 12 },
    resultLevelStrong: { fontWeight: '700', color: colors.ink },
    bullet: { fontSize: 14, color: colors.ink2, lineHeight: 21, marginBottom: 6 },
    bulletMuted: { fontSize: 14, color: colors.ink3, lineHeight: 21, marginBottom: 6 },
  });
}
