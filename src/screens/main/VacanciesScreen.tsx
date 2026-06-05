import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { Vacancy } from '../../api/vacancies';
import { fetchVacancies } from '../../api/vacancies';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

const LEVEL_OPTIONS = [
  { key: '', label: 'Все уровни' },
  { key: 'intern', label: 'Стажёр' },
  { key: 'junior', label: 'Джуниор' },
  { key: 'middle', label: 'Мидл' },
  { key: 'senior', label: 'Сеньор' },
  { key: 'lead', label: 'Лид' },
];

const FORMAT_OPTIONS = [
  { key: '', label: 'Все форматы' },
  { key: 'remote', label: 'Удалённо' },
  { key: 'onsite', label: 'Офис' },
  { key: 'hybrid', label: 'Гибрид' },
];

const LEVEL_RU: Record<string, string> = {
  intern: 'Стажёр',
  junior: 'Джуниор',
  middle: 'Мидл',
  senior: 'Сеньор',
  lead: 'Лид',
};

const FORMAT_RU: Record<string, string> = {
  remote: 'Удалённо',
  onsite: 'Офис',
  hybrid: 'Гибрид',
};

function vacancyKey(v: Vacancy) {
  return String(v.id ?? v._id ?? '');
}

function levelLabel(key?: string) {
  if (!key) return '';
  return LEVEL_RU[key] || key;
}

function formatLabel(key?: string) {
  if (!key) return '';
  return FORMAT_RU[key] || key;
}

function salaryText(v: Vacancy): string | null {
  const min = typeof v.salaryMin === 'number' ? v.salaryMin : null;
  const max = typeof v.salaryMax === 'number' ? v.salaryMax : null;
  const cur = String(v.currency || 'USD');
  if (!min && !max) return null;
  if (min && max) return `${min}–${max} ${cur}`;
  if (min) return `от ${min} ${cur}`;
  return `до ${max} ${cur}`;
}

function skillsOf(v: Vacancy): string[] {
  return Array.isArray(v.skills) ? v.skills.map(String) : [];
}

