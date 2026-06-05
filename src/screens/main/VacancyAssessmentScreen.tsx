import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VacanciesStackParamList } from '../../navigation/types';
import { trackAnalyticsEvent } from '../../api/analytics';
import {
  applyToVacancy,
  getMyVacancyApplication,
  submitVacancyApplication,
  type VacancyApplication,
  type VacancyAssessment,
  type VacancyQuestion,
  type VacancyTask,
} from '../../api/vacancies';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<VacanciesStackParamList, 'VacancyAssessment'>;

type StepItem =
  | { kind: 'question'; data: VacancyQuestion; index: number }
  | { kind: 'task'; data: VacancyTask; index: number };

const QUESTION_TYPE_RU: Record<string, string> = {
  theory: 'Теория',
  practical: 'Практика',
  behavioral: 'Поведение',
};

const DIFFICULTY_RU: Record<string, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

const TASK_TYPE_RU: Record<string, string> = {
  coding: 'Код',
  design: 'Дизайн',
  analysis: 'Анализ',
  writing: 'Текст',
};

function isDoneStatus(status?: string) {
  return status === 'completed' || status === 'invited' || status === 'rejected';
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#6b7280';
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number | null | undefined) {
  if (score == null) return '—';
  if (score >= 80) return 'Отлично';
  if (score >= 65) return 'Хорошо';
  if (score >= 40) return 'Удовлетворительно';
  return 'Недостаточно';
}

