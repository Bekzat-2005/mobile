import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  generateStudyLesson,
  generateStudyRoadmap,
  type StudyLessonPayload,
  type StudyRoadmapPayload,
  type StudyRoadmapSection,
  type StudyRoadmapTopic,
} from '../../api/study';
import {
  clearStudyPageState,
  loadStudyPageState,
  saveStudyPageState,
} from '../../lib/study-storage';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'StudyRoadmap'>;

const SUGGESTIONS = ['React', 'TypeScript', 'Node.js', 'Python', 'Vue', 'SQL', 'Docker'];

const DIFFICULTY_RU: Record<string, string> = {
  foundation: 'Основа',
  core: 'База',
  advanced: 'Продвинутый',
};

type TopicEntry = {
  section: StudyRoadmapSection;
  topic: StudyRoadmapTopic;
  order: number;
};

function firstTopicId(roadmap: StudyRoadmapPayload | null): string | null {
  const id = roadmap?.sections?.[0]?.topics?.[0]?.id;
  return id || null;
}

function flattenTopics(roadmap: StudyRoadmapPayload | null): TopicEntry[] {
  if (!roadmap?.sections) return [];
  const out: TopicEntry[] = [];
  (roadmap.sections || []).forEach((section) => {
    (section.topics || []).forEach((topic) => {
      out.push({ section, topic, order: out.length + 1 });
    });
  });
  return out;
}

function splitParagraphs(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const byBlank = t
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return t.split('\n').map((p) => p.trim()).filter(Boolean);
}

function isRoadmapPayload(r: unknown): r is StudyRoadmapPayload {
  return Boolean(r && typeof r === 'object' && Array.isArray((r as StudyRoadmapPayload).sections));
}

