import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import {
  deleteAdminPost,
  fetchAdminPost,
  updateAdminPost,
  type AdminPost,
} from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPostDetail'>;

export default function AdminPostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);

  const [post, setPost] = useState<AdminPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('published');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { post: p } = await fetchAdminPost(postId, token);
      setPost(p);
      setTitle(p.title || '');
      setContent(p.content || '');
      setStatus(p.status || 'published');
      setTagsInput(Array.isArray(p.tags) ? p.tags.join(', ') : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin, load]);

  async function save(nextStatus?: string) {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const { post: updated } = await updateAdminPost(
        postId,
        {
          title: title.trim(),
          content: content.trim(),
          status: nextStatus || status,
          domainKey: post?.domainKey,
          domainLabel: post?.domainLabel,
          tags,
        },
        token,
      );
      setPost(updated);
      setStatus(String(updated.status || status));
      Alert.alert('Готово', 'Публикация обновлена');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert('Удалить публикацию', 'Действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setSaving(true);
          try {
            await deleteAdminPost(postId, token);
            Alert.alert('Удалено');
            navigation.goBack();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка удаления');
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
        <Text style={s.eyebrow}>Публикация</Text>
        <Text style={s.title}>{title || 'Без заголовка'}</Text>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.inputLabel}>Заголовок</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} editable={!saving} />

          <Text style={s.inputLabel}>Содержание</Text>
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
            value={content}
            onChangeText={setContent}
            multiline
            editable={!saving}
          />

          <Text style={s.inputLabel}>Статус</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['published', 'hidden'] as const).map((st) => (
              <Pressable
                key={st}
                style={[s.pill, status === st && { borderColor: colors.accentSolid }]}
                onPress={() => setStatus(st)}
              >
                <Text style={s.pillTxt}>{st === 'published' ? 'Опубликован' : 'Скрыт'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.inputLabel}>Теги (через запятую)</Text>
          <TextInput style={s.input} value={tagsInput} onChangeText={setTagsInput} editable={!saving} />
        </View>

        <Pressable style={[s.primaryBtn, saving && { opacity: 0.7 }]} onPress={() => save()} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Сохранить</Text>}
        </Pressable>

        <Pressable style={[s.ghostBtn, { marginTop: 10 }]} onPress={() => save('hidden')} disabled={saving}>
          <Text style={s.ghostBtnTxt}>Скрыть публикацию</Text>
        </Pressable>

        <Pressable style={[s.dangerBtn, { marginTop: 16 }]} onPress={remove} disabled={saving}>
          <Text style={s.dangerBtnTxt}>Удалить</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
