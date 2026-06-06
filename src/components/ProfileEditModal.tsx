import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AuthUser } from '../api/auth';
import { updateCurrentUserProfile } from '../api/users';
import { useAppTheme } from '../context/ThemeContext';

type EditForm = {
  username: string;
  firstName: string;
  lastName: string;
  aboutMe: string;
  github: string;
};

type Props = {
  visible: boolean;
  user: AuthUser | null;
  token: string | null;
  onClose: () => void;
  onSaved: (updatedUser: AuthUser) => void;
};

function splitDisplayName(full?: string) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildEditForm(user: AuthUser | null): EditForm {
  const { firstName, lastName } = splitDisplayName(user?.name);
  const contact = user?.contactInfo;
  return {
    username: user?.username || '',
    firstName,
    lastName,
    aboutMe: user?.aboutMe || '',
    github: contact?.github || '',
  };
}

export function ProfileEditModal({ visible, user, token, onClose, onSaved }: Props) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  const [form, setForm] = useState<EditForm>(buildEditForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && user) {
      setForm(buildEditForm(user));
      setError('');
    }
  }, [visible, user]);

  function closeModal() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    if (!token || !user || saving) return;

    const username = form.username.trim();
    if (!username) {
      setError('Username не может быть пустым');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const name =
        [form.firstName, form.lastName]
          .map((x) => x.trim())
          .filter(Boolean)
          .join(' ') ||
        user.name ||
        user.username ||
        '';

      const payload: Record<string, unknown> = {
        name,
        username,
        aboutMe: form.aboutMe.trim(),
        contactInfo: {
          phone: user.contactInfo?.phone || '',
          telegram: user.contactInfo?.telegram || '',
          linkedin: user.contactInfo?.linkedin || '',
          github: form.github.trim(),
          visibility: user.contactInfo?.visibility || {
            phone: false,
            telegram: false,
            linkedin: false,
            github: true,
          },
        },
      };

      const { user: updatedUser } = await updateCurrentUserProfile(payload, token);
      onSaved(updatedUser);
      onClose();
      Alert.alert('Успешно', 'Профиль обновлен');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={closeModal}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
        >
          <View style={s.header}>
            <Pressable onPress={closeModal} hitSlop={12} disabled={saving} style={s.headerBtn}>
              <Ionicons name="close" size={22} color={colors.ink2} />
            </Pressable>
            <Text style={s.headerTitle}>Редактирование профиля</Text>
            <View style={s.headerBtn} />
          </View>

          <ScrollView
            style={s.flex}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.lead}>Измените текстовые данные. Фото профиля не редактируется.</Text>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Username</Text>
              <TextInput
                style={s.input}
                value={form.username}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                onChangeText={(t) => setForm((f) => ({ ...f, username: t }))}
                placeholder="@username"
                placeholderTextColor={colors.ink3}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Имя</Text>
              <TextInput
                style={s.input}
                value={form.firstName}
                editable={!saving}
                onChangeText={(t) => setForm((f) => ({ ...f, firstName: t }))}
                placeholder="Иван"
                placeholderTextColor={colors.ink3}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Фамилия</Text>
              <TextInput
                style={s.input}
                value={form.lastName}
                editable={!saving}
                onChangeText={(t) => setForm((f) => ({ ...f, lastName: t }))}
                placeholder="Иванов"
                placeholderTextColor={colors.ink3}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>О себе</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={form.aboutMe}
                editable={!saving}
                onChangeText={(t) => setForm((f) => ({ ...f, aboutMe: t }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Кратко о себе, целях и опыте"
                placeholderTextColor={colors.ink3}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>Ссылка на GitHub</Text>
              <TextInput
                style={s.input}
                value={form.github}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                onChangeText={(t) => setForm((f) => ({ ...f, github: t }))}
                placeholder="https://github.com/username"
                placeholderTextColor={colors.ink3}
                keyboardType="url"
              />
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={s.saveBtnText}>Сохранить</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    scroll: { padding: 20, paddingBottom: 32, gap: 4 },
    lead: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 8 },
    fieldGroup: { marginTop: 12, gap: 8 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: colors.ink,
    },
    textArea: { minHeight: 110, paddingTop: 13 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}11`,
    },
    errorText: { flex: 1, fontSize: 14, color: colors.danger, lineHeight: 20 },
    saveBtn: {
      marginTop: 28,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    saveBtnDisabled: { opacity: 0.75 },
    saveBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  });
}
