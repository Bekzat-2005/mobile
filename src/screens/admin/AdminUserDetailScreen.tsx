import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import {
  deleteAdminUser,
  fetchAdminUser,
  updateAdminUser,
  type AdminUser,
  type AdminUserUpdatePayload,
} from '../../api/admin';
import { formatUserRole, formatUserStatus } from '../../lib/status-labels';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUserDetail'>;

type UserForm = {
  name: string;
  role: string;
  status: string;
  companyName: string;
  points: string;
};

const ROLE_OPTIONS = [
  { value: 'user', label: 'Участник' },
  { value: 'company', label: 'Компания' },
  { value: 'admin', label: 'Администратор' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активен' },
  { value: 'suspended', label: 'Приостановлен' },
  { value: 'banned', label: 'Заблокирован' },
];

function buildForm(user: AdminUser): UserForm {
  return {
    name: user.name || '',
    role: user.role || 'user',
    status: user.status || 'active',
    companyName: user.companyName || '',
    points: String(user.points ?? 0),
  };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return '—';
  }
}

export default function AdminUserDetailScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);
  const local = styles(colors);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>({
    name: '',
    role: 'user',
    status: 'active',
    companyName: '',
    points: '0',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const { user: u } = await fetchAdminUser(userId, token);
      setUser(u);
      setForm(buildForm(u));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить пользователя');
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function save(payload?: Partial<AdminUserUpdatePayload>) {
    if (!token || !user) return;
    setSaving(true);
    setError('');
    try {
      const body: AdminUserUpdatePayload = {
        name: form.name.trim(),
        role: form.role,
        status: form.status,
        companyName: form.companyName.trim(),
        points: Math.max(0, Number(form.points) || 0),
        ...payload,
      };
      const { user: updated } = await updateAdminUser(userId, body, token);
      setUser(updated);
      setForm(buildForm(updated));
      Alert.alert('Готово', 'Данные пользователя сохранены');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function banUser() {
    Alert.alert('Заблокировать', 'Установить статус «Заблокирован»?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Заблокировать',
        style: 'destructive',
        onPress: () => {
          setForm((f) => ({ ...f, status: 'banned' }));
          void save({ status: 'banned' });
        },
      },
    ]);
  }

  function removeUser() {
    Alert.alert(
      'Удалить пользователя',
      'Это действие необратимо. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setSaving(true);
            try {
              await deleteAdminUser(userId, token);
              Alert.alert('Удалено', 'Пользователь удалён');
              navigation.goBack();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Не удалось удалить');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (!isAdmin) return <AdminAccessDenied />;

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={adminTokens.accentBlue} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.lead}>{error || 'Пользователь не найден'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Данные пользователя</Text>
        <Text style={local.title}>{user.name || user.username || 'Профиль'}</Text>
        <Text style={local.idLine}>ID: {user.id}</Text>

        <View style={local.readonlyCard}>
          <View style={local.readonlyRow}>
            <Ionicons name="mail-outline" size={18} color={adminTokens.accentBlue} />
            <Text style={local.readonlyTxt}>{user.email || '—'}</Text>
          </View>
          <View style={local.readonlyRow}>
            <Ionicons name="at-outline" size={18} color={adminTokens.accentBlue} />
            <Text style={local.readonlyTxt}>@{user.username || '—'}</Text>
          </View>
          <View style={local.badges}>
            <View style={s.pill}>
              <Text style={s.pillTxt}>{formatUserRole(user.role)}</Text>
            </View>
            <View style={[s.pill, user.status === 'banned' && s.pillDanger]}>
              <Text style={[s.pillTxt, user.status === 'banned' && s.pillDangerTxt]}>
                {formatUserStatus(user.status)}
              </Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.inputLabel}>Имя</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
            editable={!saving}
          />

          <Text style={s.inputLabel}>Роль</Text>
          <View style={local.optionRow}>
            {ROLE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[local.option, form.role === opt.value && local.optionActive]}
                onPress={() => setForm((f) => ({ ...f, role: opt.value }))}
                disabled={saving}
              >
                <Text style={[local.optionTxt, form.role === opt.value && local.optionTxtActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.inputLabel}>Статус</Text>
          <View style={local.optionRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[local.option, form.status === opt.value && local.optionActive]}
                onPress={() => setForm((f) => ({ ...f, status: opt.value }))}
                disabled={saving}
              >
                <Text
                  style={[local.optionTxt, form.status === opt.value && local.optionTxtActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.inputLabel}>Компания</Text>
          <TextInput
            style={s.input}
            value={form.companyName}
            onChangeText={(t) => setForm((f) => ({ ...f, companyName: t }))}
            editable={!saving}
            placeholder="Название компании"
            placeholderTextColor={colors.ink3}
          />

          <Text style={s.inputLabel}>Баллы</Text>
          <TextInput
            style={s.input}
            value={form.points}
            onChangeText={(t) => setForm((f) => ({ ...f, points: t.replace(/[^\d]/g, '') }))}
            editable={!saving}
            keyboardType="number-pad"
          />

          <View style={local.metaBlock}>
            <Text style={local.metaLine}>Создан: {fmtDate(user.createdAt)}</Text>
            <Text style={local.metaLine}>Обновлён: {fmtDate(user.updatedAt)}</Text>
          </View>
        </View>

        <Pressable
          style={[s.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={() => save()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnTxt}>Сохранить</Text>
          )}
        </Pressable>

        <Pressable style={[s.ghostBtn, { marginTop: 10 }]} onPress={banUser} disabled={saving}>
          <Text style={[s.ghostBtnTxt, { color: adminTokens.dangerInk }]}>Заблокировать</Text>
        </Pressable>

        <Pressable style={local.deleteBtn} onPress={removeUser} disabled={saving}>
          <Ionicons name="trash-outline" size={18} color={adminTokens.dangerInk} />
          <Text style={s.dangerBtnTxt}>Удалить пользователя</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 },
    idLine: { fontSize: 12, color: colors.ink3, marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    readonlyCard: {
      borderRadius: adminTokens.radiusMd,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      padding: 16,
      backgroundColor: adminTokens.accentBlueMuted,
      marginBottom: 16,
      gap: 10,
    },
    readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    readonlyTxt: { fontSize: 15, color: colors.ink, flex: 1 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    option: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: adminTokens.radiusPill,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      backgroundColor: colors.surface,
    },
    optionActive: {
      borderColor: adminTokens.accentBlue,
      backgroundColor: adminTokens.accentBlueMuted,
    },
    optionTxt: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
    optionTxtActive: { color: adminTokens.accentBlue },
    metaBlock: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminTokens.accentBlueLine },
    metaLine: { fontSize: 13, color: colors.ink3, marginBottom: 4 },
    deleteBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: adminTokens.radiusPill,
      backgroundColor: adminTokens.dangerBg,
    },
  });
}
