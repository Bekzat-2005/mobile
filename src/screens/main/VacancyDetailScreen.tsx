import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VacanciesStackParamList } from '../../navigation/types';
import { applyToVacancy, fetchVacancy } from '../../api/vacancies';
import type { Vacancy } from '../../api/vacancies';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<VacanciesStackParamList, 'VacancyDetail'>;

export default function VacancyDetailScreen({ route }: Props) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { vacancy: v } = await fetchVacancy(id, token);
        setVacancy(v);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  async function onApply() {
    if (!token) {
      setApplyMsg('Войдите, чтобы откликнуться');
      return;
    }
    setApplying(true);
    setApplyMsg('');
    try {
      await applyToVacancy(id, token);
      setApplyMsg('Отклик отправлен');
    } catch (e) {
      setApplyMsg(e instanceof Error ? e.message : 'Не удалось откликнуться');
    } finally {
      setApplying(false);
    }
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>{vacancy.title}</Text>
        <Text style={s.meta}>{vacancy.companyName}</Text>
        {vacancy.skills && Array.isArray(vacancy.skills) ? (
          <Text style={s.skills}>{vacancy.skills.join(' · ')}</Text>
        ) : null}
        <Text style={s.block}>{desc}</Text>
        <Pressable style={[s.btn, applying && { opacity: 0.7 }]} onPress={onApply} disabled={applying}>
          <Text style={s.btnText}>{token ? 'Откликнуться' : 'Войти для отклика'}</Text>
        </Pressable>
        {applyMsg ? <Text style={s.msg}>{applyMsg}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    body: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '600', color: colors.ink, marginBottom: 8 },
    meta: { fontSize: 15, color: colors.ink2, marginBottom: 8 },
    skills: { fontSize: 13, color: colors.accent, marginBottom: 16 },
    block: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginBottom: 24 },
    btn: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center' },
    btnText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
    error: { color: colors.danger, padding: 20 },
    msg: { marginTop: 12, color: colors.ink2 },
  });
}
