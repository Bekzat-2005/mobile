import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import {
  completeCareerTopic,
  fetchCareerSession,
  generateCareerTopicContent,
  retryCareerRoadmapGeneration,
} from '../../api/career';
import {
  createNotebookNote,
  fetchNotebook,
  updateNotebookNote,
  type NotebookNote,
  type NotebookSourceContext,
} from '../../api/notebook';
import { formatCareerStatus, formatTopicStatus } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerSessionDetail'>;

/** Как на бэкенде career.service TOPIC_REVIEW_PASS_THRESHOLD */
const QUIZ_PASS_PERCENT = 60;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function splitParagraphs(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const blocks = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;
  return t.split('\n').map((p) => p.trim()).filter(Boolean);
}

/** Явно только `locked` блокирует; пустое поле бывает у старых сессий — тогда тема доступна. */
function topicProgressionStatus(topic: Record<string, unknown>): string {
  const raw = topic.progressionStatus;
  if (raw === undefined || raw === null || raw === '') return 'available';
  return String(raw);
}

function countTopicProgress(phases: unknown): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const ph of asArray<Record<string, unknown>>(phases)) {
    for (const mod of asArray<Record<string, unknown>>(ph.modules)) {
      for (const topic of asArray<Record<string, unknown>>(mod.topics)) {
        total++;
        if (topicProgressionStatus(topic) === 'completed') completed++;
      }
    }
  }
  return { total, completed };
}

type TopicEntry = {
  phase: Record<string, unknown>;
  module: Record<string, unknown>;
  topic: Record<string, unknown>;
};

type TopicSheetTab = 'materials' | 'notebook';

function findTopicEntry(sess: Record<string, unknown> | null, topicId: string): TopicEntry | null {
  if (!sess) return null;
  const result = asRecord(sess.result);
  for (const phase of asArray<Record<string, unknown>>(result.phases)) {
    for (const mod of asArray<Record<string, unknown>>(phase.modules)) {
      for (const topic of asArray<Record<string, unknown>>(mod.topics)) {
        if (String(topic.id) === topicId) {
          return { phase, module: mod, topic };
        }
      }
    }
  }
  return null;
}

function findTopicById(sess: Record<string, unknown> | null, topicId: string): Record<string, unknown> | null {
  return findTopicEntry(sess, topicId)?.topic || null;
}

function buildCareerNotebookContext(
  session: Record<string, unknown>,
  entry: TopicEntry,
  sessionId: string,
): NotebookSourceContext {
  const result = asRecord(session.result);
  return {
    sourceType: 'career_roadmap',
    directionLabel: String(session.directionLabel || ''),
    roadmapTitle: String(result.roadmapTitle || ''),
    sectionTitle: String(entry.module.title || ''),
    topicTitle: String(entry.topic.title || ''),
    lessonTitle: String(entry.topic.title || ''),
    pagePath: `/career/sessions/${sessionId}`,
  };
}

function findNotebookNoteForCareer(
  notes: NotebookNote[],
  context: NotebookSourceContext,
): NotebookNote | null {
  const topicTitle = context.topicTitle?.trim();
  const sectionTitle = context.sectionTitle?.trim();
  const directionLabel = context.directionLabel?.trim();
  if (!topicTitle) return null;

  return (
    notes.find((note) => {
      const sc = note.sourceContext;
      if (!sc || sc.sourceType !== 'career_roadmap') return false;
      if ((sc.topicTitle || '').trim() !== topicTitle) return false;
      if (sectionTitle && (sc.sectionTitle || '').trim() !== sectionTitle) return false;
      if (directionLabel && (sc.directionLabel || '').trim() !== directionLabel) return false;
      return note.type === 'manual';
    }) || null
  );
}

