import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

const HERO_LINES = ['Учись точнее.', 'Двигайся быстрее.', 'Без хаоса.'];
const HERO_LEDE =
  'Персональный план развития, который начинается с твоего уровня и держит фокус на следующем важном шаге.';
const HERO_META = ['оценка уровня', 'личный маршрут', 'практика по шагам'];

const OVERVIEW = [
  {
    eyebrow: 'Диагностика',
    title: 'Сначала уровень.',
    text: 'Skillo фиксирует текущие навыки, цель и темп. Маршрут начинается с твоей реальной точки.',
  },
  {
    eyebrow: 'Порядок',
    title: 'Потом структура.',
    text: 'Темы идут последовательно: что учить сейчас, что отложить и где проверить прогресс.',
  },
  {
    eyebrow: 'Действие',
    title: 'Затем практика.',
    text: 'Каждый блок заканчивается задачей, тестом, мини-проектом или разбором ошибки.',
  },
];

const ROADMAP = [
  { number: '01', title: 'Цель', text: 'Выбери роль, уровень и реальный график обучения.' },
  { number: '02', title: 'Оценка', text: 'Проверь сильные и слабые темы без лишней анкеты.' },
  { number: '03', title: 'План', text: 'Получай короткий маршрут с понятным следующим шагом.' },
  { number: '04', title: 'Контроль', text: 'Тесты и аналитика показывают, когда пора двигаться дальше.' },
];

const TOOLS = [
  { title: 'План развития', text: 'Маршрут под роль, уровень и свободное время.' },
  { title: 'Лаборатория обучения', text: 'Быстрая теория и код по любой технологии.' },
  { title: 'Режим интервью', text: 'Голосовая тренировка с обратной связью после ответа.' },
  { title: 'Аналитика', text: 'История тестов, слабые темы и следующий фокус.' },
];

const RHYTHM = [
  { label: 'Сегодня', text: 'Один следующий шаг вместо списка из десятков тем.' },
  { label: 'Неделя', text: 'Понятный темп, который можно держать без выгорания.' },
  { label: 'Проверка', text: 'Короткие тесты показывают, где уже можно идти дальше.' },
];