export default function StudyRoadmapScreen(_props: Props) {
  const { colors } = useAppTheme();
  const { token, loading: authLoading } = useAuth();
  const s = styles(colors);
  const [direction, setDirection] = useState('React и TypeScript');
  const [lang, setLang] = useState('Russian');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [cached, setCached] = useState<boolean | null>(null);
  const [roadmap, setRoadmap] = useState<StudyRoadmapPayload | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, StudyLessonPayload>>({});
  const [lessonLoadingId, setLessonLoadingId] = useState<string | null>(null);
  const [lessonErr, setLessonErr] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [restoredLabel, setRestoredLabel] = useState<string | null>(null);
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;

  const topicEntries = useMemo(() => flattenTopics(roadmap), [roadmap]);

  const summaryParagraphs = useMemo(
    () => splitParagraphs(roadmap?.roadmapSummary || ''),
    [roadmap?.roadmapSummary],
  );
  const approachParagraphs = useMemo(
    () => splitParagraphs(roadmap?.studyApproach || ''),
    [roadmap?.studyApproach],
  );

  const selectedEntry = useMemo(() => {
    if (!selectedTopicId) return null;
    return topicEntries.find((e) => e.topic.id === selectedTopicId) || null;
  }, [topicEntries, selectedTopicId]);

  const selectedLesson = selectedTopicId ? lessons[selectedTopicId] : undefined;

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSectionIds((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const directionRef = useRef(direction);
  const langRef = useRef(lang);
  directionRef.current = direction;
  langRef.current = lang;

  useEffect(() => {
    if (!token) {
      setStorageHydrated(true);
      return;
    }
    setStorageHydrated(false);
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadStudyPageState();
        if (cancelled || !stored) return;
        if (stored.directionInput) setDirection(stored.directionInput);
        if (stored.preferredLanguage) setLang(stored.preferredLanguage);
        if (stored.roadmap && isRoadmapPayload(stored.roadmap)) {
          setRoadmap(stored.roadmap);
          const tid =
            stored.selectedTopicId && stored.roadmap.sections?.some((sec) =>
              sec.topics?.some((t) => t.id === stored.selectedTopicId),
            )
              ? stored.selectedTopicId
              : firstTopicId(stored.roadmap);
          setSelectedTopicId(tid);
          setLessons(stored.lessonCache || {});
          const firstSectionId = stored.roadmap.sections[0]?.id;
          if (firstSectionId) {
            setExpandedSectionIds({ [firstSectionId]: true });
          }
          const label = stored.roadmap.directionLabel || stored.directionInput.trim();
          if (label) setRestoredLabel(label);
        }
      } finally {
        if (!cancelled) setStorageHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !storageHydrated) return;
    const timer = setTimeout(() => {
      void saveStudyPageState({
        directionInput: direction,
        preferredLanguage: lang,
        roadmap,
        selectedTopicId: selectedTopicId || '',
        lessonCache: lessons,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [token, storageHydrated, direction, lang, roadmap, selectedTopicId, lessons]);

  useEffect(() => {
    if (!token || !roadmap || !selectedTopicId) return;
    if (lessonsRef.current[selectedTopicId]) return;

    let cancelled = false;
    const topicId = selectedTopicId;

    const entry = topicEntries.find((e) => e.topic.id === topicId);
    if (!entry) {
      setLessonLoadingId(null);
      return;
    }

    const idx = topicEntries.findIndex((e) => e.topic.id === topicId);
    const previousTopicTitle = idx > 0 ? topicEntries[idx - 1].topic.title : '';
    const nextTopicTitle =
      idx >= 0 && idx < topicEntries.length - 1 ? topicEntries[idx + 1].topic.title : '';

    setLessonLoadingId(topicId);
    setLessonErr('');

    void (async () => {
      try {
        const { lesson } = await generateStudyLesson(
          {
            direction: (roadmap.directionLabel || directionRef.current).trim(),
            preferredLanguage: langRef.current,
            roadmapTitle: roadmap.roadmapTitle,
            roadmapSummary: roadmap.roadmapSummary,
            section: {
              title: entry.section.title,
              description: entry.section.description,
              outcome: entry.section.outcome,
            },
            topic: entry.topic,
            previousTopicTitle,
            nextTopicTitle,
          },
          token,
        );
        if (!cancelled) {
          setLessons((prev) => ({ ...prev, [topicId]: lesson }));
        }
      } catch (e) {
        if (!cancelled) {
          setLessonErr(e instanceof Error ? e.message : 'Не удалось загрузить урок');
        }
      } finally {
        if (!cancelled) {
          setLessonLoadingId((cur) => (cur === topicId ? null : cur));
        }
      }
    })();

    return () => {
      cancelled = true;
      setLessonLoadingId((cur) => (cur === topicId ? null : cur));
    };
  }, [token, roadmap, selectedTopicId, topicEntries]);

  async function run() {
    if (!token) return;
    setErr('');
    setLoading(true);
    setRoadmap(null);
    setSelectedTopicId(null);
    setLessons({});
    setLessonErr('');
    setCached(null);
    setExpandedSectionIds({});
    try {
      const res = await generateStudyRoadmap(
        { direction: direction.trim(), preferredLanguage: lang },
        token,
      );
      const r = res.roadmap;
      if (!isRoadmapPayload(r)) {
        setErr('Сервер вернул неполный roadmap');
        return;
      }
      setRoadmap(r);
      const first = firstTopicId(r);
      setSelectedTopicId(first);
      setRestoredLabel(null);
      setCached(Boolean(res.generation && (res.generation as { cached?: boolean }).cached));
      const firstSectionId = r.sections[0]?.id;
      if (firstSectionId) {
        setExpandedSectionIds({ [firstSectionId]: true });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function clearSaved() {
    await clearStudyPageState();
    setDirection('React и TypeScript');
    setLang('Russian');
    setRoadmap(null);
    setSelectedTopicId(null);
    setLessons({});
    setLessonErr('');
    setErr('');
    setCached(null);
    setExpandedSectionIds({});
    setRestoredLabel(null);
  }

  if (authLoading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Лаборатория обучения</Text>
          <Text style={s.heroTitle}>Дорожная карта</Text>
          <Text style={s.heroLead}>
            Прогресс сохраняется на устройстве. Серверных «сессий» у лаборатории нет — как в браузере на
            сайте.
          </Text>
        </View>

        {restoredLabel && roadmap ? (
          <View style={s.restoredBanner}>
            <Text style={s.restoredTxt}>Восстановлено: {restoredLabel}</Text>
            <Pressable onPress={() => void clearSaved()} hitSlop={8}>
              <Text style={s.restoredClear}>Очистить</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={s.label}>Направление</Text>
        <TextInput
          style={s.input}
          value={direction}
          onChangeText={setDirection}
          placeholder="React, TypeScript, Node.js, Python…"
          placeholderTextColor={colors.ink3}
        />

        <View style={s.suggestRow}>
          {SUGGESTIONS.map((d) => (
            <Pressable key={d} style={s.suggestChip} onPress={() => setDirection(d)}>
              <Text style={s.suggestTxt}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>Язык материала</Text>
        <View style={s.row}>
          {['Russian', 'English'].map((l) => (
            <Pressable key={l} style={[s.chip, lang === l && s.chipOn]} onPress={() => setLang(l)}>
              <Text style={[s.chipTxt, lang === l && s.chipTxtOn]}>
                {l === 'Russian' ? 'Русский' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[s.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={run}>
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={s.btnTxt}>Собрать дорожную карту</Text>
          )}
        </Pressable>

        {err ? <Text style={s.err}>{err}</Text> : null}
        {cached != null ? (
          <Text style={s.cache}>{cached ? 'Взято из кэша сервера' : 'Сгенерировано заново'}</Text>
        ) : null}

        {roadmap ? (
          <>
            <View style={s.card}>
              <Text style={s.cardEyebrow}>Обзор</Text>
              <Text style={s.outTitle}>{roadmap.roadmapTitle}</Text>
              {summaryParagraphs.map((p, i) => (
                <Text key={`s-${i}`} style={[s.outBody, i > 0 && s.blockGap]}>
                  {p}
                </Text>
              ))}
              <View style={s.metricsRow}>
                <View style={s.metric}>
                  <Text style={s.metricVal}>{roadmap.totalSections ?? roadmap.sections.length}</Text>
                  <Text style={s.metricLbl}>разделов</Text>
                </View>
                <View style={s.metric}>
                  <Text style={s.metricVal}>
                    {roadmap.totalTopics ?? topicEntries.length}
                  </Text>
                  <Text style={s.metricLbl}>тем</Text>
                </View>
                <View style={s.metric}>
                  <Text style={s.metricVal}>{Object.keys(lessons).length}</Text>
                  <Text style={s.metricLbl}>уроков</Text>
                </View>
              </View>
            </View>

            {approachParagraphs.length ? (
              <View style={s.card}>
                <Text style={s.cardEyebrow}>Как проходить</Text>
                {approachParagraphs.map((p, i) => (
                  <Text key={`a-${i}`} style={[s.outBody, i > 0 && s.blockGap]}>
                    {p}
                  </Text>
                ))}
              </View>
            ) : null}

            {roadmap.directionLabel ? (
              <Text style={s.dirLabel}>
                Направление: <Text style={s.dirLabelStrong}>{roadmap.directionLabel}</Text>
              </Text>
            ) : null}

            <Text style={s.sectionListTitle}>Структура</Text>
            {(roadmap.sections || []).map((section) => {
              const open = Boolean(expandedSectionIds[section.id]);
              return (
                <View key={section.id} style={s.sectionBlock}>
                  <Pressable
                    style={[s.sectionHead, open && s.sectionHeadOpen]}
                    onPress={() => toggleSection(section.id)}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.sectionTitle}>{section.title}</Text>
                      {section.outcome ? (
                        <Text style={s.sectionOutcome} numberOfLines={2}>
                          {section.outcome}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={s.chev}>{open ? '▲' : '▼'}</Text>
                  </Pressable>
                  {open ? (
                    <View style={s.sectionBody}>
                      {section.description ? <Text style={s.sectionDesc}>{section.description}</Text> : null}
                      {(section.topics || []).map((topic) => {
                        const entry = topicEntries.find(
                          (e) => e.section.id === section.id && e.topic.id === topic.id,
                        );
                        const order = entry?.order ?? 0;
                        const active = selectedTopicId === topic.id;
                        return (
                          <Pressable
                            key={topic.id}
                            style={[s.topicRow, active && s.topicRowActive]}
                            onPress={() => {
                              setSelectedTopicId(topic.id);
                              setLessonErr('');
                            }}
                          >
                            <Text style={s.topicOrder}>{order}</Text>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={s.topicTitle}>{topic.title}</Text>
                              {topic.summary ? (
                                <Text style={s.topicSum} numberOfLines={2}>
                                  {topic.summary}
                                </Text>
                              ) : null}
                              {topic.keyIdeas && topic.keyIdeas.length > 0 ? (
                                <Text style={s.keyIdeas} numberOfLines={2}>
                                  {topic.keyIdeas.join(' · ')}
                                </Text>
                              ) : null}
                            </View>
                            <View style={s.topicMetaCol}>
                              {topic.difficulty ? (
                                <Text style={s.diffBadge}>
                                  {DIFFICULTY_RU[topic.difficulty] || topic.difficulty}
                                </Text>
                              ) : null}
                              {lessons[topic.id] ? <Text style={s.readyDot}>●</Text> : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {selectedEntry ? (
              <View style={s.lessonCard}>
                <View style={s.lessonHead}>
                  <Text style={s.cardEyebrow}>Урок</Text>
                  <Text style={s.lessonBreadcrumb} numberOfLines={2}>
                    {roadmap.directionLabel || direction} · {selectedEntry.section.title}
                  </Text>
                  <Text style={s.lessonTopicTitle}>{selectedEntry.topic.title}</Text>
                  <Text style={s.stepPill}>
                    Шаг {selectedEntry.order} / {topicEntries.length}
                  </Text>
                </View>

                {selectedEntry.topic.whyItMatters ? (
                  <View style={s.whyBox}>
                    <Text style={s.whyLabel}>Зачем это в работе</Text>
                    <Text style={s.whyText}>{selectedEntry.topic.whyItMatters}</Text>
                  </View>
                ) : null}

                {lessonLoadingId === selectedTopicId ? (
                  <View style={s.lessonState}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={s.lessonStateText}>Готовим теорию и пример кода…</Text>
                  </View>
                ) : null}

                {lessonErr ? <Text style={s.err}>{lessonErr}</Text> : null}

                {selectedLesson ? (
                  <>
                    <Text style={s.lessonH3}>{selectedLesson.lessonTitle || 'Теория'}</Text>
                    {selectedLesson.summary ? <Text style={s.lessonSummary}>{selectedLesson.summary}</Text> : null}

                    {(selectedLesson.theoryBlocks || []).map((block, i) => (
                      <View key={i} style={s.theoryBlock}>
                        {block.title ? <Text style={s.theoryH4}>{block.title}</Text> : null}
                        {block.body ? <Text style={s.outBody}>{block.body}</Text> : null}
                        {block.takeaway ? (
                          <View style={s.takeaway}>
                            <Text style={s.takeawayTxt}>{block.takeaway}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}

                    {selectedLesson.codeExample?.code ? (
                      <View style={s.codeCard}>
                        <View style={s.codeHead}>
                          <Text style={s.codeName}>
                            {selectedLesson.codeExample.filename || 'example'}
                          </Text>
                          <Text style={s.codeLang}>
                            {selectedLesson.codeExample.language || 'code'}
                          </Text>
                        </View>
                        {selectedLesson.codeExample.explanation ? (
                          <Text style={s.codeExpl}>{selectedLesson.codeExample.explanation}</Text>
                        ) : null}
                        <ScrollView
                          horizontal
                          nestedScrollEnabled
                          showsHorizontalScrollIndicator
                          style={s.codeScroll}
                        >
                          <Text selectable style={s.codeText}>
                            {selectedLesson.codeExample.code}
                          </Text>
                        </ScrollView>
                      </View>
                    ) : null}

                    {selectedLesson.codeHighlights && selectedLesson.codeHighlights.length > 0 ? (
                      <View style={s.highlights}>
                        <Text style={s.blockTitle}>На что смотреть в коде</Text>
                        {selectedLesson.codeHighlights.map((h, i) => (
                          <View key={i} style={s.bulletRow}>
                            <Text style={s.bullet}>•</Text>
                            <Text style={s.bulletText}>{h}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {selectedLesson.practiceChecks && selectedLesson.practiceChecks.length > 0 ? (
                      <View style={s.practiceCard}>
                        <Text style={s.blockTitle}>Самопроверка</Text>
                        <Text style={s.practiceSub}>
                          Короткие вопросы, чтобы убедиться, что тема усвоена
                        </Text>
                        {selectedLesson.practiceChecks.map((c, i) => (
                          <View key={i} style={s.checkRow}>
                            <Text style={s.checkNum}>{i + 1}.</Text>
                            <Text style={s.checkText}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {selectedLesson.nextStep ? (
                      <View style={s.nextCard}>
                        <Text style={s.blockTitle}>Следующий шаг</Text>
                        <Text style={s.outBody}>{selectedLesson.nextStep}</Text>
                      </View>
                    ) : null}

                    <View style={s.navRow}>
                      {(() => {
                        const idx = topicEntries.findIndex((e) => e.topic.id === selectedTopicId);
                        const prev = idx > 0 ? topicEntries[idx - 1] : null;
                        const next = idx >= 0 && idx < topicEntries.length - 1 ? topicEntries[idx + 1] : null;
                        return (
                          <>
                            <Pressable
                              style={[s.navBtn, !prev && s.navBtnOff]}
                              disabled={!prev}
                              onPress={() => prev && setSelectedTopicId(prev.topic.id)}
                            >
                              <Text style={[s.navBtnTxt, !prev && s.navBtnTxtOff]}>Назад</Text>
                            </Pressable>
                            <Pressable
                              style={[s.navBtnPrimary, !next && s.navBtnOff]}
                              disabled={!next}
                              onPress={() => next && setSelectedTopicId(next.topic.id)}
                            >
                              <Text style={s.navBtnPrimaryTxt}>
                                {next ? 'Следующая тема' : 'Конец плана'}
                              </Text>
                            </Pressable>
                          </>
                        );
                      })()}
                    </View>
                  </>
                ) : !lessonLoadingId && !lessonErr ? (
                  <Text style={s.mutedSm}>Выберите тему выше, чтобы загрузить урок.</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  const codeFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, paddingBottom: 48 },
    restoredBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    restoredTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    restoredClear: { fontSize: 13, fontWeight: '700', color: colors.accent },
    hero: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    heroTitle: { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
    heroLead: { fontSize: 14, color: colors.ink2, lineHeight: 21, marginTop: 8 },
    muted: { padding: 20, color: colors.ink2 },
    mutedSm: { fontSize: 13, color: colors.ink3, marginTop: 8 },
    label: { fontSize: 12, fontWeight: '600', color: colors.ink3, marginBottom: 8, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      color: colors.ink,
      fontSize: 16,
      minHeight: 48,
      backgroundColor: colors.surface2,
    },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    suggestChip: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    suggestTxt: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: colors.surface,
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    chipTxt: { color: colors.ink, fontWeight: '600' },
    chipTxtOn: { color: colors.ink },
    btn: { marginTop: 20, backgroundColor: colors.ink, padding: 16, alignItems: 'center' },
    btnTxt: { color: colors.surface, fontWeight: '700', fontSize: 16 },
    err: { color: colors.danger, marginTop: 14, fontSize: 14, lineHeight: 20 },
    cache: { fontSize: 12, color: colors.ink3, marginTop: 12 },
    card: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
      padding: 16,
    },
    cardEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.4,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    outTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    outBody: { fontSize: 15, color: colors.ink2, lineHeight: 24 },
    blockGap: { marginTop: 12 },
    metricsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
    metric: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    metricVal: { fontSize: 20, fontWeight: '700', color: colors.ink },
    metricLbl: { fontSize: 11, color: colors.ink3, marginTop: 4, textTransform: 'uppercase' },
    dirLabel: { fontSize: 13, color: colors.ink3, marginTop: 16 },
    dirLabelStrong: { color: colors.ink, fontWeight: '600' },
    sectionListTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink,
      marginTop: 20,
      marginBottom: 10,
    },
    sectionBlock: { marginBottom: 10 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      backgroundColor: colors.surface2,
      gap: 10,
    },
    sectionHeadOpen: { borderBottomWidth: 0, backgroundColor: colors.surface3 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    sectionOutcome: { fontSize: 13, color: colors.ink2, marginTop: 4, lineHeight: 18 },
    chev: { fontSize: 12, color: colors.ink3, marginTop: 4 },
    sectionBody: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.line,
      paddingVertical: 8,
      paddingHorizontal: 6,
      backgroundColor: colors.surface,
    },
    sectionDesc: { fontSize: 13, color: colors.ink2, lineHeight: 19, paddingHorizontal: 8, marginBottom: 8 },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: 10,
    },
    topicRowActive: { backgroundColor: colors.accentMuted },
    topicOrder: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
      minWidth: 22,
      marginTop: 2,
    },
    topicTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    topicSum: { fontSize: 13, color: colors.ink2, marginTop: 4, lineHeight: 18 },
    keyIdeas: { fontSize: 12, color: colors.ink3, marginTop: 4, fontStyle: 'italic' },
    topicMetaCol: { alignItems: 'flex-end', gap: 4 },
    diffBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.ink2,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    readyDot: { fontSize: 10, color: colors.success },
    lessonCard: {
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
    },
    lessonHead: { marginBottom: 12 },
    lessonBreadcrumb: { fontSize: 12, color: colors.ink3, marginBottom: 6 },
    lessonTopicTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
    stepPill: {
      alignSelf: 'flex-start',
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: colors.ink2,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    whyBox: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      paddingLeft: 12,
      marginBottom: 16,
    },
    whyLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 4 },
    whyText: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    lessonState: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
    lessonStateText: { fontSize: 14, color: colors.ink2, flex: 1 },
    lessonH3: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    lessonSummary: { fontSize: 15, color: colors.ink2, lineHeight: 24, marginBottom: 14 },
    theoryBlock: { marginBottom: 14 },
    theoryH4: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    takeaway: {
      marginTop: 8,
      padding: 10,
      backgroundColor: colors.accentMuted,
      borderWidth: 1,
      borderColor: colors.line,
    },
    takeawayTxt: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
    codeCard: {
      marginTop: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    codeHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
    },
    codeName: { fontSize: 13, fontWeight: '600', color: colors.ink },
    codeLang: { fontSize: 11, color: colors.ink3, textTransform: 'uppercase' },
    codeExpl: { fontSize: 13, color: colors.ink2, lineHeight: 19, paddingHorizontal: 12, marginBottom: 8 },
    codeScroll: { maxHeight: 280 },
    codeText: {
      fontFamily: codeFont,
      fontSize: 12,
      lineHeight: 18,
      color: colors.ink,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    highlights: { marginBottom: 16 },
    blockTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    practiceSub: { fontSize: 12, color: colors.ink3, marginBottom: 10 },
    bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    bullet: { color: colors.accent, fontWeight: '700' },
    bulletText: { flex: 1, fontSize: 14, color: colors.ink2, lineHeight: 20 },
    practiceCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      backgroundColor: colors.surface,
      marginBottom: 16,
    },
    checkRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    checkNum: { fontSize: 14, fontWeight: '700', color: colors.accent, width: 22 },
    checkText: { flex: 1, fontSize: 14, color: colors.ink2, lineHeight: 21 },
    nextCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    navBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 12,
      alignItems: 'center',
    },
    navBtnOff: { opacity: 0.45 },
    navBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.ink2 },
    navBtnTxtOff: { color: colors.ink4 },
    navBtnPrimary: {
      flex: 1,
      backgroundColor: colors.ink,
      paddingVertical: 12,
      alignItems: 'center',
    },
    navBtnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: colors.surface },
  });
}