export default function CareerSessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const { token, refreshUser } = useAuth();
  const s = styles(colors);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({});
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [topicSheetId, setTopicSheetId] = useState<string | null>(null);
  const [topicSheetError, setTopicSheetError] = useState('');
  const [topicBusy, setTopicBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [quizSelections, setQuizSelections] = useState<Record<string, string>>({});
  const [lastEvaluation, setLastEvaluation] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [topicSheetTab, setTopicSheetTab] = useState<TopicSheetTab>('materials');
  const [noteText, setNoteText] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { session: se } = await fetchCareerSession(sessionId, token);
    setSession(se as Record<string, unknown>);
    setLoading(false);
    setRef(false);
  }, [sessionId, token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  /** Пока ИИ генерирует материалы темы — подтягиваем сессию с сервера. */
  useEffect(() => {
    if (!topicSheetId || !token || !session) return;
    const topic = findTopicById(session, topicSheetId);
    if (!topic) return;
    const gs = String(asRecord(topic.contentGeneration).state || '');
    if (gs !== 'queued' && gs !== 'running') return;
    const id = setInterval(() => {
      void load();
    }, 2500);
    return () => clearInterval(id);
  }, [topicSheetId, token, session, load]);

  const loadNotebookNote = useCallback(async () => {
    if (!token || !session || !topicSheetId) return;
    const entry = findTopicEntry(session, topicSheetId);
    if (!entry) return;

    const context = buildCareerNotebookContext(session, entry, sessionId);
    const defaultTitle = String(entry.topic.title || 'Тема')
      ? `${String(entry.topic.title)}: заметка`
      : 'Заметка';

    setNoteLoading(true);
    try {
      const response = await fetchNotebook(token, {
        search: String(entry.topic.title || ''),
        type: 'manual',
      });
      const existing = findNotebookNoteForCareer(response.notes || [], context);

      if (existing) {
        setNoteId(existing.id);
        setNoteTitle(existing.title || defaultTitle);
        setNoteText(existing.manualNote || '');
      } else {
        setNoteId(null);
        setNoteTitle(defaultTitle);
        setNoteText('');
      }
    } catch (e) {
      setNoteId(null);
      setNoteTitle(defaultTitle);
      setNoteText('');
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось загрузить заметку');
    } finally {
      setNoteLoading(false);
    }
  }, [token, session, topicSheetId, sessionId]);

  useEffect(() => {
    if (topicSheetTab !== 'notebook' || !topicSheetId) return;
    void loadNotebookNote();
  }, [topicSheetTab, topicSheetId, loadNotebookNote]);

  async function saveNotebookNote() {
    if (!token || !session || !topicSheetId) return;
    const entry = findTopicEntry(session, topicSheetId);
    if (!entry) return;

    const trimmed = noteText.trim();
    if (!trimmed) {
      Alert.alert('Пустая заметка', 'Напишите текст перед сохранением.');
      return;
    }

    const context = buildCareerNotebookContext(session, entry, sessionId);
    const title = (noteTitle || `${String(entry.topic.title)}: заметка`).trim();

    setNoteSaving(true);
    try {
      const payload = {
        title,
        manualNote: trimmed,
        tags: [String(entry.topic.title || '')].filter(Boolean),
        sourceContext: context,
      };

      if (noteId) {
        const { note } = await updateNotebookNote(token, noteId, payload);
        setNoteId(note.id);
        setNoteTitle(note.title);
        setNoteText(note.manualNote);
      } else {
        const { note } = await createNotebookNote(token, payload);
        setNoteId(note.id);
        setNoteTitle(note.title);
        setNoteText(note.manualNote);
      }

      Alert.alert('Готово', 'Заметка сохранена в блокнот.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить заметку');
    } finally {
      setNoteSaving(false);
    }
  }

  function openTopicSheet(topicId: string) {
    setTopicSheetError('');
    setLastEvaluation(null);
    setQuizSelections({});
    setTopicSheetTab('materials');
    setNoteText('');
    setNoteId(null);
    setNoteTitle('');
    setTopicSheetId(topicId);
  }

  function closeTopicSheet() {
    setTopicSheetId(null);
    setTopicSheetError('');
    setLastEvaluation(null);
    setQuizSelections({});
    setTopicSheetTab('materials');
    setNoteText('');
    setNoteId(null);
    setNoteTitle('');
  }

  async function handleGenerateTopic() {
    if (!token || !topicSheetId) return;
    setTopicBusy(true);
    setTopicSheetError('');
    try {
      const { session: se } = await generateCareerTopicContent(sessionId, topicSheetId, token);
      setSession(se as Record<string, unknown>);
    } catch (e) {
      setTopicSheetError(e instanceof Error ? e.message : 'Ошибка генерации');
    } finally {
      setTopicBusy(false);
    }
  }

  async function handleSubmitQuiz() {
    if (!token || !topicSheetId || !session) return;
    const t = findTopicById(session, topicSheetId);
    if (!t) return;
    const quizQuestions = asArray<Record<string, unknown>>(t.quizQuestions);
    const answers = quizQuestions.map((q) => ({
      questionId: String(q.id),
      answer: quizSelections[String(q.id)]?.trim() || '',
    }));
    if (answers.some((a) => !a.answer)) {
      setTopicSheetError('Выберите ответ на каждый вопрос');
      return;
    }
    setSubmitBusy(true);
    setTopicSheetError('');
    try {
      const res = await completeCareerTopic(sessionId, topicSheetId, answers, token);
      setSession(res.session as Record<string, unknown>);
      setLastEvaluation({
        passed: res.evaluation.passed,
        score: res.evaluation.score,
        maxScore: res.evaluation.maxScore,
        percentage: res.evaluation.percentage,
      });
      if (res.currentUser) await refreshUser();
    } catch (e) {
      setTopicSheetError(e instanceof Error ? e.message : 'Не удалось отправить ответы');
    } finally {
      setSubmitBusy(false);
    }
  }

  async function retry() {
    if (!token) return;
    setRetrying(true);
    try {
      await retryCareerRoadmapGeneration(sessionId, token);
      await load();
    } finally {
      setRetrying(false);
    }
  }

  function togglePhase(order: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenPhases((prev) => ({ ...prev, [order]: !prev[order] }));
  }

  function toggleModule(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading || !session) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const result = asRecord(session.result);
  const gen = asRecord(session.generation);
  const status = String(session.status || '');
  const phases = asArray<Record<string, unknown>>(result.phases);
  const readinessScore = typeof result.readinessScore === 'number' ? result.readinessScore : null;
  const monthsToReady =
    typeof result.estimatedMonthsToJobReady === 'number' ? result.estimatedMonthsToJobReady : null;

  const { total: topicTotal, completed: topicDone } = countTopicProgress(phases);
  const progressPct = topicTotal > 0 ? Math.round((topicDone / topicTotal) * 100) : 0;

  const statusLabel = formatCareerStatus(status);

  const sheetTopic = topicSheetId ? findTopicById(session, topicSheetId) : null;
  const sheetGen = sheetTopic ? asRecord(sheetTopic.contentGeneration) : {};
  const sheetGenState = String(sheetGen.state || '');
  const sheetQuizQuestions = sheetTopic
    ? asArray<Record<string, unknown>>(sheetTopic.quizQuestions)
    : [];
  const latestAttempt = sheetTopic
    ? (asArray<Record<string, unknown>>(sheetTopic.attempts).slice(-1)[0] as Record<string, unknown> | undefined)
    : undefined;
  const sheetTheorySummary = sheetTopic ? String(sheetTopic.theorySummary || '').trim() : '';
  const sheetTheorySections = sheetTopic
    ? asArray<Record<string, unknown>>(sheetTopic.theorySections)
    : [];
  const hasTheoryContent = Boolean(sheetTheorySummary || sheetTheorySections.length);

  function onEnhanceTheory() {
    Alert.alert('Дополнить теорию', 'Функция будет доступна в следующей версии.');
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={ref}
            onRefresh={() => {
              setRef(true);
              load();
            }}
          />
        }
      >
        <View style={s.headerCard}>
          <Text style={s.h1}>{String(session.directionLabel || '')}</Text>
          {String(session.targetRole || '') ? (
            <Text style={s.sub}>{String(session.targetRole)}</Text>
          ) : null}
          <View style={s.badgeRow}>
            <View style={s.statusPill}>
              <Text style={s.statusPillText}>{statusLabel}</Text>
            </View>
            {readinessScore != null ? (
              <View style={s.metricBadge}>
                <Text style={s.metricBadgeTxt}>Готовность {readinessScore}%</Text>
              </View>
            ) : null}
            {monthsToReady != null && monthsToReady > 0 ? (
              <View style={s.metricBadge}>
                <Text style={s.metricBadgeTxt}>~{monthsToReady} мес.</Text>
              </View>
            ) : null}
          </View>
          {topicTotal > 0 ? (
            <View style={s.progressBlock}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={s.progressCaption}>
                {topicDone}/{topicTotal} тем · {progressPct}%
              </Text>
            </View>
          ) : null}
        </View>

        {gen?.message && status === 'roadmap_generating' ? (
          <Text style={s.genMuted}>{String(gen.message)}</Text>
        ) : null}

        {/* Структура: фазы → модули → темы */}
        {phases.length > 0 ? (
          <View style={s.structureBlock}>
            <Text style={s.structureTitle}>Структура плана</Text>
            <Text style={s.structureHint}>Фазы и темы плана</Text>
            {phases.map((phase, pi) => {
              const order = typeof phase.order === 'number' ? phase.order : pi + 1;
              const open = openPhases[order] ?? pi === 0;
              const modules = asArray<Record<string, unknown>>(phase.modules);
              const durationWeeks =
                typeof phase.durationWeeks === 'number' ? phase.durationWeeks : null;
              return (
                <View key={`phase-${order}`} style={s.phaseCard}>
                  <Pressable style={s.phaseHead} onPress={() => togglePhase(order)}>
                    <View style={s.phaseBadge}>
                      <Text style={s.phaseBadgeText}>{order}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.phaseTitle}>{String(phase.title || `Фаза ${order}`)}</Text>
                      {durationWeeks != null ? (
                        <Text style={s.phaseMeta}>~{durationWeeks} нед.</Text>
                      ) : null}
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.ink3} />
                  </Pressable>
                  {open ? (
                    <View style={s.phaseBody}>
                      {phase.objective ? (
                        <Text style={s.phaseObjective}>{String(phase.objective)}</Text>
                      ) : null}
                      {phase.whyItMatters ? (
                        <View style={s.whyBox}>
                          <Text style={s.whyLabel}>Зачем это важно</Text>
                          <Text style={s.whyText}>{String(phase.whyItMatters)}</Text>
                        </View>
                      ) : null}
                      {asArray<string>(phase.successCriteria).length ? (
                        <Text style={s.miniTitle}>Критерии успеха</Text>
                      ) : null}
                      {asArray<string>(phase.successCriteria).map((c, i) => (
                        <Text key={i} style={s.bulletLineSmall}>
                          ✓ {c}
                        </Text>
                      ))}
                      {asArray<string>(phase.weeklyPlan).length ? (
                        <Text style={[s.miniTitle, { marginTop: 10 }]}>Недельный план</Text>
                      ) : null}
                      {asArray<string>(phase.weeklyPlan).map((w, i) => (
                        <Text key={i} style={s.bulletLineSmall}>
                          {i + 1}. {w}
                        </Text>
                      ))}

                      {modules.map((mod, mi) => {
                        const mKey = `${order}-${mi}`;
                        const mOpen = openModules[mKey] ?? false;
                        const topics = asArray<Record<string, unknown>>(mod.topics);
                        const modPractice = asArray<string>(mod.practiceTasks);
                        const deliverables = asArray<string>(mod.deliverables);
                        return (
                          <View key={mKey} style={s.moduleCard}>
                            <Pressable style={s.moduleHead} onPress={() => toggleModule(mKey)}>
                              <Ionicons name="folder-outline" size={18} color={colors.accent} />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={s.moduleTitle}>{String(mod.title || 'Модуль')}</Text>
                                <Text style={s.moduleMeta}>
                                  {topics.length}{' '}
                                  {topics.length === 1 ? 'тема' : 'тем'}
                                </Text>
                              </View>
                              <Ionicons
                                name={mOpen ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={colors.ink3}
                              />
                            </Pressable>
                            {mOpen ? (
                              <View style={s.moduleBody}>
                                {mod.description ? (
                                  <Text style={s.moduleDesc}>{String(mod.description)}</Text>
                                ) : null}
                                {deliverables.length ? (
                                  <>
                                    <Text style={s.miniTitle}>Результаты модуля</Text>
                                    {deliverables.map((d, i) => (
                                      <Text key={i} style={s.bulletLineSmall}>
                                        ◆ {d}
                                      </Text>
                                    ))}
                                  </>
                                ) : null}
                                {modPractice.length ? (
                                  <>
                                    <Text style={[s.miniTitle, { marginTop: 10 }]}>Практика</Text>
                                    {modPractice.map((p, i) => (
                                      <Text key={i} style={s.practiceLine}>
                                        ▹ {p}
                                      </Text>
                                    ))}
                                  </>
                                ) : null}

                                {topics.map((topic, ti) => {
                                  const st = topicProgressionStatus(topic);
                                  const stLabel = formatTopicStatus(st);
                                  const hours =
                                    typeof topic.estimatedHours === 'number'
                                      ? topic.estimatedHours
                                      : null;
                                  const quizzes = asArray<unknown>(topic.quizQuestions);
                                  const topicPractice = asArray<string>(topic.practiceTasks);
                                  const theoryCount = asArray<unknown>(topic.theorySections).length;
                                  const qaCount = asArray<unknown>(topic.qaItems).length;
                                  return (
                                    <View key={String(topic.id || ti)} style={s.topicCard}>
                                      <View style={s.topicTop}>
                                        <Text style={s.topicOrder}>
                                          {typeof topic.order === 'number' ? topic.order : ti + 1}
                                        </Text>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                          <Text style={s.topicTitle}>{String(topic.title || 'Тема')}</Text>
                                          <View style={s.topicBadges}>
                                            <Text style={[s.topicBadge, st === 'completed' && s.badgeDone]}>
                                              {stLabel}
                                            </Text>
                                            {hours != null ? (
                                              <Text style={s.topicBadgeMuted}>~{hours} ч</Text>
                                            ) : null}
                                          </View>
                                        </View>
                                      </View>
                                      {st !== 'locked' ? (
                                        <Pressable
                                          style={s.topicCta}
                                          onPress={() => openTopicSheet(String(topic.id))}
                                        >
                                          <Ionicons name="school-outline" size={18} color={colors.surface} />
                                          <Text style={s.topicCtaText}>
                                            {st === 'completed'
                                              ? 'Мини-тест и материалы'
                                              : 'Сгенерировать и пройти мини-тест'}
                                          </Text>
                                        </Pressable>
                                      ) : null}
                                      {topic.objective ? (
                                        <Text style={s.topicObjective}>{String(topic.objective)}</Text>
                                      ) : null}
                                      <View style={s.topicMetaRow}>
                                        {theoryCount > 0 ? (
                                          <Text style={s.topicMetaChip}>Теория: {theoryCount}</Text>
                                        ) : null}
                                        {qaCount > 0 ? (
                                          <Text style={s.topicMetaChip}>Q&A: {qaCount}</Text>
                                        ) : null}
                                        {quizzes.length > 0 ? (
                                          <Text style={s.topicMetaChip}>Тест: {quizzes.length} вопр.</Text>
                                        ) : (
                                          <Text style={s.topicMetaChipDim}>Тест: после генерации</Text>
                                        )}
                                      </View>
                                      {topicPractice.length ? (
                                        <>
                                          <Text style={s.topicPracticeTitle}>Задачи</Text>
                                          {topicPractice.map((pt, idx) => (
                                            <Text key={idx} style={s.topicPracticeLine}>
                                              • {pt}
                                            </Text>
                                          ))}
                                        </>
                                      ) : null}
                                      {asArray<string>(topic.completionSignals).length ? (
                                        <>
                                          <Text style={s.topicPracticeTitle}>Сигналы завершения</Text>
                                          {asArray<string>(topic.completionSignals).map((sig, idx) => (
                                            <Text key={idx} style={s.topicPracticeLine}>
                                              ✓ {sig}
                                            </Text>
                                          ))}
                                        </>
                                      ) : null}
                                    </View>
                                  );
                                })}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : status === 'roadmap_ready' && phases.length === 0 ? (
          <View style={s.card}>
            <Text style={s.cardEyebrow}>Структура</Text>
            <Text style={s.body}>
              В ответе сервера нет дерева фаз (поле phases). Попробуйте обновить экран или нажать
              «Повторить генерацию», если план создавался давно.
            </Text>
          </View>
        ) : null}

        {status === 'roadmap_failed' ? (
          <Pressable style={[s.retry, retrying && { opacity: 0.6 }]} disabled={retrying} onPress={retry}>
            <Text style={s.retryTxt}>{retrying ? '…' : 'Повторить генерацию'}</Text>
          </Pressable>
        ) : null}

        <Pressable style={s.secondary} onPress={() => navigation.navigate('CareerSessions')}>
          <Text style={s.secondaryTxt}>Все сессии</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={Boolean(topicSheetId)}
        animationType="slide"
        {...(Platform.OS === 'ios' ? ({ presentationStyle: 'pageSheet' } as const) : {})}
        onRequestClose={closeTopicSheet}
      >
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalHeader}>
            <Pressable onPress={closeTopicSheet} hitSlop={12}>
              <Text style={s.modalClose}>Закрыть</Text>
            </Pressable>
            <Text style={s.modalTitle} numberOfLines={1}>
              {sheetTopic ? String(sheetTopic.title || 'Тема') : ''}
            </Text>
            <View style={{ width: 56 }} />
          </View>

          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {!sheetTopic ? (
              <Text style={s.body}>Тема не найдена.</Text>
            ) : topicProgressionStatus(sheetTopic) === 'locked' ? (
              <Text style={s.body}>Сначала завершите предыдущие темы — эта пока заблокирована.</Text>
            ) : (
              <>
                <View style={s.sheetTabs}>
                  <Pressable
                    style={[s.sheetTab, topicSheetTab === 'materials' && s.sheetTabOn]}
                    onPress={() => setTopicSheetTab('materials')}
                  >
                    <Text style={[s.sheetTabTxt, topicSheetTab === 'materials' && s.sheetTabTxtOn]}>
                      Материалы
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[s.sheetTab, topicSheetTab === 'notebook' && s.sheetTabOn]}
                    onPress={() => setTopicSheetTab('notebook')}
                  >
                    <Text style={[s.sheetTabTxt, topicSheetTab === 'notebook' && s.sheetTabTxtOn]}>
                      Блокнот
                    </Text>
                  </Pressable>
                </View>

                {topicSheetTab === 'notebook' ? (
                  <View style={s.notesPanel}>
                    <Text style={s.notesHint}>
                      Конспект по теме «{String(sheetTopic.title || '')}». Синхронизируется с блокнотом на сайте.
                    </Text>

                    {noteLoading ? (
                      <View style={s.noteLoadingRow}>
                        <ActivityIndicator color={colors.accent} />
                        <Text style={s.noteLoadingTxt}>Загружаем заметку…</Text>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={s.notesInput}
                          value={noteText}
                          onChangeText={setNoteText}
                          placeholder="Напишите свои заметки здесь..."
                          placeholderTextColor={colors.ink3}
                          multiline
                          textAlignVertical="top"
                          editable={!noteSaving}
                        />
                        <Pressable
                          style={[s.saveNoteBtn, (noteSaving || !noteText.trim()) && s.saveNoteBtnOff]}
                          disabled={noteSaving || !noteText.trim()}
                          onPress={() => void saveNotebookNote()}
                        >
                          {noteSaving ? (
                            <ActivityIndicator color={colors.surface} />
                          ) : (
                            <Text style={s.saveNoteBtnTxt}>Сохранить</Text>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}

                {topicSheetTab === 'materials' ? (
                  <>
                <Text style={s.modalHint}>
                  Как на сайте: сначала генерируются материалы и вопросы, затем нужно набрать не менее{' '}
                  {QUIZ_PASS_PERCENT}% правильных ответов, чтобы открылась следующая тема.
                </Text>

                {(sheetGenState === 'queued' || sheetGenState === 'running') && (
                  <View style={s.modalBanner}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={s.modalBannerText}>
                      {String(sheetGen.progressMessage || 'Генерируем материалы…')}
                    </Text>
                  </View>
                )}

                {sheetGenState === 'failed' ? (
                  <View style={s.modalErrBox}>
                    <Text style={s.modalErrTitle}>Ошибка генерации</Text>
                    <Text style={s.modalErrText}>{String(sheetGen.errorMessage || '')}</Text>
                    <Pressable style={s.modalRetryBtn} onPress={handleGenerateTopic} disabled={topicBusy}>
                      <Text style={s.modalRetryTxt}>{topicBusy ? '…' : 'Повторить'}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {sheetGenState !== 'completed' &&
                sheetGenState !== 'queued' &&
                sheetGenState !== 'running' &&
                sheetGenState !== 'failed' ? (
                  <Pressable
                    style={[s.modalPrimary, topicBusy && { opacity: 0.6 }]}
                    onPress={handleGenerateTopic}
                    disabled={topicBusy}
                  >
                    <Text style={s.modalPrimaryTxt}>
                      {topicBusy ? 'Запрос…' : 'Подготовить материалы и мини-тест'}
                    </Text>
                  </Pressable>
                ) : null}

                {sheetGenState === 'completed' && hasTheoryContent ? (
                  <>
                    <View style={s.theorySection}>
                      <View style={s.theoryHead}>
                        <View style={s.theoryHeadText}>
                          <Text style={s.theoryKicker}>теория</Text>
                          <Text style={s.theoryTitle}>Главная идея</Text>
                        </View>
                        <Pressable style={s.theoryEnhanceBtn} onPress={onEnhanceTheory}>
                          <Text style={s.theoryEnhanceBtnTxt}>Дополнить теорию</Text>
                        </Pressable>
                      </View>
                      {sheetTheorySummary ? (
                        <Text style={s.theorySummary}>{sheetTheorySummary}</Text>
                      ) : null}
                    </View>

                    {sheetTheorySections.length > 0 ? (
                      <View style={s.blocksSection}>
                        <Text style={s.blocksTitle}>Разбор по блокам</Text>
                        <View style={s.blocksList}>
                          {sheetTheorySections.map((sec, i) => (
                            <View key={`${String(sec.title || i)}-${i}`} style={s.blockRow}>
                              <Text style={s.blockNum}>{i + 1}</Text>
                              <View style={s.blockBody}>
                                {sec.title ? (
                                  <Text style={s.blockTitle}>{String(sec.title)}</Text>
                                ) : null}
                                {sec.content ? (
                                  <Text style={s.blockText}>{String(sec.content)}</Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {sheetGenState === 'completed' && sheetQuizQuestions.length === 0 ? (
                  <Text style={s.body}>Вопросов теста нет. Обновите сессию или обратитесь в поддержку.</Text>
                ) : null}

                {sheetGenState === 'completed' && sheetQuizQuestions.length > 0 ? (
                  <>
                    <Text style={s.quizSectionTitle}>Мини-тест</Text>

                    {latestAttempt ? (
                      <View style={s.attemptBox}>
                        <Text style={s.attemptTitle}>Последняя попытка</Text>
                        <Text style={s.attemptStats}>
                          {Number(latestAttempt.score)}/{Number(latestAttempt.maxScore)} (
                          {Number(latestAttempt.percentage)}%){' '}
                          {latestAttempt.passed ? '— зачёт' : `— нужно ≥ ${QUIZ_PASS_PERCENT}%`}
                        </Text>
                      </View>
                    ) : null}

                    {lastEvaluation ? (
                      <View
                        style={[
                          s.resultBanner,
                          lastEvaluation.passed ? s.resultOk : s.resultFail,
                        ]}
                      >
                        <Text style={s.resultTitle}>
                          {lastEvaluation.passed ? 'Тема пройдена' : 'Нужно ещё потренироваться'}
                        </Text>
                        <Text style={s.resultSub}>
                          {lastEvaluation.score}/{lastEvaluation.maxScore} ({lastEvaluation.percentage}%)
                        </Text>
                        {lastEvaluation.passed ? (
                          <Text style={s.resultSub}>Следующая тема разблокирована (при необходимости начнётся генерация).</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {sheetQuizQuestions.map((q, qi) => {
                      const qid = String(q.id);
                      const options = asArray<string>(q.options);
                      const selected = quizSelections[qid];
                      return (
                        <View key={qid || String(qi)} style={s.quizBlock}>
                          <Text style={s.quizPrompt}>
                            {typeof q.order === 'number' ? `${q.order}. ` : ''}
                            {String(q.prompt || '')}
                          </Text>
                          {options.map((opt) => (
                            <Pressable
                              key={opt}
                              style={[s.quizOption, selected === opt && s.quizOptionOn]}
                              onPress={() =>
                                setQuizSelections((prev) => ({
                                  ...prev,
                                  [qid]: opt,
                                }))
                              }
                            >
                              <Text style={[s.quizOptionText, selected === opt && s.quizOptionTextOn]}>{opt}</Text>
                            </Pressable>
                          ))}
                        </View>
                      );
                    })}

                    {topicProgressionStatus(sheetTopic) !== 'completed' ? (
                      <Pressable
                        style={[s.modalPrimary, submitBusy && { opacity: 0.6 }]}
                        onPress={handleSubmitQuiz}
                        disabled={submitBusy}
                      >
                        <Text style={s.modalPrimaryTxt}>
                          {submitBusy ? 'Проверка…' : 'Отправить ответы'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={s.bodyMuted}>Тема уже отмечена как завершённая.</Text>
                    )}
                  </>
                ) : null}

                {topicSheetError ? <Text style={s.modalSheetErr}>{topicSheetError}</Text> : null}
                  </>
                ) : null}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, paddingBottom: 48 },
    headerCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 16,
      backgroundColor: colors.surface2,
    },
    h1: { fontSize: 22, fontWeight: '700', color: colors.ink },
    sub: { fontSize: 14, color: colors.ink3, marginTop: 4 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    metricBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    metricBadgeTxt: { fontSize: 11, fontWeight: '600', color: colors.ink2 },
    progressBlock: { marginTop: 14 },
    statusPill: {
      backgroundColor: colors.accentMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusPillText: { fontSize: 13, fontWeight: '700', color: colors.accent },
    gen: { fontSize: 14, color: colors.ink2, marginTop: 10, lineHeight: 20 },
    genMuted: { fontSize: 13, color: colors.ink3, marginTop: 6, lineHeight: 18 },
    sectionHead: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.ink,
      marginTop: 20,
      marginBottom: 10,
      lineHeight: 24,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.surface2,
    },
    cardEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    metricLabel: { fontSize: 14, color: colors.ink2 },
    metricValue: { fontSize: 16, fontWeight: '700', color: colors.ink },
    stageBox: {
      marginTop: 10,
      padding: 10,
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    stageLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 4 },
    stageText: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    bodyGap: { marginTop: 10 },
    bodySmall: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 8 },
    progressBarBg: {
      height: 8,
      backgroundColor: colors.surface3,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    progressCaption: { fontSize: 12, color: colors.ink3, marginTop: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    chipText: { fontSize: 13, color: colors.ink2 },
    bulletLine: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginBottom: 6 },
    bulletLineSmall: { fontSize: 13, color: colors.ink2, lineHeight: 19, marginBottom: 4 },
    structureBlock: { marginTop: 8, marginBottom: 16 },
    structureTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    structureHint: { fontSize: 13, color: colors.ink3, lineHeight: 18, marginBottom: 12 },
    phaseCard: {
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
    phaseHead: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    phaseBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phaseBadgeText: { fontSize: 14, fontWeight: '800', color: colors.accent },
    phaseTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    phaseMeta: { fontSize: 12, color: colors.ink3, marginTop: 2 },
    phaseBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    phaseObjective: { fontSize: 14, color: colors.ink2, lineHeight: 21, marginTop: 10 },
    whyBox: {
      marginTop: 12,
      padding: 10,
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    whyLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 4 },
    whyText: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
    miniTitle: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    moduleCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    moduleHead: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    moduleTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    moduleMeta: { fontSize: 12, color: colors.ink3, marginTop: 2 },
    moduleBody: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    moduleDesc: { fontSize: 13, color: colors.ink2, lineHeight: 19, marginTop: 10 },
    practiceLine: { fontSize: 13, color: colors.ink2, lineHeight: 20, marginBottom: 4 },
    topicCard: {
      marginTop: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    topicTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    topicOrder: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accent,
      minWidth: 22,
      marginTop: 2,
    },
    topicTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    topicBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    topicBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink2,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeDone: { borderColor: colors.success, color: colors.success },
    topicBadgeMuted: { fontSize: 11, color: colors.ink3, marginTop: 2 },
    topicObjective: { fontSize: 13, color: colors.ink2, lineHeight: 19, marginTop: 8 },
    topicMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    topicMetaChip: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.ink,
      backgroundColor: colors.accentMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    topicMetaChipDim: { fontSize: 11, color: colors.ink3 },
    topicPracticeTitle: { fontSize: 12, fontWeight: '700', color: colors.ink, marginTop: 10, marginBottom: 4 },
    topicPracticeLine: { fontSize: 13, color: colors.ink2, lineHeight: 19, marginBottom: 3 },
    topicCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 12,
      backgroundColor: colors.ink,
    },
    topicCtaText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
    modalRoot: { flex: 1, backgroundColor: colors.surface },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    modalClose: { fontSize: 16, color: colors.accent, fontWeight: '600' },
    modalTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink, paddingHorizontal: 8 },
    modalBody: { padding: 16, paddingBottom: 40 },
    sheetTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    sheetTab: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    sheetTabOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    sheetTabTxt: { fontSize: 14, fontWeight: '600', color: colors.ink2 },
    sheetTabTxtOn: { color: colors.ink, fontWeight: '700' },
    notesPanel: { gap: 12 },
    notesHint: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
    noteLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24 },
    noteLoadingTxt: { fontSize: 14, color: colors.ink2, flex: 1 },
    notesInput: {
      minHeight: 220,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
      padding: 14,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    saveNoteBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveNoteBtnOff: { opacity: 0.5 },
    saveNoteBtnTxt: { color: colors.surface, fontWeight: '700', fontSize: 16 },
    modalHint: { fontSize: 14, color: colors.ink2, lineHeight: 21, marginBottom: 16 },
    theorySection: {
      marginBottom: 20,
      paddingLeft: 14,
      borderLeftWidth: 3,
      borderLeftColor: colors.accentMuted,
      gap: 12,
    },
    theoryHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    theoryHeadText: { flex: 1, gap: 4 },
    theoryKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: colors.ink3,
    },
    theoryTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 24 },
    theoryEnhanceBtn: {
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
    },
    theoryEnhanceBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.accent },
    theorySummary: { fontSize: 15, color: colors.ink2, lineHeight: 24 },
    blocksSection: { marginBottom: 24, gap: 14 },
    blocksTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 24 },
    blocksList: { gap: 16 },
    blockRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    blockNum: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.ink3,
      minWidth: 20,
      marginTop: 2,
    },
    blockBody: { flex: 1, gap: 6 },
    blockTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22 },
    blockText: { fontSize: 15, color: colors.ink2, lineHeight: 23 },
    quizSectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 14,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    modalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: colors.accentMuted,
      marginBottom: 16,
    },
    modalBannerText: { flex: 1, fontSize: 14, color: colors.ink2 },
    modalErrBox: {
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 14,
      marginBottom: 16,
      backgroundColor: colors.surface2,
    },
    modalErrTitle: { fontWeight: '700', color: colors.danger, marginBottom: 8 },
    modalErrText: { fontSize: 14, color: colors.ink2, marginBottom: 12 },
    modalRetryBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
    modalRetryTxt: { fontWeight: '600', color: colors.ink },
    modalPrimary: {
      backgroundColor: colors.ink,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    modalPrimaryTxt: { color: colors.surface, fontWeight: '700', fontSize: 16 },
    attemptBox: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      marginBottom: 16,
      backgroundColor: colors.surface2,
    },
    attemptTitle: { fontSize: 12, fontWeight: '700', color: colors.ink3, marginBottom: 4 },
    attemptStats: { fontSize: 14, color: colors.ink },
    resultBanner: { padding: 14, marginBottom: 16 },
    resultOk: { backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accent },
    resultFail: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
    resultTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    resultSub: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    quizBlock: { marginBottom: 20 },
    quizPrompt: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 10, lineHeight: 22 },
    quizOption: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      backgroundColor: colors.surface2,
    },
    quizOptionOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    quizOptionText: { fontSize: 15, color: colors.ink2 },
    quizOptionTextOn: { color: colors.ink, fontWeight: '600' },
    modalSheetErr: { color: colors.danger, marginTop: 12, fontSize: 14 },
    bodyMuted: { fontSize: 14, color: colors.ink3, marginTop: 12 },
    retry: { marginTop: 8, backgroundColor: colors.ink, padding: 14, alignItems: 'center' },
    retryTxt: { color: colors.surface, fontWeight: '700' },
    secondary: { marginTop: 16, borderWidth: 1, borderColor: colors.line, padding: 14, alignItems: 'center' },
    secondaryTxt: { color: colors.ink, fontWeight: '600' },
  });
}
