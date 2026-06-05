import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { LearnPageHero } from '../../components/learn/LearnPageHero';
import {
  LearnChipGrid,
  LearnFieldLabel,
  LearnSetupModal,
  learnListCardStyle,
} from '../../components/learn/LearnSetupModal';
import { createSkillAssessmentSession, fetchSkillAssessmentDomains, type SkillDomain } from '../../api/skill-assessment';
import { skillTargetLevels } from '../../constants/career-defaults';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'SkillDomains'>;

export default function SkillDomainsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [domains, setDomains] = useState<SkillDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState<SkillDomain | null>(null);
  const [level, setLevel] = useState<string>('junior');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const { domains: d } = await fetchSkillAssessmentDomains(token);
    setDomains(d);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  function openDomain(item: SkillDomain) {
    setLevel('junior');
    setErr('');
    setDomain(item);
  }

  async function createS() {
    if (!token || !domain) return;
    setErr('');
    setCreating(true);
    try {
      const { session } = await createSkillAssessmentSession(
        { domainKey: domain.key, targetLevel: level },
        token,
      );
      const id = String(session.id ?? session._id ?? '');
      setDomain(null);
      navigation.navigate('SkillSessionDetail', { sessionId: id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Нужна авторизация.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const levelOptions = skillTargetLevels.map((lv) => ({ value: lv.value, label: lv.label }));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={domains}
        keyExtractor={(d) => d.key}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <LearnPageHero
            eyebrow="Оценка"
            title="Оценка навыков"
            lead="Выберите область и уровень — ИИ соберёт тест."
            linkLabel="Мои оценки"
            onLinkPress={() => navigation.navigate('SkillSessions')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [learnListCardStyle(colors), s.row, pressed && { opacity: 0.92 }]}
            onPress={() => openDomain(item)}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.rowTitle}>{item.label || item.key}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.ink4} />
          </Pressable>
        )}
      />

      <LearnSetupModal
        visible={Boolean(domain)}
        title={domain?.label || 'Оценка'}
        description={domain?.description ? String(domain.description) : undefined}
        onClose={() => {
          setErr('');
          setDomain(null);
        }}
        error={err}
        primaryLabel="Начать"
        onPrimary={createS}
        primaryLoading={creating}
      >
        <LearnFieldLabel>Целевой уровень</LearnFieldLabel>
        <LearnChipGrid options={levelOptions} value={level} onChange={setLevel} columns={2} />
      </LearnSetupModal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    muted: { padding: 20, color: colors.ink2 },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    rowDesc: { marginTop: 6, fontSize: 14, color: colors.ink2, lineHeight: 20 },
  });
}
