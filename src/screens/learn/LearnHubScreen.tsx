import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { loadStudyPageState, studyResumeLabel } from '../../lib/study-storage';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'LearnHub'>;

type HubTarget =
  | 'CareerDirections'
  | 'SkillDomains'
  | 'StudyRoadmap'
  | 'InterviewHub'
  | 'Analytics';

type CardItem = {
  title: string;
  subtitle: string;
  detail: string;
  target: HubTarget;
  icon: keyof typeof Ionicons.glyphMap;
  sessionsTarget?: 'CareerSessions' | 'SkillSessions';
  /** Лаборатория: прогресс на устройстве, не серверные сессии */
  localProgress?: boolean;
};

const cards: CardItem[] = [
  {
    title: 'План развития',
    subtitle: 'Дорожная карта и путь обучения',
    detail:
      'Карьерная оценка, персональный маршрут по фазам и темам, мини-тесты и разблокировка следующих блоков.',
    target: 'CareerDirections',
    icon: 'git-branch-outline',
    sessionsTarget: 'CareerSessions',
  },
  {
    title: 'Оценка навыков',
    subtitle: 'Проверка навыков и тесты',
    detail:
      'Выберите домен и уровень — ИИ сгенерирует тест из 8–10 вопросов и даст разбор сильных и слабых зон.',
    target: 'SkillDomains',
    icon: 'speedometer-outline',
    sessionsTarget: 'SkillSessions',
  },
  {
    title: 'Лаборатория обучения',
    subtitle: 'Теория и код по выбранным темам',
    detail:
      'Введите технологию — получите roadmap, теорию и примеры кода. Прогресс сохраняется на этом устройстве (как на сайте в браузере).',
    target: 'StudyRoadmap',
    icon: 'book-outline',
    localProgress: true,
  },
  {
    title: 'Режим интервью',
    subtitle: 'Голосовые ответы и AI-обратная связь',
    detail: 'Тренировка интервью: вопросы по роли, ответы текстом или голосом, оценка и рекомендации.',
    target: 'InterviewHub',
    icon: 'mic-outline',
  },
  {
    title: 'Аналитика',
    subtitle: 'Прогресс и история тестов',
    detail:
      'Метрики активности, история прохождений, пересчёт показателей и ИИ-разбор сильных и слабых зон.',
    target: 'Analytics',
    icon: 'stats-chart-outline',
  },
];

export default function LearnHubScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token, user } = useAuth();
  const s = styles(colors);
  const [studyResume, setStudyResume] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setStudyResume(null);
        return;
      }
      void loadStudyPageState().then((state) => {
        setStudyResume(studyResumeLabel(state));
      });
    }, [token]),
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Обучение</Text>
          <Text style={s.heroTitle}>Развитие</Text>
          <Text style={s.heroCopy}>
            План, оценка навыков, лаборатория, интервью и аналитика — те же инструменты, что на сайте Skillo. AI-ассистент всегда доступен через кнопку внизу экрана.
          </Text>
          {user ? (
            <Text style={s.sessionLine}>
              Вы вошли как <Text style={s.sessionStrong}>@{user.username || user.email}</Text>
            </Text>
          ) : null}
        </View>

        {!token ? (
          <View style={s.warnBox}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
            <Text style={s.warnTxt}>Войдите в аккаунт, чтобы создавать сессии и сохранять прогресс.</Text>
          </View>
        ) : null}

        <Text style={[s.sectionKicker, { marginTop: 16, marginBottom: 12, marginHorizontal: 20 }]}>
          Инструменты
        </Text>

        {cards.map((c) => (
          <View key={c.target} style={s.cardWrap}>
            <Pressable
              style={({ pressed }) => [s.card, pressed && { opacity: 0.88 }]}
              onPress={() => navigation.navigate(c.target)}
            >
              <View style={s.cardIcon}>
                <Ionicons name={c.icon} size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{c.title}</Text>
                <Text style={s.cardSub}>{c.subtitle}</Text>
                <Text style={s.cardDetail}>{c.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink3} />
            </Pressable>
            {c.sessionsTarget && token ? (
              <Pressable style={s.sessionsLink} onPress={() => navigation.navigate(c.sessionsTarget!)}>
                <Text style={s.sessionsLinkTxt}>Мои сессии →</Text>
              </Pressable>
            ) : null}
            {c.localProgress && token && studyResume ? (
              <Pressable style={s.resumeLink} onPress={() => navigation.navigate('StudyRoadmap')}>
                <Ionicons name="play-circle-outline" size={18} color={colors.accent} />
                <Text style={s.resumeLinkTxt}>Продолжить: {studyResume}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    body: { paddingBottom: 40 },
    hero: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
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
    heroTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
    heroCopy: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 10 },
    sessionLine: { fontSize: 14, color: colors.ink3, marginTop: 12 },
    sessionStrong: { fontWeight: '700', color: colors.ink },
    warnBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    warnTxt: { flex: 1, fontSize: 14, color: colors.ink2, lineHeight: 20 },
    sectionKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    cardWrap: { marginHorizontal: 20, marginBottom: 12 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
      gap: 12,
    },
    cardIcon: { width: 44, alignItems: 'center', paddingTop: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    cardSub: { fontSize: 13, fontWeight: '600', color: colors.accent, marginTop: 4 },
    cardDetail: { fontSize: 13, color: colors.ink2, marginTop: 8, lineHeight: 19 },
    sessionsLink: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.line,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      alignItems: 'flex-end',
    },
    sessionsLinkTxt: { fontSize: 13, fontWeight: '600', color: colors.accent },
    resumeLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.line,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.accentMuted,
    },
    resumeLinkTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.accent },
  });
}
