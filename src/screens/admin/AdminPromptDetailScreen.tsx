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
  createAdminPrompt,
  deleteAdminPrompt,
  fetchAdminPrompt,
  updateAdminPrompt,
} from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPromptDetail'>;

export default function AdminPromptDetailScreen({ route, navigation }: Props) {
  const { promptKey } = route.params;
  const isNew = promptKey === '__new__';
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);

  const [key, setKey] = useState(isNew ? '' : promptKey);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [variablesText, setVariablesText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || isNew) return;
    try {
      const { prompt } = await fetchAdminPrompt(promptKey, token);
      setKey(prompt.key);
      setCategory(prompt.category || '');
      setDescription(prompt.description || '');
      setVariablesText(Array.isArray(prompt.variables) ? prompt.variables.join(', ') : '');
      setSystemPrompt(prompt.systemPrompt || '');
      setUserPrompt(prompt.userPrompt || '');
      setIsActive(prompt.isActive ?? true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token, promptKey, isNew]);

  useEffect(() => {
    if (isAdmin && !isNew) void load();
    else if (!isAdmin) setLoading(false);
  }, [isAdmin, isNew, load]);

  async function save() {
    if (!token) return;
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setError('Ключ промпта обязателен');
      return;
    }
    setSaving(true);
    setError('');
    const variables = variablesText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      key: trimmedKey,
      category: category.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      userPrompt: userPrompt.trim(),
      isActive,
      variables,
    };
    try {
      if (isNew) {
        await createAdminPrompt(payload, token);
        Alert.alert('Готово', 'Промпт создан');
        navigation.replace('AdminPromptDetail', { promptKey: trimmedKey });
      } else {
        await updateAdminPrompt(promptKey, payload, token);
        Alert.alert('Готово', 'Промпт обновлён');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function deactivate() {
    Alert.alert('Деактивировать промпт', 'Промпт будет отключён.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Деактивировать',
        style: 'destructive',
        onPress: async () => {
          if (!token || isNew) return;
          setSaving(true);
          try {
            await deleteAdminPrompt(promptKey, token);
            Alert.alert('Готово', 'Промпт деактивирован');
            navigation.goBack();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (!isAdmin) return <AdminAccessDenied />;
  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color={colors.accentSolid} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>{isNew ? 'Новый промпт' : 'Редактирование'}</Text>
        <Text style={s.title}>{isNew ? 'Создание AI-шаблона' : key}</Text>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.inputLabel}>Ключ (key)</Text>
          <TextInput
            style={s.input}
            value={key}
            onChangeText={setKey}
            editable={isNew && !saving}
            autoCapitalize="none"
            placeholder="career.roadmap.generate"
            placeholderTextColor={colors.ink3}
          />

          <Text style={s.inputLabel}>Категория</Text>
          <TextInput style={s.input} value={category} onChangeText={setCategory} editable={!saving} />

          <Text style={s.inputLabel}>Описание</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            editable={!saving}
            multiline
          />

          <Text style={s.inputLabel}>Переменные (через запятую)</Text>
          <TextInput style={s.input} value={variablesText} onChangeText={setVariablesText} editable={!saving} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={s.inputLabel}>Активен</Text>
            <Switch value={isActive} onValueChange={setIsActive} disabled={saving} />
          </View>

          <Text style={s.inputLabel}>System prompt</Text>
          <TextInput
            style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            multiline
            editable={!saving}
          />

          <Text style={s.inputLabel}>User prompt</Text>
          <TextInput
            style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
            value={userPrompt}
            onChangeText={setUserPrompt}
            multiline
            editable={!saving}
          />
        </View>

        <Pressable style={[s.primaryBtn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Сохранить</Text>}
        </Pressable>

        {!isNew ? (
          <Pressable style={[s.dangerBtn, { marginTop: 16 }]} onPress={deactivate} disabled={saving}>
            <Text style={s.dangerBtnTxt}>Деактивировать</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
