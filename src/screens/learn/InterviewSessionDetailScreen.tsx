import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { trackAnalyticsEvent } from '../../api/analytics';
import {
  completeInterviewSession,
  fetchInterviewSession,
  startInterviewSession,
  submitInterviewAnswer,
  type InterviewAnswer,
  type InterviewQuestion,
  type InterviewSession,
} from '../../api/interview';
import { formatInterviewStatus, formatSkillLevel } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  requestMicrophonePermission,
  startAudioRecording,
  stopAudioRecording,
  type RecordingHandle,
} from '../../lib/audio-recording';

type Props = NativeStackScreenProps<LearnStackParamList, 'InterviewSessionDetail'>;

type RecordingStatus = 'idle' | 'recording' | 'processing' | 'finished';

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function findAnswer(answers: InterviewAnswer[], questionId: string) {
  return answers.find((a) => a.questionId === questionId) || null;
}

export default function InterviewSessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);

  const recordingRef = useRef<RecordingHandle | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const { session: se } = await fetchInterviewSession(sessionId, token);
    setSession(se);
    const idx = Math.min(
      Number(se.interview?.currentQuestionIndex || 0),
      Math.max((se.interview?.questions?.length || 1) - 1, 0),
    );
    if (se.status !== 'completed') setCurrentIndex(idx);
    else setCurrentIndex(Math.max((se.interview?.questions?.length || 1) - 1, 0));
    setLoading(false);
    setRef(false);
  }, [sessionId, token]);

  useEffect(() => {
    load().catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });
    void requestMicrophonePermission().then(setMicGranted);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [load]);

  const questions = session?.interview?.questions || [];
  const answers = session?.interview?.answers || [];
  const currentQuestion = questions[currentIndex] as InterviewQuestion | undefined;
  const currentAnswer = currentQuestion ? findAnswer(answers, currentQuestion.id) : null;
  const status = String(session?.status || '');
  const isStarted = Boolean(session?.interview?.startedAt);
  const isCompleted = status === 'completed';
  const answeredCount = answers.filter((a) => String(a.transcript || '').trim()).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const maxAccessible = isCompleted
    ? questions.length - 1
    : Math.min(Number(session?.interview?.currentQuestionIndex || 0), questions.length - 1);

  const micDisabled =
    !isStarted ||
    isCompleted ||
    recordingStatus === 'processing' ||
    completing ||
    micGranted === false ||
    Boolean(currentAnswer);

  async function start() {
    if (!token) return;
    setStarting(true);
    setError('');
    try {
      const { session: se } = await startInterviewSession(sessionId, token);
      setSession(se);
      void trackAnalyticsEvent('SESSION_STARTED', { context: 'interview_mode' }, token).catch(() => {});
      void trackAnalyticsEvent(
        'ASSESSMENT_STARTED',
        { domain: se.domainKey, level: se.targetLevel, mode: 'interview' },
        token,
      ).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  function stopTicker() {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  async function processRecording(dataUrl: string, fileName: string) {
    if (!token || !session || !currentQuestion) return;
    setRecordingStatus('processing');
    setError('');
    try {
      const { session: se } = await submitInterviewAnswer(
        sessionId,
        { questionId: currentQuestion.id, audioDataUrl: dataUrl, fileName, language: 'ru' },
        token,
      );
      setSession(se);
      setRecordingStatus('finished');
    } catch (e) {
      setRecordingStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleRecording() {
    if (micDisabled && recordingStatus !== 'recording') return;

    if (recordingStatus === 'recording' && recordingRef.current) {
      stopTicker();
      setRecordingSeconds(0);
      try {
        const { dataUrl, fileName } = await stopAudioRecording(recordingRef.current);
        recordingRef.current = null;
        await processRecording(dataUrl, fileName);
      } catch (e) {
        setRecordingStatus('idle');
        setError(e instanceof Error ? e.message : String(e));
      }
      return;
    }

    const granted = micGranted ?? (await requestMicrophonePermission());
    setMicGranted(granted);
    if (!granted) {
      Alert.alert('Микрофон', 'Разрешите доступ к микрофону в настройках устройства.');
      return;
    }

    setError('');
    setRecordingStatus('recording');
    setRecordingSeconds(0);
    try {
      recordingRef.current = await startAudioRecording();
      tickerRef.current = setInterval(() => setRecordingSeconds((v) => v + 1), 1000);
    } catch (e) {
      setRecordingStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function complete() {
    if (!token || completing) return;
    setCompleting(true);
    setError('');
    try {
      const { session: se } = await completeInterviewSession(sessionId, token);
      setSession(se);
      const score = se.summary?.overallScore;
      void trackAnalyticsEvent(
        'ASSESSMENT_COMPLETED',
        {
          testType: 'interview',
          title: se.interview?.title || 'Режим интервью',
          subtitle: se.domainLabel || se.domainKey,
          category: 'Интервью',
          domain: se.domainKey,
          questionsCount: se.interview?.questions?.length,
          score,
          maxScore: 100,
          percentage: score,
          passed: score != null ? score >= 65 : null,
        },
        token,
      ).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleting(false);
    }
  }

  function openQuestion(index: number) {
    if (index > maxAccessible || recordingStatus === 'recording') return;
    setCurrentIndex(index);
    setRecordingStatus(currentAnswer ? 'finished' : 'idle');
  }

  if (loading || !session) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const intro = session.interview?.introduction || '';
  const levelRu = formatSkillLevel(String(session.targetLevel));

  if (isCompleted) {
    const summary = session.summary;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.h1}>Интервью завершено</Text>
          <Text style={s.score}>{summary?.overallScore ?? '—'}/100</Text>
          {summary?.summary ? <Text style={s.body}>{summary.summary}</Text> : null}
          {(summary?.strengths || []).map((t, i) => (
            <Text key={`s-${i}`} style={s.bulletOk}>✓ {t}</Text>
          ))}
          {(summary?.weaknesses || []).map((t, i) => (
            <Text key={`w-${i}`} style={s.bulletMuted}>→ {t}</Text>
          ))}
          <Pressable style={s.out} onPress={() => navigation.navigate('InterviewHub')}>
            <Text style={s.outTxt}>К списку</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={ref} onRefresh={() => { setRef(true); void load(); }} />}
      >
        <Text style={s.eyebrow}>Режим интервью</Text>
        <Text style={s.h1}>{session.interview?.title || session.domainLabel || 'Интервью'}</Text>
        <Text style={s.meta}>
          {session.domainLabel} · {levelRu}
        </Text>

        {error ? (
          <View style={s.errBox}>
            <Text style={s.errText}>{error}</Text>
          </View>
        ) : null}

        {!isStarted ? (
          <>
            <Text style={s.hint}>
              {questions.length} вопросов · {formatInterviewStatus(status)}
            </Text>
            <Pressable style={[s.btn, starting && s.btnDisabled]} disabled={starting} onPress={start}>
              <Text style={s.btnTxt}>{starting ? 'Запуск…' : 'Начать интервью'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.progressWrap}>
              <View style={s.progressHead}>
                <Text style={s.progressLabel}>
                  {answeredCount}/{questions.length} ответов
                </Text>
                <Text style={s.progressPct}>{progress}%</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.qNav}>
              {questions.map((q, i) => {
                const answered = Boolean(findAnswer(answers, q.id));
                const locked = i > maxAccessible;
                const active = i === currentIndex;
                return (
                  <Pressable
                    key={q.id}
                    style={[
                      s.qPill,
                      active && s.qPillActive,
                      answered && s.qPillDone,
                      locked && s.qPillLocked,
                    ]}
                    onPress={() => openQuestion(i)}
                    disabled={locked}
                  >
                    <Text style={[s.qPillTxt, active && s.qPillTxtActive]}>{i + 1}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {currentQuestion ? (
              <View style={s.questionCard}>
                <Text style={s.qFocus}>{currentQuestion.focusArea || 'Вопрос'}</Text>
                <Text style={s.qPrompt}>{currentQuestion.prompt}</Text>
              </View>
            ) : null}

            <Text style={s.recStatus}>
              {recordingStatus === 'recording'
                ? `Идёт запись ${formatDuration(recordingSeconds)}`
                : recordingStatus === 'processing'
                  ? 'Обрабатываем ответ…'
                  : recordingStatus === 'finished'
                    ? 'Ответ обработан'
                    : 'Готово к записи'}
            </Text>
            <Text style={s.recHint}>
              {micGranted === false
                ? 'Нет доступа к микрофону. Разрешите в настройках.'
                : currentAnswer
                  ? 'Транскрипция и обратная связь готовы. Перейдите к следующему вопросу.'
                  : 'Нажмите на микрофон и ответьте вслух.'}
            </Text>

            <Pressable
              style={[
                s.micBtn,
                recordingStatus === 'recording' && s.micBtnRecording,
                micDisabled && recordingStatus !== 'recording' && s.btnDisabled,
              ]}
              onPress={toggleRecording}
              disabled={micDisabled && recordingStatus !== 'recording'}
            >
              {recordingStatus === 'processing' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons
                  name={recordingStatus === 'recording' ? 'stop' : 'mic'}
                  size={36}
                  color="#fff"
                />
              )}
            </Pressable>

            {currentAnswer?.transcript ? (
              <View style={s.feedbackCard}>
                <Text style={s.feedbackKicker}>Транскрипция</Text>
                <Text style={s.body}>{currentAnswer.transcript}</Text>
                {currentAnswer.feedback ? (
                  <>
                    <Text style={s.feedbackScore}>
                      Оценка: {currentAnswer.feedback.overallScore ?? '—'}/100
                    </Text>
                    {currentAnswer.feedback.explanation ? (
                      <Text style={s.feedbackText}>{currentAnswer.feedback.explanation}</Text>
                    ) : null}
                    {currentAnswer.feedback.improvementSuggestion ? (
                      <Text style={s.feedbackHint}>→ {currentAnswer.feedback.improvementSuggestion}</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}

            {currentIndex < maxAccessible ? (
              <Pressable style={s.out} onPress={() => openQuestion(currentIndex + 1)}>
                <Text style={s.outTxt}>Следующий вопрос</Text>
              </Pressable>
            ) : null}

            {answeredCount === questions.length && questions.length > 0 ? (
              <Pressable style={[s.btn, completing && s.btnDisabled]} onPress={complete} disabled={completing}>
                <Text style={s.btnTxt}>{completing ? 'Завершение…' : 'Завершить интервью'}</Text>
              </Pressable>
            ) : null}
          </>
        )}

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
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 16, paddingBottom: 48 },
    eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: colors.ink3, textTransform: 'uppercase' },
    h1: { fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 4 },
    meta: { fontSize: 15, color: colors.ink2, marginTop: 8 },
    body: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 12 },
    hint: { fontSize: 14, color: colors.ink3, marginTop: 12 },
    score: { fontSize: 40, fontWeight: '800', color: colors.accent, marginVertical: 12 },
    bulletOk: { fontSize: 14, color: colors.ink2, marginTop: 4 },
    bulletMuted: { fontSize: 14, color: colors.ink3, marginTop: 4 },
    errBox: { backgroundColor: colors.accentMuted, padding: 12, marginTop: 12 },
    errText: { color: colors.danger, fontSize: 14 },
    progressWrap: { marginTop: 16 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
    progressPct: { fontSize: 13, color: colors.ink3 },
    progressTrack: { height: 6, backgroundColor: colors.line },
    progressFill: { height: '100%', backgroundColor: colors.accent },
    qNav: { gap: 8, marginTop: 16, marginBottom: 8 },
    qPill: {
      width: 36,
      height: 36,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface2,
    },
    qPillActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    qPillDone: { borderColor: colors.accent },
    qPillLocked: { opacity: 0.35 },
    qPillTxt: { fontWeight: '700', color: colors.ink2 },
    qPillTxtActive: { color: colors.accent },
    questionCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
      marginTop: 8,
    },
    qFocus: { fontSize: 11, fontWeight: '800', color: colors.accent, textTransform: 'uppercase' },
    qPrompt: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 26, marginTop: 8 },
    recStatus: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 20, textAlign: 'center' },
    recHint: { fontSize: 13, color: colors.ink3, marginTop: 6, textAlign: 'center', lineHeight: 18 },
    micBtn: {
      alignSelf: 'center',
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    micBtnRecording: { backgroundColor: colors.danger },
    feedbackCard: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginTop: 20,
      backgroundColor: colors.surface2,
    },
    feedbackKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    feedbackScore: { fontSize: 16, fontWeight: '800', color: colors.accent, marginTop: 10 },
    feedbackText: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginTop: 6 },
    feedbackHint: { fontSize: 13, color: colors.ink3, marginTop: 6 },
    btn: { marginTop: 20, backgroundColor: colors.ink, padding: 14, alignItems: 'center' },
    btnTxt: { color: colors.surface, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },
    out: { marginTop: 16, borderWidth: 1, borderColor: colors.line, padding: 14, alignItems: 'center' },
    outTxt: { color: colors.ink, fontWeight: '600' },
  });
}