export default function VacanciesScreen({
  navigation,
}: {
  navigation: { navigate: (n: string, p?: { id: string }) => void };
}) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params: { limit: number; experienceLevel?: string } = { limit: 40 };
      if (levelFilter) params.experienceLevel = levelFilter;
      const { vacancies } = await fetchVacancies(params, token);
      setItems(vacancies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, levelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(
    () => items.filter((item) => !formatFilter || item.type === formatFilter),
    [items, formatFilter],
  );

  const hasFilters = Boolean(levelFilter || formatFilter);

  function clearFilters() {
    setLevelFilter('');
    setFormatFilter('');
  }

  const s = styles(colors);

  const listHeader = (
    <>
      <View style={s.hero}>
        <Text style={s.heroEyebrow}>Карьера</Text>
        <Text style={s.heroTitle}>Вакансии</Text>
        <Text style={s.heroCopy}>
          Найдите подходящую позицию и пройдите AI-оценку навыков прямо на платформе.
        </Text>
        {!token ? (
          <View style={s.hintBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={s.hintBannerTxt}>Список доступен без входа. Для отклика нужен аккаунт.</Text>
          </View>
        ) : null}
      </View>

      <View style={s.filtersBlock}>
        <Text style={s.filterGroupLabel}>Уровень</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {LEVEL_OPTIONS.map((option) => {
            const active = levelFilter === option.key;
            return (
              <Pressable
                key={`level-${option.key || 'all'}`}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setLevelFilter(option.key)}
              >
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[s.filterGroupLabel, { marginTop: 14 }]}>Формат</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {FORMAT_OPTIONS.map((option) => {
            const active = formatFilter === option.key;
            return (
              <Pressable
                key={`format-${option.key || 'all'}`}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setFormatFilter(option.key)}
              >
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {hasFilters ? (
          <Pressable style={s.clearBtn} onPress={clearFilters}>
            <Text style={s.clearBtnText}>Сбросить фильтры</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.boardHead}>
        <View>
          <Text style={s.boardKicker}>Доска</Text>
          <Text style={s.boardHint}>
            {filteredItems.length}{' '}
            {filteredItems.length === 1 ? 'вакансия' : filteredItems.length < 5 ? 'вакансии' : 'вакансий'}
          </Text>
        </View>
        <Pressable
          style={s.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
          hitSlop={10}
        >
          <Ionicons name="refresh" size={18} color={colors.accent} />
          <Text style={s.refreshTxt}>Обновить</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={s.errBanner}>
          <Text style={s.errText}>{error}</Text>
        </View>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => vacancyKey(item)}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const id = vacancyKey(item);
          const skills = skillsOf(item);
          const salary = salaryText(item);
          const applicants =
            typeof item.applicantCount === 'number' ? item.applicantCount : 0;
          const location = typeof item.location === 'string' ? item.location : '';

          return (
            <Pressable
              style={s.card}
              onPress={() => id && navigation.navigate('VacancyDetail', { id })}
            >
              <View style={s.cardHead}>
                <Text style={s.company} numberOfLines={1}>
                  {item.companyName || 'Компания'}
                </Text>
                <View style={s.badges}>
                  {item.experienceLevel ? (
                    <Text style={s.badge}>{levelLabel(String(item.experienceLevel))}</Text>
                  ) : null}
                  {item.type ? <Text style={s.badge}>{formatLabel(String(item.type))}</Text> : null}
                </View>
              </View>

              <Text style={s.cardTitle}>{item.title || 'Без названия'}</Text>

              {salary ? <Text style={s.salary}>{salary}</Text> : null}
              {location ? (
                <View style={s.locRow}>
                  <Ionicons name="location-outline" size={14} color={colors.ink3} />
                  <Text style={s.location}>{location}</Text>
                </View>
              ) : null}

              {skills.length > 0 ? (
                <View style={s.skillsRow}>
                  {skills.slice(0, 5).map((sk) => (
                    <Text key={sk} style={s.skillChip}>
                      {sk}
                    </Text>
                  ))}
                  {skills.length > 5 ? (
                    <Text style={s.skillMore}>+{skills.length - 5}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={s.cardFoot}>
                <Text style={s.applicants}>
                  {applicants} {applicants === 1 ? 'отклик' : applicants < 5 ? 'отклика' : 'откликов'}
                </Text>
                <Text style={s.moreLink}>Подробнее →</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={s.empty}>
            {items.length ? 'По выбранным фильтрам вакансий не найдено.' : 'Пока нет вакансий.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    list: { paddingBottom: 32 },
    hero: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
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
    hintBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 14,
      padding: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
    },
    hintBannerTxt: { flex: 1, fontSize: 13, color: colors.ink2, lineHeight: 18 },
    filtersBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    filterGroupLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    chipsRow: { gap: 8, paddingRight: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    chipTxt: { fontSize: 14, color: colors.ink2, fontWeight: '500' },
    chipTxtActive: { color: colors.ink, fontWeight: '700' },
    clearBtn: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
    clearBtnText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
    boardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      marginTop: 4,
    },
    boardKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink,
      textTransform: 'uppercase',
    },
    boardHint: { fontSize: 13, color: colors.ink3, marginTop: 4 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    refreshTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },
    errBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.surface2,
    },
    errText: { color: colors.danger, fontSize: 14 },
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },
    company: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink3, textTransform: 'uppercase' },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: '50%' },
    badge: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.accentMuted,
      backgroundColor: colors.accentMuted,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, lineHeight: 24, marginBottom: 6 },
    salary: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
    location: { fontSize: 13, color: colors.ink3 },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 12 },
    skillChip: {
      fontSize: 12,
      color: colors.ink2,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    skillMore: { fontSize: 12, color: colors.ink3, alignSelf: 'center' },
    cardFoot: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    applicants: { fontSize: 13, color: colors.ink3 },
    moreLink: { fontSize: 14, fontWeight: '700', color: colors.accent },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 32, paddingHorizontal: 24, fontSize: 15 },
  });
}
