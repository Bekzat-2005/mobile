import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { OnboardingModePicker, type OnboardingMode } from '../../components/learn/OnboardingModePicker';
import { createCareerSession } from '../../api/career';
import { defaultCareerProfile } from '../../constants/career-defaults';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerSessionSetup'>;

function sessionIdOf(s: Record<string, unknown>) {
  return String(s.id ?? s._id ?? '');
}

export default function CareerSessionSetupScreen({ route, navigation }: Props) {
  const { directionKey, directionLabel, defaultTargetRole } = route.params;
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);

  const [targetRole, setTargetRole] = useState(defaultTargetRole || 'Junior разработчик');
  const [mode, setMode] = useState<OnboardingMode>('assessment');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  async function onCreate() {
    if (!token) return;
    setErr('');
    setCreating(true);
    try {
      const profile = {
        ...defaultCareerProfile,
        ...(mode === 'start_from_zero' ? { experienceLevel: 'zero' } : {}),
      };
      const { session } = await createCareerSession(
        {
          directionKey,
          targetRole: targetRole.trim() || directionLabel,
          onboardingMode: mode,
          profile,
        },
        token,
      );
      navigation.replace('CareerSessionDetail', { sessionId: sessionIdOf(session as Record<string, unknown>) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось создать план');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Новый план</Text>
        <Text style={s.title}>{directionLabel}</Text>
        <Text style={s.lead}>Выберите, как начать обучение по этому направлению.</Text>

        <OnboardingModePicker value={mode} onChange={setMode} />

        <Text style={s.label}>Целевая роль</Text>
        <TextInput
          style={s.input}
          value={targetRole}
          onChangeText={setTargetRole}
          placeholder="Junior Frontend Developer"
          placeholderTextColor={colors.ink3}
        />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <Pressable style={[s.btn, creating && s.btnDisabled]} onPress={onCreate} disabled={creating}>
          {creating ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={s.btnTxt}>Создать план</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 20, paddingBottom: 40 },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 6 },
    lead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 8, marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '700', color: colors.ink3, marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface2,
    },
    err: { color: colors.danger, marginTop: 12, fontSize: 14 },
    btn: {
      marginTop: 24,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnTxt: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  });
}
