import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VacanciesStackParamList } from '../../navigation/types';
import { fetchVacancyQA, type VacancyQAItem } from '../../api/vacancies';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<VacanciesStackParamList, 'VacancyInterviewPrep'>;

const CATEGORY_RU: Record<string, string> = {
  technical: 'Технические',
  behavioral: 'Поведенческие',
  situational: 'Ситуационные',
  experience: 'Опыт',
};

const DIFFICULTY_RU: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

const FILTERS = [
  { key: '', label: 'Все' },
  { key: 'technical', label: 'Технические' },
  { key: 'behavioral', label: 'Поведенческие' },
  { key: 'situational', label: 'Ситуационные' },
  { key: 'experience', label: 'Опыт' },
];

export default function VacancyInterviewPrepScreen({ route }: Props) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [qaList, setQaList] = useState<VacancyQAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVacancyQA(id, token);
        setQaList(data.qaList || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const filtered = useMemo(() => {
    if (!filter) return qaList;
    return qaList.filter((item) => item.category === filter);
  }, [qaList, filter]);

  function toggleItem(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.loadingHint}>AI генерирует вопросы для подготовки…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Подготовка к интервью</Text>
        <Text style={s.lead}>
          Вопросы и ответы, сгенерированные AI под эту вакансию. Раскройте карточку, чтобы увидеть рекомендуемый ответ.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key || 'all'}
              style={[s.chip, filter === f.key && s.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Text style={s.muted}>Нет вопросов в выбранной категории.</Text>
        ) : (
          filtered.map((item, index) => {
            const key = String(item._id || index);
            const isOpen = Boolean(expanded[key]);
            return (
              <Pressable key={key} style={s.card} onPress={() => toggleItem(key)}>
                <View style={s.cardHead}>
                  <View style={s.tags}>
                    <Text style={s.tag}>{CATEGORY_RU[item.category] || item.category}</Text>
                    <Text style={s.tagMuted}>{DIFFICULTY_RU[item.difficulty] || item.difficulty}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.ink3}
                  />
                </View>
                <Text style={s.question}>{item.question}</Text>
                {isOpen ? (
                  <View style={s.answerBox}>
                    <Text style={s.answerLabel}>Рекомендуемый ответ</Text>
                    <Text style={s.answer}>{item.answer}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink },
    lead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 8, marginBottom: 16 },
    loadingHint: { fontSize: 14, color: colors.ink3, marginTop: 12 },
    error: { color: colors.danger, padding: 20 },
    filters: { gap: 8, marginBottom: 16 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    chipTxt: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
    chipTxtActive: { color: colors.accent },
    muted: { fontSize: 15, color: colors.ink3 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    tags: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
    tag: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase' },
    tagMuted: { fontSize: 11, color: colors.ink3 },
    question: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 22 },
    answerBox: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    answerLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    answer: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
  });
}
