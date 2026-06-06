import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import {
  fetchAdminSystemSettings,
  updateAdminSystemSettings,
  type AdminSystemSettings,
} from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSystem'>;

const AI_PROVIDERS = [
  { value: 'gemini', label: 'Gemini (Google)', icon: 'logo-google' as const },
  { value: 'openai', label: 'OpenAI (ChatGPT)', icon: 'sparkles-outline' as const },
];

const FLAG_LABELS: Record<string, string> = {
  assistant: 'Ассистент',
  community: 'Сообщество',
  vacancies: 'Вакансии',
  analytics: 'Аналитика',
  planner: 'Планировщик',
  assessments: 'Оценки',
  interviewMode: 'Интервью',
  adminPanel: 'Админ-панель',
};

export default function AdminSystemScreen({}: Props) {
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);

  const [form, setForm] = useState<AdminSystemSettings>({
    maintenance: { enabled: false, message: '' },
    ai: { activeProvider: 'gemini' },
    featureFlags: {},
    limits: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const { settings } = await fetchAdminSystemSettings(token);
      setForm(settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const { settings } = await updateAdminSystemSettings(form, token);
      setForm(settings);
      Alert.alert('Готово', 'Настройки системы обновлены');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return <AdminAccessDenied />;
  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color={adminTokens.accentBlue} />
        <Text style={s.lead}>Загрузка настроек…</Text>
      </SafeAreaView>
    );
  }

  const provider = form.ai?.activeProvider || 'gemini';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Система</Text>
        <Text style={s.title}>Настройки платформы</Text>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>Режим обслуживания</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink2 }}>Включить</Text>
            <Switch
              value={Boolean(form.maintenance?.enabled)}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, maintenance: { ...f.maintenance, enabled: v, message: f.maintenance?.message || '' } }))
              }
            />
          </View>
          <Text style={s.inputLabel}>Сообщение</Text>
          <TextInput
            style={s.input}
            value={form.maintenance?.message || ''}
            onChangeText={(t) =>
              setForm((f) => ({
                ...f,
                maintenance: { enabled: f.maintenance?.enabled ?? false, message: t },
              }))
            }
            multiline
            placeholder="Платформа временно на обслуживании…"
            placeholderTextColor={colors.ink3}
          />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>AI-провайдер</Text>
          <Text style={s.cardSub}>Выберите серверный провайдер генерации</Text>
          {AI_PROVIDERS.map((opt) => {
            const active = provider === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    marginTop: 10,
                    borderRadius: adminTokens.radiusSm,
                    borderWidth: 1,
                    borderColor: active ? adminTokens.accentBlue : adminTokens.accentBlueLine,
                    backgroundColor: active ? adminTokens.accentBlueMuted : colors.surface,
                  },
                ]}
                onPress={() => setForm((f) => ({ ...f, ai: { activeProvider: opt.value } }))}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={active ? adminTokens.accentBlue : colors.ink3}
                />
                <Text style={{ flex: 1, fontWeight: active ? '700' : '500', color: colors.ink }}>
                  {opt.label}
                </Text>
                {active ? <Ionicons name="checkmark-circle" size={20} color={adminTokens.accentBlue} /> : null}
              </Pressable>
            );
          })}
        </View>

        {form.featureFlags ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Флаги функций</Text>
            {Object.entries(form.featureFlags).map(([key, enabled]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: adminTokens.accentBlueLine,
                }}
              >
                <Text style={{ color: colors.ink }}>{FLAG_LABELS[key] || key}</Text>
                <Switch
                  value={Boolean(enabled)}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      featureFlags: { ...f.featureFlags, [key]: v },
                    }))
                  }
                />
              </View>
            ))}
          </View>
        ) : null}

        <Pressable style={[s.primaryBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Сохранить настройки</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
