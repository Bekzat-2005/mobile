import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { VacanciesStackParamList } from '../../navigation/types';
import {
  applyToVacancy,
  fetchVacancy,
  getMyVacancyApplication,
  type Vacancy,
  type VacancyApplication,
} from '../../api/vacancies';
import { formatVacancyApplicationStatus } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<VacanciesStackParamList, 'VacancyDetail'>;

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

function requirementsOf(v: Vacancy): string[] {
  return Array.isArray(v.requirements) ? v.requirements.map(String).filter(Boolean) : [];
}

function isDoneStatus(status?: string) {
  return status === 'completed' || status === 'invited' || status === 'rejected';
}

export default function VacancyDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [application, setApplication] = useState<VacancyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { vacancy: v } = await fetchVacancy(id, token);
        setVacancy(v);
        if (token) {
          try {
            const data = await getMyVacancyApplication(id, token);
            setApplication(data.application);
          } catch (e) {
            if ((e as Error & { status?: number }).status !== 404) {
              console.warn(e);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  async function onApplyOrContinue() {
    if (!token) {
      navigation.getParent()?.getParent()?.navigate('Login');
      return;
    }
    if (application) {
      navigation.navigate('VacancyAssessment', { id });
      return;
    }
    setApplying(true);
    try {
      const data = await applyToVacancy(id, token);
      setApplication(data.application);
      navigation.navigate('VacancyAssessment', { id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось откликнуться');
    } finally {
      setApplying(false);
    }
  }

  function onInterviewPrep() {
    navigation.navigate('VacancyInterviewPrep', { id });
  }

  const s = styles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (error || !vacancy) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.error}>{error || 'Не найдено'}</Text>
      </SafeAreaView>
    );
  }

  const desc = typeof vacancy.description === 'string' ? vacancy.description : '';
  const skills = skillsOf(vacancy);
  const requirements = requirementsOf(vacancy);
  const salary = salaryText(vacancy);
  const location = typeof vacancy.location === 'string' ? vacancy.location : '';
  const applicants = typeof vacancy.applicantCount === 'number' ? vacancy.applicantCount : 0;
  const appStatus = application?.status;
  const hasApplication = Boolean(application);
  const isDone = isDoneStatus(appStatus);

  const primaryLabel = !token
    ? 'Войти для отклика'
    : isDone
      ? 'Посмотреть результаты'
      : hasApplication
        ? 'Продолжить оценку'
        : 'Откликнуться и пройти оценку';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.body}>
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={s.company}>{vacancy.companyName || 'Компания'}</Text>
            <View style={s.badges}>
              {vacancy.experienceLevel ? (
                <Text style={s.badge}>{levelLabel(String(vacancy.experienceLevel))}</Text>
              ) : null}
              {vacancy.type ? <Text style={s.badge}>{formatLabel(String(vacancy.type))}</Text> : null}
            </View>
          </View>

          <Text style={s.title}>{vacancy.title}</Text>

          <View style={s.metaRow}>
            {salary ? <Text style={s.salary}>{salary}</Text> : null}
            {location ? (
              <View style={s.locRow}>
                <Ionicons name="location-outline" size={14} color={colors.ink3} />
                <Text style={s.location}>{location}</Text>
              </View>
            ) : null}
            <Text style={s.applicants}>
              {applicants} {applicants === 1 ? 'отклик' : applicants < 5 ? 'отклика' : 'откликов'}
            </Text>
          </View>

          {appStatus ? (
            <View style={s.statusRow}>
              <Text style={s.statusLabel}>Статус отклика:</Text>
              <Text style={s.statusValue}>{formatVacancyApplicationStatus(appStatus)}</Text>
              {typeof application?.score === 'number' ? (
                <Text style={s.statusScore}>{application.score}/100</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {desc ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>О позиции</Text>
            <Text style={s.description}>{desc}</Text>
          </View>
        ) : null}

        {requirements.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Требования</Text>
            <View style={s.reqList}>
              {requirements.map((req) => (
                <View key={req} style={s.reqItem}>
                  <Text style={s.reqBullet}>•</Text>
                  <Text style={s.reqText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {skills.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Навыки</Text>
            <View style={s.skillsRow}>
              {skills.map((sk) => (
                <Text key={sk} style={s.skillChip}>
                  {sk}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <SafeAreaView style={s.footer} edges={['bottom']}>
        <Pressable
          style={[s.btnPrimary, applying && s.btnDisabled]}
          onPress={onApplyOrContinue}
          disabled={applying}
        >
          <Text style={s.btnPrimaryText}>{applying ? 'Загрузка…' : primaryLabel}</Text>
        </Pressable>
        <Pressable style={s.btnSecondary} onPress={onInterviewPrep}>
          <Text style={s.btnSecondaryText}>Подготовка к интервью</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    scroll: { flex: 1 },
    body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 },
    header: {
      paddingBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: 10,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    company: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.ink3,
      textTransform: 'uppercase',
    },
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
    title: { fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 32 },
    metaRow: { gap: 6 },
    salary: { fontSize: 16, fontWeight: '700', color: colors.ink },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    location: { fontSize: 13, color: colors.ink3 },
    applicants: { fontSize: 13, color: colors.ink3 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 },
    statusLabel: { fontSize: 13, color: colors.ink3 },
    statusValue: { fontSize: 13, fontWeight: '700', color: colors.accent },
    statusScore: { fontSize: 13, fontWeight: '700', color: colors.ink },
    section: { gap: 12 },
    sectionTitle: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    description: { fontSize: 15, color: colors.ink2, lineHeight: 24 },
    reqList: { gap: 10 },
    reqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    reqBullet: { fontSize: 15, color: colors.accent, lineHeight: 22, marginTop: 1 },
    reqText: { flex: 1, fontSize: 15, color: colors.ink2, lineHeight: 22 },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip: {
      fontSize: 13,
      color: colors.ink2,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    btnPrimary: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      alignItems: 'center',
    },
    btnPrimaryText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
    btnSecondary: {
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    btnSecondaryText: { color: colors.ink, fontWeight: '600', fontSize: 16 },
    btnDisabled: { opacity: 0.6 },
    error: { color: colors.danger, padding: 20 },
  });
}