export default function VacancyAssessmentScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<VacancyApplication | null>(null);
  const [assessment, setAssessment] = useState<VacancyAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Войдите в аккаунт для прохождения оценки.');
      return;
    }

    (async () => {
      try {
        let data;
        try {
          data = await getMyVacancyApplication(id, token);
        } catch (e) {
          const status = (e as Error & { status?: number }).status;
          if (status === 404) {
            data = await applyToVacancy(id, token);
          } else {
            throw e;
          }
        }

        setApplication(data.application);
        if (data.assessment) {
          setAssessment(data.assessment);
        }

        const ans: Record<string, string> = {};
        const subs: Record<string, string> = {};
        (data.application?.answers || []).forEach((a) => {
          if (a.questionId) ans[String(a.questionId)] = a.text || '';
        });
        (data.application?.taskSubmissions || []).forEach((t) => {
          if (t.taskId) subs[String(t.taskId)] = t.content || '';
        });
        setAnswers(ans);
        setSubmissions(subs);

        void trackAnalyticsEvent('SESSION_STARTED', { domain: 'vacancy_assessment', context: 'vacancy_assessment' }, token).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить оценку');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const steps = useMemo<StepItem[]>(() => {
    if (!assessment) return [];
    const qs = (assessment.questions || []).map((q, i) => ({ kind: 'question' as const, data: q, index: i }));
    const ts = (assessment.tasks || []).map((t, i) => ({ kind: 'task' as const, data: t, index: i }));
    return [...qs, ...ts];
  }, [assessment]);

  const currentStep = steps[stepIndex];
  const progress = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
  const isDone = isDoneStatus(application?.status);

  const canSubmit = useMemo(() => {
    if (!assessment || submitting) return false;
    return (assessment.questions || []).some((q) => String(answers[String(q._id)] || '').trim().length > 0);
  }, [assessment, answers, submitting]);

  function getCurrentValue(): string {
    if (!currentStep) return '';
    if (currentStep.kind === 'question') {
      return answers[String(currentStep.data._id)] || '';
    }
    return submissions[String(currentStep.data._id)] || '';
  }

  function setCurrentValue(text: string) {
    if (!currentStep) return;
    if (currentStep.kind === 'question') {
      setAnswers((prev) => ({ ...prev, [String(currentStep.data._id)]: text }));
    } else {
      setSubmissions((prev) => ({ ...prev, [String(currentStep.data._id)]: text }));
    }
  }

  async function handleSubmit() {
    if (!token || !assessment || !canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const answersPayload = (assessment.questions || []).map((q) => ({
        questionId: String(q._id),
        text: answers[String(q._id)] || '',
      }));
      const tasksPayload = (assessment.tasks || []).map((t) => ({
        taskId: String(t._id),
        content: submissions[String(t._id)] || '',
      }));

      const data = await submitVacancyApplication(id, { answers: answersPayload, taskSubmissions: tasksPayload }, token);
      setApplication(data.application);

      const qCount = (assessment.questions?.length || 0) + (assessment.tasks?.length || 0);
      const overallScore = data.application?.score ?? data.application?.overallScore ?? null;
      void trackAnalyticsEvent(
        'ASSESSMENT_COMPLETED',
        {
          testType: 'vacancy_assessment',
          title: assessment.title || 'Оценка вакансии',
          subtitle: `${qCount} вопросов`,
          category: 'Оценка вакансии',
          domain: 'vacancy_assessment',
          questionsCount: qCount,
          score: overallScore,
          maxScore: overallScore != null ? 100 : null,
          percentage: overallScore,
          passed: overallScore != null ? overallScore >= 65 : null,
        },
        token,
      ).catch(() => {});
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Не удалось отправить оценку');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт для прохождения оценки.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.muted}>Загрузка оценки…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.error}>{error}</Text>
        <Pressable style={s.outlineBtn} onPress={() => navigation.goBack()}>
          <Text style={s.outlineBtnTxt}>← К вакансии</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!assessment) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Оценка ещё не сгенерирована. Попробуйте позже.</Text>
        <Pressable style={s.outlineBtn} onPress={() => navigation.goBack()}>
          <Text style={s.outlineBtnTxt}>← К вакансии</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isDone && application) {
    const sc = application.score ?? application.overallScore;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Pressable style={s.backLink} onPress={() => navigation.navigate('VacancyDetail', { id })}>
            <Text style={s.backLinkTxt}>← Вернуться к вакансии</Text>
          </Pressable>

          <View style={s.scorePanel}>
            <Text style={[s.scoreBig, { color: scoreColor(sc) }]}>{sc ?? '—'}</Text>
            <Text style={s.scoreMax}>/100</Text>
          </View>
          <Text style={[s.scoreLabel, { color: scoreColor(sc) }]}>{scoreLabel(sc)}</Text>
          {application.overallFeedback ? <Text style={s.feedback}>{application.overallFeedback}</Text> : null}

          {(application.strengths || []).length > 0 ? (
            <View style={s.resultCard}>
              <Text style={s.resultKicker}>Сильные стороны</Text>
              {(application.strengths || []).map((t, i) => (
                <Text key={i} style={s.bulletOk}>✓ {t}</Text>
              ))}
            </View>
          ) : null}

          {(application.improvements || []).length > 0 ? (
            <View style={s.resultCard}>
              <Text style={s.resultKicker}>Зоны роста</Text>
              {(application.improvements || []).map((t, i) => (
                <Text key={i} style={s.bulletMuted}>→ {t}</Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {submitting ? (
          <View style={s.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.overlayTitle}>AI анализирует ваши ответы</Text>
            <Text style={s.overlaySub}>Проверяем вопросы и формируем обратную связь.</Text>
          </View>
        ) : null}

        <View style={s.progressWrap}>
          <View style={s.progressHead}>
            <Text style={s.progressLabel}>
              {stepIndex + 1} / {steps.length}
            </Text>
            <Text style={s.progressPct}>{progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {currentStep?.kind === 'question' ? (
            <>
              <View style={s.metaRow}>
                <Text style={s.pill}>{QUESTION_TYPE_RU[currentStep.data.type || ''] || currentStep.data.type}</Text>
                <Text style={s.pillMuted}>
                  {DIFFICULTY_RU[currentStep.data.difficulty || ''] || currentStep.data.difficulty}
                </Text>
              </View>
              <Text style={s.stepTitle}>Вопрос {currentStep.index + 1}</Text>
              <Text style={s.prompt}>{currentStep.data.text}</Text>
              <TextInput
                style={s.input}
                multiline
                placeholder={`Ваш ответ на вопрос ${currentStep.index + 1}…`}
                placeholderTextColor={colors.ink3}
                value={getCurrentValue()}
                onChangeText={setCurrentValue}
                textAlignVertical="top"
              />
            </>
          ) : currentStep?.kind === 'task' ? (
            <>
              <View style={s.metaRow}>
                <Text style={s.pill}>{TASK_TYPE_RU[currentStep.data.type || ''] || currentStep.data.type}</Text>
                {currentStep.data.timeLimit ? (
                  <Text style={s.pillMuted}>{currentStep.data.timeLimit} мин</Text>
                ) : null}
              </View>
              <Text style={s.stepTitle}>Задание {currentStep.index + 1}</Text>
              <Text style={s.prompt}>{currentStep.data.title}</Text>
              {currentStep.data.description ? (
                <Text style={s.taskDesc}>{currentStep.data.description}</Text>
              ) : null}
              <TextInput
                style={[s.input, s.inputLg]}
                multiline
                placeholder={`Ваше решение задания ${currentStep.index + 1}…`}
                placeholderTextColor={colors.ink3}
                value={getCurrentValue()}
                onChangeText={setCurrentValue}
                textAlignVertical="top"
              />
            </>
          ) : null}
        </ScrollView>

        <View style={s.footer}>
          {submitError ? <Text style={s.error}>{submitError}</Text> : null}
          <View style={s.navRow}>
            <Pressable style={[s.navBtn, stepIndex === 0 && s.navBtnDisabled]} onPress={goPrev} disabled={stepIndex === 0}>
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
              <Text style={s.navBtnTxt}>Назад</Text>
            </Pressable>

            {stepIndex < steps.length - 1 ? (
              <Pressable style={s.primaryBtn} onPress={goNext}>
                <Text style={s.primaryBtnTxt}>Далее</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.surface} />
              </Pressable>
            ) : (
              <Pressable
                style={[s.primaryBtn, !canSubmit && s.navBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={s.primaryBtnTxt}>Отправить</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    flex: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center', gap: 10 },
    scroll: { padding: 20, paddingBottom: 24 },
    muted: { color: colors.ink3, padding: 20, fontSize: 15 },
    error: { color: colors.danger, fontSize: 14, marginBottom: 8 },
    backLink: { marginBottom: 16 },
    backLinkTxt: { color: colors.accent, fontWeight: '600' },
    progressWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
    progressPct: { fontSize: 13, color: colors.ink3 },
    progressTrack: { height: 6, backgroundColor: colors.line, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.accent },
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    pill: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.accentMuted,
      backgroundColor: colors.accentMuted,
    },
    pillMuted: { fontSize: 11, color: colors.ink3, paddingVertical: 4 },
    stepTitle: { fontSize: 12, fontWeight: '800', color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1 },
    prompt: { fontSize: 20, fontWeight: '700', color: colors.ink, lineHeight: 28, marginTop: 8, marginBottom: 16 },
    taskDesc: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginBottom: 12 },
    input: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
      padding: 14,
      fontSize: 15,
      color: colors.ink,
      lineHeight: 22,
    },
    inputLg: { minHeight: 180 },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    navRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.line,
    },
    navBtnDisabled: { opacity: 0.4 },
    navBtnTxt: { fontWeight: '600', color: colors.ink },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      paddingVertical: 14,
    },
    primaryBtnTxt: { fontWeight: '700', color: colors.surface, fontSize: 16 },
    outlineBtn: { margin: 20, padding: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
    outlineBtnTxt: { fontWeight: '600', color: colors.ink },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    overlayTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
    overlaySub: { color: '#e5e5e5', fontSize: 14, marginTop: 8, textAlign: 'center' },
    scorePanel: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 8 },
    scoreBig: { fontSize: 56, fontWeight: '800' },
    scoreMax: { fontSize: 20, color: colors.ink3, marginBottom: 10, marginLeft: 4 },
    scoreLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    feedback: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 12, textAlign: 'center' },
    resultCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginTop: 14,
      backgroundColor: colors.surface2,
    },
    resultKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    bulletOk: { fontSize: 14, color: colors.ink2, marginTop: 4 },
    bulletMuted: { fontSize: 14, color: colors.ink3, marginTop: 4 },
  });
}