export default function HomeScreen() {
  const navigation = useNavigation<{
    navigate: (name: 'Login' | 'Register' | 'Vacancies' | 'Community' | 'Learn', params?: object) => void;
  }>();
  const { colors, toggle, mode } = useAppTheme();
  const { user, token } = useAuth();

  const heroBg = mode === 'dark' ? colors.surface2 : colors.ink;
  const heroFg = mode === 'dark' ? colors.ink : colors.surface;
  const heroLede = mode === 'dark' ? colors.ink2 : 'rgba(255,255,255,0.72)';
  const heroMetaFg = mode === 'dark' ? colors.ink2 : 'rgba(255,255,255,0.88)';
  const heroMetaBorder = mode === 'dark' ? colors.line : 'rgba(255,255,255,0.22)';

  const s = styles(colors, heroBg, heroFg, heroLede, heroMetaFg, heroMetaBorder);

  const openAuth = (screen: 'Login' | 'Register') => {
    navigation.navigate(screen);
  };

  const goVacancies = () => navigation.navigate('Vacancies');
  const goCommunity = () => navigation.navigate('Community', { screen: 'CommunityFeed' });
  const goLearnHub = () => navigation.navigate('Learn', { screen: 'LearnHub' });
  const goCareer = () => navigation.navigate('Learn', { screen: 'CareerDirections' });
  const goInterview = () => navigation.navigate('Learn', { screen: 'InterviewHub' });

  const displayName = user?.username || user?.email || 'пользователь';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topbar}>
        <Text style={s.logo}>Skillo</Text>
        <Pressable onPress={toggle} hitSlop={12} accessibilityLabel="Переключить тему">
          <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.heroKicker}>Skillo</Text>
          {HERO_LINES.map((line) => (
            <Text key={line} style={s.heroLine}>
              {line}
            </Text>
          ))}
          <Text style={s.heroLede}>{HERO_LEDE}</Text>

          <View style={s.heroActions}>
            {user ? (
              <>
                <Pressable style={s.heroBtnPrimary} onPress={goCareer}>
                  <Text style={s.heroBtnPrimaryTxt}>Открыть дорожную карту</Text>
                </Pressable>
                <Pressable style={s.heroBtnSecondary} onPress={goCommunity}>
                  <Text style={s.heroBtnSecondaryTxt}>Сообщество</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={s.heroBtnPrimary} onPress={() => openAuth('Register')}>
                  <Text style={s.heroBtnPrimaryTxt}>Начать бесплатно</Text>
                </Pressable>
                <Pressable style={s.heroBtnSecondary} onPress={() => openAuth('Login')}>
                  <Text style={s.heroBtnSecondaryTxt}>Войти</Text>
                </Pressable>
              </>
            )}
          </View>

          {!user ? (
            <Pressable onPress={() => openAuth('Login')} style={s.quietLink}>
              <Text style={s.quietLinkTxt}>Уже есть аккаунт</Text>
            </Pressable>
          ) : (
            <Text style={s.sessionLine}>
              Вы вошли как <Text style={s.sessionStrong}>@{displayName}</Text>
            </Text>
          )}

          <View style={s.metaRow}>
            {HERO_META.map((item) => (
              <View key={item} style={s.metaChip}>
                <Text style={s.metaChipTxt}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionKicker}>Система</Text>
          <Text style={s.sectionTitle}>Минимум шума. Максимум ясности.</Text>
          <Text style={s.sectionLead}>
            Главная задача Skillo — убрать хаос из обучения и оставить понятный порядок: где ты сейчас, что делать
            дальше и как проверить результат.
          </Text>
          {OVERVIEW.map((item) => (
            <View key={item.title} style={s.card}>
              <Text style={s.cardEyebrow}>{item.eyebrow}</Text>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={[s.section, s.sectionDark]}>
          <Text style={[s.sectionKicker, s.onDarkMuted]}>Маршрут</Text>
          <Text style={[s.sectionTitle, s.onDark]}>План должен быть коротким и проверяемым.</Text>
          <Text style={[s.sectionLead, s.onDarkSoft]}>
            Не каталог курсов и не бесконечный список ссылок. Только последовательность шагов, которую можно выполнять
            и измерять.
          </Text>
          {ROADMAP.map((item) => (
            <View key={item.number} style={s.roadRow}>
              <Text style={s.roadNum}>{item.number}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.roadTitle, s.onDark]}>{item.title}</Text>
                <Text style={[s.roadText, s.onDarkSoft]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionKicker}>Инструменты</Text>
          <Text style={s.sectionTitle}>Все рабочие экраны в одном ритме.</Text>
          <View style={s.toolsGrid}>
            {TOOLS.map((tool) => (
              <View key={tool.title} style={s.toolCell}>
                <Text style={s.toolTitle}>{tool.title}</Text>
                <Text style={s.toolText}>{tool.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[s.section, s.sectionDark]}>
          <Text style={[s.sectionKicker, s.onDarkMuted]}>Процесс</Text>
          <Text style={[s.sectionTitle, s.onDark]}>Ритм, который не перегружает.</Text>
          {RHYTHM.map((item) => (
            <View key={item.label} style={s.rhythmCard}>
              <Text style={[s.rhythmLabel, s.onDarkMuted]}>{item.label}</Text>
              <Text style={[s.rhythmText, s.onDark]}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={[s.section, s.finalBand]}>
          <Text style={s.sectionKicker}>Старт</Text>
          <Text style={s.sectionTitle}>Получить первый план можно сегодня.</Text>
          <View style={s.rowBtns}>
            {user ? (
              <>
                <Pressable style={s.primary} onPress={goCareer}>
                  <Text style={s.primaryText}>Открыть дорожную карту</Text>
                </Pressable>
                <Pressable style={s.outline} onPress={goLearnHub}>
                  <Text style={s.outlineText}>Развитие</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={s.primary} onPress={() => openAuth('Register')}>
                  <Text style={s.primaryText}>Начать бесплатно</Text>
                </Pressable>
                <Pressable style={s.outline} onPress={() => openAuth('Login')}>
                  <Text style={s.outlineText}>Войти</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {user ? (
          <View style={s.quickRow}>
            <Pressable style={s.quickChip} onPress={goVacancies}>
              <Ionicons name="briefcase-outline" size={18} color={colors.accent} />
              <Text style={s.quickChipTxt}>Вакансии</Text>
            </Pressable>
            <Pressable style={s.quickChip} onPress={goCommunity}>
              <Ionicons name="people-outline" size={18} color={colors.accent} />
              <Text style={s.quickChipTxt}>Сообщество</Text>
            </Pressable>
            <Pressable style={s.quickChip} onPress={goInterview}>
              <Ionicons name="mic-outline" size={18} color={colors.accent} />
              <Text style={s.quickChipTxt}>Интервью</Text>
            </Pressable>
          </View>
        ) : null}

        {!token ? (
          <Text style={s.hint}>Без входа доступны вакансии и лента сообщества (публично).</Text>
        ) : null}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  heroBg: string,
  heroFg: string,
  heroLede: string,
  heroMetaFg: string,
  heroMetaBorder: string,
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    topbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    logo: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
    scroll: { paddingBottom: 32 },
    hero: {
      backgroundColor: heroBg,
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 32,
      alignItems: 'center',
    },
    heroKicker: { fontSize: 13, fontWeight: '600', color: heroMetaFg, opacity: 0.85, marginBottom: 10 },
    heroLine: {
      fontSize: 32,
      fontWeight: '800',
      color: heroFg,
      lineHeight: 36,
      textAlign: 'center',
      letterSpacing: -0.8,
    },
    heroLede: {
      fontSize: 16,
      color: heroLede,
      lineHeight: 24,
      textAlign: 'center',
      marginTop: 18,
      maxWidth: 400,
    },
    heroActions: { marginTop: 22, width: '100%', maxWidth: 400, gap: 10 },
    heroBtnPrimary: {
      backgroundColor: modePrimaryBtnBg(heroBg, colors),
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: modePrimaryBtnBorder(heroBg, colors),
    },
    heroBtnPrimaryTxt: {
      color: modePrimaryBtnTxt(heroBg, colors),
      fontWeight: '700',
      fontSize: 15,
    },
    heroBtnSecondary: {
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: heroMetaBorder,
      backgroundColor: 'transparent',
    },
    heroBtnSecondaryTxt: { color: heroFg, fontWeight: '600', fontSize: 15 },
    quietLink: { marginTop: 14, paddingVertical: 6 },
    quietLinkTxt: { fontSize: 14, color: heroMetaFg, textAlign: 'center' },
    sessionLine: { marginTop: 14, fontSize: 14, color: heroMetaFg, textAlign: 'center' },
    sessionStrong: { fontWeight: '700', color: heroFg },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 22,
      width: '100%',
    },
    metaChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: heroMetaBorder,
    },
    metaChipTxt: { fontSize: 12, fontWeight: '600', color: heroMetaFg },
    section: { paddingHorizontal: 20, paddingVertical: 28 },
    sectionDark: {
      backgroundColor: '#000000',
    },
    sectionKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.ink,
      lineHeight: 30,
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    sectionLead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginBottom: 20 },
    onDark: { color: '#ffffff' },
    onDarkSoft: { color: 'rgba(255,255,255,0.72)' },
    onDarkMuted: { color: 'rgba(255,255,255,0.5)' },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginBottom: 12,
      backgroundColor: colors.surface2,
    },
    cardEyebrow: { fontSize: 12, fontWeight: '700', color: colors.ink3, marginBottom: 6 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 8, lineHeight: 24 },
    cardText: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    roadRow: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255,255,255,0.18)',
    },
    roadNum: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.45)', width: 36 },
    roadTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    roadText: { fontSize: 14, lineHeight: 20 },
    toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    toolCell: {
      width: '48%',
      flexGrow: 1,
      minWidth: '46%',
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      backgroundColor: colors.surface2,
    },
    toolTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 8 },
    toolText: { fontSize: 13, color: colors.ink2, lineHeight: 19 },
    rhythmCard: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      padding: 16,
      marginBottom: 10,
      minHeight: 100,
      justifyContent: 'space-between',
    },
    rhythmLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
    rhythmText: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
    finalBand: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      alignItems: 'center',
    },
    rowBtns: { marginTop: 8, width: '100%', maxWidth: 400, gap: 10 },
    primary: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center' },
    primaryText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
    outline: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface2,
    },
    outlineText: { color: colors.ink, fontWeight: '600', fontSize: 15 },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    quickChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    quickChipTxt: { fontSize: 14, fontWeight: '600', color: colors.ink },
    hint: { marginTop: 20, marginHorizontal: 20, fontSize: 13, color: colors.ink3, lineHeight: 18, textAlign: 'center' },
  });
}

function modePrimaryBtnBg(heroBg: string, colors: ReturnType<typeof useAppTheme>['colors']) {
  return heroBg === colors.ink ? colors.surface : colors.ink;
}
function modePrimaryBtnBorder(heroBg: string, colors: ReturnType<typeof useAppTheme>['colors']) {
  return heroBg === colors.ink ? colors.surface : colors.ink;
}
function modePrimaryBtnTxt(heroBg: string, colors: ReturnType<typeof useAppTheme>['colors']) {
  return heroBg === colors.ink ? colors.ink : colors.surface;
}
