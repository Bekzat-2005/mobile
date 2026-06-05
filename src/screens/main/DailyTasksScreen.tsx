import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CommunityStackParamList } from '../../navigation/types';
import { LearnChipGrid, LearnFieldLabel } from '../../components/learn/LearnSetupModal';
import {
  fetchDailyTask,
  fetchDailyTaskStatus,
  submitDailyTask,
  type DailyTask,
  type DailyTaskSubmitResult,
} from '../../api/daily-tasks';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<CommunityStackParamList, 'DailyTasks'>;

const DIRECTIONS = [
  { key: 'frontend_engineer', label: 'Фронтенд' },
  { key: 'backend_engineer', label: 'Бэкенд' },
  { key: 'fullstack_engineer', label: 'Фулстек' },
  { key: 'mobile_engineer', label: 'Мобильная разработка' },
  { key: 'qa_automation', label: 'Тестирование' },
  { key: 'data_analyst', label: 'Аналитика данных' },
  { key: 'devops_engineer', label: 'Инфраструктура' },
];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DailyTasksScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token, refreshUser } = useAuth();
  const s = styles(colors);

  const [directionKey, setDirectionKey] = useState(DIRECTIONS[0].key);
  const [task, setTask] = useState<DailyTask | null>(null);
  const [status, setStatus] = useState<{ completed: boolean; submission?: { score: number; maxScore: number; pointsEarned: number } } | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'running' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<DailyTaskSubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  const submittingRef = useRef(submitting);
  answersRef.current = answers;
  submittingRef.current = submitting;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  async function generateTask() {
    setErr('');
    setLoading(true);
    setTask(null);
    setResult(null);
    setPhase('idle');
    setAnswers([]);
    stopTimer();
    try {
      const { task: t } = await fetchDailyTask(directionKey);
      setTask(t);
      setAnswers(new Array(t.questions.length).fill(null));
      setPhase('ready');
      if (token) {
        const st = await fetchDailyTaskStatus(directionKey, token);
        setStatus(st);
        if (st.completed) setPhase('done');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить задание');
    } finally {
      setLoading(false);
    }
  }

  function startTest() {
    if (!task) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы отправить ответы и получить очки.');
      return;
    }
    setPhase('running');
    setTimeLeft(task.timeLimit || 525);
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          void doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function pickAnswer(qIndex: number, optIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  }

  async function doSubmit() {
    if (!token || !task || submittingRef.current) return;
    stopTimer();
    setSubmitting(true);
    setErr('');
    const payload = answersRef.current.map((a) => (a === null ? -1 : a));
    try {
      const res = await submitDailyTask(directionKey, payload, token);
      setResult(res);
      setPhase('done');
      setStatus({
        completed: true,
        submission: { score: res.score, maxScore: res.maxScore, pointsEarned: res.pointsEarned },
      });
      if (res.currentUser) await refreshUser();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  function onDirectionChange(key: string) {
    if (phase === 'running') return;
    setDirectionKey(key);
    setTask(null);
    setStatus(null);
    setResult(null);
    setPhase('idle');
    setAnswers([]);
    setErr('');
    stopTimer();
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Практика</Text>
          <Text style={s.heroTitle}>Ежедневные задания</Text>
          <Text style={s.heroCopy}>
            Четыре вопроса по выбранному направлению. Один короткий тест в день — очки идут в рейтинг.
          </Text>
          <Pressable style={s.linkRow} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={s.link}>Открыть рейтинг</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <LearnFieldLabel>Направление</LearnFieldLabel>
        <LearnChipGrid
          options={DIRECTIONS.map((d) => ({ value: d.key, label: d.label }))}
          value={directionKey}
          onChange={onDirectionChange}
          columns={2}
        />

        <Pressable
          style={[s.genBtn, loading && s.btnDisabled]}
          onPress={() => void generateTask()}
          disabled={loading || phase === 'running'}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={s.genBtnTxt}>
              {task ? 'Обновить задание на сегодня' : 'Сгенерировать задание'}
            </Text>
          )}
        </Pressable>

        {err ? <Text style={s.err}>{err}</Text> : null}

        {status?.completed && !result ? (
          <View style={s.doneBox}>
            <Text style={s.doneTitle}>Задание уже выполнено сегодня</Text>
            <Text style={s.doneSub}>
              {status.submission?.score}/{status.submission?.maxScore} · +
              {status.submission?.pointsEarned} очков
            </Text>
          </View>
        ) : null}

        {result ? (
          <View style={s.resultBox}>
            <Text style={s.resultTitle}>Результат</Text>
            <Text style={s.resultScore}>
              {result.score}/{result.maxScore}
            </Text>
            <Text style={s.resultPts}>+{result.pointsEarned} очков</Text>
            {result.results.map((r, i) => (
              <View key={i} style={s.explainRow}>
                <Text style={r.correct ? s.okMark : s.badMark}>{r.correct ? '✓' : '×'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.explainQ}>{task?.questions[i]?.prompt}</Text>
                  {!r.correct && task?.questions[i]?.options[r.correctIndex] ? (
                    <Text style={s.explainA}>
                      Верно: {task.questions[i].options[r.correctIndex]}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {task && phase === 'ready' && !status?.completed ? (
          <View style={s.readyBox}>
            <Text style={s.readyMeta}>
              {task.questions.length} вопр. · {formatTime(task.timeLimit)} · до{' '}
              {task.questions.length * 25} очков
            </Text>
            <Text style={s.readyHint}>
              После старта начнётся таймер. Пустые ответы засчитываются как неверные.
            </Text>
            <Pressable style={s.startBtn} onPress={startTest}>
              <Text style={s.startBtnTxt}>Начать тест</Text>
            </Pressable>
          </View>
        ) : null}

        {task && phase === 'running' ? (
          <View style={s.quizBox}>
            <View style={[s.timerBar, timeLeft <= 20 && s.timerDanger]}>
              <Text style={s.timerTxt}>{formatTime(timeLeft)}</Text>
            </View>
            {task.questions.map((q, qi) => (
              <View key={qi} style={s.qBlock}>
                <Text style={s.qPrompt}>
                  {qi + 1}. {q.prompt}
                </Text>
                {q.options.map((opt, oi) => (
                  <Pressable
                    key={oi}
                    style={[s.opt, answers[qi] === oi && s.optOn]}
                    onPress={() => pickAnswer(qi, oi)}
                  >
                    <Text style={[s.optTxt, answers[qi] === oi && s.optTxtOn]}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable
              style={[s.submitBtn, submitting && s.btnDisabled]}
              onPress={() => void doSubmit()}
              disabled={submitting}
            >
              <Text style={s.submitBtnTxt}>{submitting ? 'Отправка…' : 'Отправить ответы'}</Text>
            </Pressable>
          </View>
        ) : null}

        {!task && !loading ? (
          <Text style={s.hint}>Выберите направление и нажмите «Сгенерировать задание».</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 16, paddingBottom: 40 },
    hero: {
      paddingBottom: 16,
      marginBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    heroTitle: { fontSize: 26, fontWeight: '800', color: colors.ink },
    heroCopy: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 10 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, alignSelf: 'flex-start' },
    link: { fontSize: 15, fontWeight: '600', color: colors.accent },
    genBtn: {
      backgroundColor: colors.ink,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 12,
    },
    genBtnTxt: { color: colors.surface, fontWeight: '700', fontSize: 15 },
    btnDisabled: { opacity: 0.55 },
    err: { color: colors.danger, marginBottom: 12, fontSize: 14 },
    hint: { color: colors.ink3, fontSize: 14, textAlign: 'center', marginTop: 24 },
    doneBox: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
      padding: 14,
      marginBottom: 12,
    },
    doneTitle: { fontWeight: '700', color: colors.ink },
    doneSub: { marginTop: 6, color: colors.ink2 },
    readyBox: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
      marginTop: 8,
    },
    readyMeta: { fontWeight: '700', color: colors.ink, marginBottom: 8 },
    readyHint: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 14 },
    startBtn: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center' },
    startBtnTxt: { color: colors.surface, fontWeight: '700' },
    quizBox: { marginTop: 12 },
    timerBar: {
      padding: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: 14,
      alignItems: 'center',
    },
    timerDanger: { borderColor: colors.danger, backgroundColor: colors.surface2 },
    timerTxt: { fontSize: 22, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    qBlock: { marginBottom: 18 },
    qPrompt: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 10, lineHeight: 22 },
    opt: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },
    optOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    optTxt: { fontSize: 14, color: colors.ink2 },
    optTxtOn: { color: colors.ink, fontWeight: '600' },
    submitBtn: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    submitBtnTxt: { color: colors.surface, fontWeight: '700' },
    resultBox: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
      marginTop: 8,
    },
    resultTitle: { fontSize: 11, fontWeight: '800', color: colors.ink3, letterSpacing: 1, marginBottom: 8 },
    resultScore: { fontSize: 32, fontWeight: '800', color: colors.accent },
    resultPts: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 12 },
    explainRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    okMark: { color: colors.success, fontWeight: '800', fontSize: 16 },
    badMark: { color: colors.danger, fontWeight: '800', fontSize: 16 },
    explainQ: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    explainA: { fontSize: 13, color: colors.ink3, marginTop: 4 },
  });
}
