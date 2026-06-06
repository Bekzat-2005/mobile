import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import {
  confirmCareerSkillLevels,
  fetchCareerSession,
  submitCareerSession,
  switchCareerSessionToZeroStart,
  type CareerSkillLevel,
} from '../../api/career';
import { AiProcessingOverlay } from '../../components/AiProcessingOverlay';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerAssessment'>;

type AssessmentQuestion = {
  id: string;
  order?: number;
  skillArea?: string;
  difficulty?: string;
  answerType?: string;
  prompt?: string;
  options?: string[];
  placeholder?: string;
  evaluationHint?: string;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  novice: 'Новичок',
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Нет опыта' },
  { value: 'novice', label: 'Новичок' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
];

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function CareerAssessmentScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [skillLevels, setSkillLevels] = useState<CareerSkillLevel[]>([]);
  const [aiMessage, setAiMessage] = useState('');

  const assessment = asRecord(session?.assessment);
  const questions = useMemo(
    () => asArray<AssessmentQuestion>(assessment.questions),
    [assessment.questions],
  );
  const currentQuestion = questions[questionIndex] || null;
  const status = String(session?.status || '');

  const answeredCount = useMemo(
    () => questions.filter((q) => String(answers[q.id] || '').trim()).length,
    [questions, answers],
  );
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLastQuestion = questions.length > 0 && questionIndex === questions.length - 1;
  const isFirstQuestion = questionIndex === 0;

  const hydrateAnswers = useCallback((sess: Record<string, unknown>) => {
    const a = asRecord(sess.assessment);
    const map: Record<string, string> = {};
    for (const item of asArray<{ questionId?: string; answer?: string }>(a.answers)) {
      if (item.questionId) map[item.questionId] = String(item.answer || '');
    }
    setAnswers(map);
    const qs = asArray<AssessmentQuestion>(a.questions);
    const firstIncomplete = qs.findIndex((q) => !String(map[q.id] || '').trim());
    setQuestionIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
  }, []);

  const hydrateSkillLevels = useCallback((sess: Record<string, unknown>) => {
    const a = asRecord(sess.assessment);
    setSkillLevels(
      asArray<{ area?: string; level?: string }>(a.detectedSkillLevels).map((item) => ({
        area: String(item.area || ''),
        level: String(item.level || 'none'),
      })),
    );
  }, []);

  const loadSession = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const { session: se } = await fetchCareerSession(sessionId, token);
      setSession(se as Record<string, unknown>);
      hydrateAnswers(se as Record<string, unknown>);

      const st = String(se.status || '');
      if (st === 'roadmap_ready' || st === 'roadmap_generating') {
        navigation.replace('CareerSessionDetail', { sessionId });
        return;
      }
      if (st === 'awaiting_skill_confirmation') {
        hydrateSkillLevels(se as Record<string, unknown>);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить тест');
    } finally {
      setLoading(false);
    }
  }, [token, sessionId, navigation, hydrateAnswers, hydrateSkillLevels]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  function beginAssessment() {
    setError('');
    setHasStarted(true);
  }

  function validateCurrentQuestion(): boolean {
    if (!currentQuestion) return false;
    if (!String(answers[currentQuestion.id] || '').trim()) {
      setError('Сначала ответьте на текущий вопрос.');
      return false;
    }
    setError('');
    return true;
  }

  async function submitAssessment() {
    if (!token || !validateCurrentQuestion()) return;

    setAiMessage('AI анализирует ответы... ✨');
    setError('');
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      const { session: updated } = await submitCareerSession(sessionId, payload, token);
      setSession(updated as Record<string, unknown>);

      if (String(updated.status) === 'awaiting_skill_confirmation') {
        hydrateSkillLevels(updated as Record<string, unknown>);
        setHasStarted(false);
      } else {
        navigation.replace('CareerSessionDetail', { sessionId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить ответы');
    } finally {
      setAiMessage('');
    }
  }

  async function goToNextQuestion() {
    if (!validateCurrentQuestion()) return;
    if (isLastQuestion) {
      await submitAssessment();
      return;
    }
    setQuestionIndex((i) => i + 1);
  }

  function goToPreviousQuestion() {
    setError('');
    if (!isFirstQuestion) setQuestionIndex((i) => i - 1);
  }

  async function confirmSkills() {
    if (!token) return;
    setAiMessage('Составляем ваш план развития... ✨');
    setError('');
    try {
      await confirmCareerSkillLevels(sessionId, skillLevels, token);
      navigation.replace('CareerSessionDetail', { sessionId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подтвердить навыки');
    } finally {
      setAiMessage('');
    }
  }

  async function switchToZeroStart() {
    if (!token) return;
    setAiMessage('Составляем ваш план развития... ✨');
    setError('');
    try {
      await switchCareerSessionToZeroStart(sessionId, token);
      navigation.replace('CareerSessionDetail', { sessionId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось переключить режим');
    } finally {
      setAiMessage('');
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
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.muted}>Загружаем тест...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AiProcessingOverlay visible={Boolean(aiMessage)} message={aiMessage} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>{String(session?.directionLabel || 'Оценка уровня')}</Text>
        <Text style={s.title}>
          {status === 'awaiting_skill_confirmation'
            ? 'Подтверждение уровня'
            : hasStarted
              ? 'Тест'
              : 'Определи стартовую точку'}
        </Text>
        <Text style={s.lead}>
          {status === 'awaiting_skill_confirmation'
            ? 'ИИ определил стартовый уровень. Подтвердите или скорректируйте.'
            : hasStarted
              ? `${answeredCount} из ${questions.length} ответов заполнено`
              : 'Коротко и честно. По ответам строится персональная дорожная карта.'}
        </Text>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Skill confirmation */}
        {status === 'awaiting_skill_confirmation' ? (
          <View style={s.card}>
            <Text style={s.cardLabel}>Шаг 2 из 2</Text>
            <Text style={s.cardTitle}>ИИ определил стартовый уровень</Text>
            {assessment.skillAnalysisSummary ? (
              <Text style={s.body}>{String(assessment.skillAnalysisSummary)}</Text>
            ) : null}

            {skillLevels.map((skill, index) => (
              <View key={`${skill.area}-${index}`} style={s.skillRow}>
                <Text style={s.skillArea}>{skill.area}</Text>
                <View style={s.levelRow}>
                  {LEVEL_OPTIONS.map((opt) => {
                    const active = skill.level === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[s.levelChip, active && s.levelChipActive]}
                        onPress={() =>
                          setSkillLevels((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, level: opt.value } : item,
                            ),
                          )
                        }
                      >
                        <Text style={[s.levelChipTxt, active && s.levelChipTxtActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {asArray<string>(assessment.skillStrengths).length ? (
              <>
                <Text style={s.sectionTitle}>Сильные стороны</Text>
                {asArray<string>(assessment.skillStrengths).map((item) => (
                  <Text key={item} style={s.bullet}>
                    • {item}
                  </Text>
                ))}
              </>
            ) : null}

            {asArray<string>(assessment.skillGaps).length ? (
              <>
                <Text style={s.sectionTitle}>Что подтянуть</Text>
                {asArray<string>(assessment.skillGaps).map((item) => (
                  <Text key={item} style={s.bullet}>
                    • {item}
                  </Text>
                ))}
              </>
            ) : null}

            <Pressable style={s.primaryBtn} onPress={confirmSkills}>
              <Text style={s.primaryBtnTxt}>Подтвердить и построить дорожную карту</Text>
            </Pressable>
          </View>
        ) : !hasStarted ? (
          /* Intro */
          <View style={s.card}>
            <Text style={s.cardTitle}>{String(assessment.title || 'Вступительный тест')}</Text>
            {assessment.introduction ? (
              <Text style={s.body}>{String(assessment.introduction)}</Text>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.metaChip}>{String(session?.targetRole || '')}</Text>
              {assessment.estimatedDurationMinutes ? (
                <Text style={s.metaChip}>{String(assessment.estimatedDurationMinutes)} мин</Text>
              ) : null}
              <Text style={s.metaChip}>{questions.length} вопросов</Text>
            </View>

            <Pressable style={s.primaryBtn} onPress={beginAssessment}>
              <Ionicons name="play-outline" size={20} color={colors.surface} />
              <Text style={s.primaryBtnTxt}>Пройти тест</Text>
            </Pressable>

            <Pressable style={s.secondaryBtn} onPress={switchToZeroStart}>
              <Text style={s.secondaryBtnTxt}>Начать с нуля (без теста)</Text>
            </Pressable>

            <View style={s.tipsBox}>
              <Text style={s.tipsTitle}>Как проходить</Text>
              <Text style={s.bullet}>• Пишите конкретно</Text>
              <Text style={s.bullet}>• Если не знаете — так и скажите</Text>
              <Text style={s.bullet}>• Примеры важнее общих слов</Text>
            </View>
          </View>
        ) : currentQuestion ? (
          /* Question */
          <View style={s.card}>
            <View style={s.progressHead}>
              <Text style={s.progressLabel}>
                Вопрос {questionIndex + 1} из {questions.length}
              </Text>
              <Text style={s.progressLabel}>{answeredCount}/{questions.length} отвечено</Text>
            </View>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
            </View>

            <View style={s.questionMeta}>
              {currentQuestion.skillArea ? (
                <Text style={s.metaChip}>{currentQuestion.skillArea}</Text>
              ) : null}
              {currentQuestion.difficulty ? (
                <Text style={s.metaChip}>
                  {DIFFICULTY_LABELS[currentQuestion.difficulty] || currentQuestion.difficulty}
                </Text>
              ) : null}
            </View>

            <Text style={s.questionPrompt}>{currentQuestion.prompt}</Text>

            {currentQuestion.evaluationHint ? (
              <Text style={s.hint}>Что проверяется: {currentQuestion.evaluationHint}</Text>
            ) : null}

            {currentQuestion.answerType === 'single_choice' ? (
              <View style={s.options}>
                {asArray<string>(currentQuestion.options).map((option) => {
                  const selected = answers[currentQuestion.id] === option;
                  return (
                    <Pressable
                      key={option}
                      style={[s.option, selected && s.optionSelected]}
                      onPress={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }))
                      }
                    >
                      <View style={[s.radio, selected && s.radioSelected]}>
                        {selected ? <View style={s.radioDot} /> : null}
                      </View>
                      <Text style={[s.optionTxt, selected && s.optionTxtSelected]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                style={s.textArea}
                value={answers[currentQuestion.id] || ''}
                onChangeText={(t) =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: t }))
                }
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholder={currentQuestion.placeholder || 'Напишите ответ'}
                placeholderTextColor={colors.ink3}
              />
            )}

            <View style={s.actions}>
              <Pressable
                style={[s.navBtn, isFirstQuestion && s.navBtnDisabled]}
                onPress={goToPreviousQuestion}
                disabled={isFirstQuestion}
              >
                <Text style={s.navBtnTxt}>Назад</Text>
              </Pressable>
              <Pressable style={s.primaryBtnFlex} onPress={goToNextQuestion}>
                <Text style={s.primaryBtnTxt}>
                  {isLastQuestion ? 'Завершить тест' : 'Следующий вопрос'}
                </Text>
              </Pressable>
            </View>

            <View style={s.dotRow}>
              {questions.map((q, i) => {
                const answered = Boolean(String(answers[q.id] || '').trim());
                const active = i === questionIndex;
                return (
                  <Pressable
                    key={q.id}
                    style={[s.dot, active && s.dotActive, answered && s.dotAnswered]}
                    onPress={() => {
                      setError('');
                      setQuestionIndex(i);
                    }}
                  >
                    <Text style={[s.dotTxt, (active || answered) && s.dotTxtActive]}>{i + 1}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.body}>Вопросы теста пока не загружены. Попробуйте обновить экран.</Text>
            <Pressable style={s.secondaryBtn} onPress={() => { setLoading(true); void loadSession(); }}>
              <Text style={s.secondaryBtnTxt}>Обновить</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={s.backLink} onPress={() => navigation.navigate('CareerSessions')}>
          <Text style={s.backLinkTxt}>← Все сессии</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
    scroll: { padding: 20, paddingBottom: 40 },
    muted: { color: colors.ink3, fontSize: 15, padding: 20 },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 6 },
    lead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 8, marginBottom: 16 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}11`,
      marginBottom: 16,
    },
    errorText: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      padding: 18,
      backgroundColor: colors.surface2,
      gap: 12,
    },
    cardLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaChip: {
      fontSize: 12,
      color: colors.ink2,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surface,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 4,
    },
    primaryBtnFlex: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnTxt: { color: colors.surface, fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    secondaryBtnTxt: { color: colors.ink, fontSize: 15, fontWeight: '600' },
    tipsBox: {
      marginTop: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    bullet: { fontSize: 14, color: colors.ink2, lineHeight: 22 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginTop: 8,
    },
    skillRow: { gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    skillArea: { fontSize: 15, fontWeight: '700', color: colors.ink },
    levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    levelChip: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    levelChipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    levelChipTxt: { fontSize: 11, color: colors.ink2, fontWeight: '600' },
    levelChipTxtActive: { color: colors.accent },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.line,
      overflow: 'hidden',
    },
    progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
    questionMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    questionPrompt: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 24 },
    hint: { fontSize: 13, color: colors.ink3, lineHeight: 18 },
    options: { gap: 10, marginTop: 4 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      backgroundColor: colors.surface,
    },
    optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: colors.accent },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    optionTxt: { flex: 1, fontSize: 15, color: colors.ink2, lineHeight: 21 },
    optionTxtSelected: { color: colors.ink, fontWeight: '600' },
    textArea: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      minHeight: 140,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface,
      textAlignVertical: 'top',
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    navBtn: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      backgroundColor: colors.surface,
    },
    navBtnDisabled: { opacity: 0.4 },
    navBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.ink },
    dotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    dot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    dotActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    dotAnswered: { borderColor: colors.accent },
    dotTxt: { fontSize: 12, fontWeight: '700', color: colors.ink3 },
    dotTxtActive: { color: colors.accent },
    backLink: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
    backLinkTxt: { fontSize: 15, color: colors.ink2, fontWeight: '600' },
  });
}
