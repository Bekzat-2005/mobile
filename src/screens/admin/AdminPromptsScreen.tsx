import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import { fetchAdminPrompts, type AdminPagination, type AdminPrompt } from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPrompts'>;

export default function AdminPromptsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);
  const local = styles(colors);

  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    async (page = 1) => {
      if (!token) return;
      setError('');
      try {
        const res = await fetchAdminPrompts(token, { search, page, limit: 15 });
        setPrompts(res.prompts || []);
        setPagination(res.pagination);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    },
    [token, search],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void load(1);
    }, [isAdmin, load]),
  );

  if (!isAdmin) return <AdminAccessDenied />;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={local.toolbar}>
        <Text style={s.eyebrow}>Контент</Text>
        <Text style={local.title}>Промпты</Text>
        <View style={local.searchRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={searchDraft}
            onChangeText={setSearchDraft}
            placeholder="Поиск по ключу…"
            placeholderTextColor={colors.ink3}
            onSubmitEditing={() => setSearch(searchDraft.trim())}
          />
          <Pressable style={local.searchBtn} onPress={() => setSearch(searchDraft.trim())}>
            <Ionicons name="search" size={18} color="#fff" />
          </Pressable>
        </View>
        <Pressable
          style={local.createBtn}
          onPress={() => navigation.navigate('AdminPromptDetail', { promptKey: '__new__' })}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={local.createBtnTxt}>Создать промпт</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={adminTokens.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={prompts}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 20, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Pressable
              style={local.row}
              onPress={() => navigation.navigate('AdminPromptDetail', { promptKey: item.key })}
            >
              <View style={{ flex: 1 }}>
                <Text style={local.rowTitle}>{item.key}</Text>
                <Text style={local.rowSub} numberOfLines={2}>
                  {item.description || '—'}
                </Text>
                <View style={local.badges}>
                  <Text style={local.badge}>{item.category || '—'}</Text>
                  <Text style={[local.badge, !item.isActive && local.badgeOff]}>
                    {item.isActive ? 'активен' : 'выкл'}
                  </Text>
                  <Text style={local.badge}>v{item.version ?? 1}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={local.empty}>Промпты не найдены</Text>}
        />
      )}
      {error ? <Text style={[s.errorText, { padding: 20 }]}>{error}</Text> : null}
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    toolbar: { padding: 20, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 },
    searchRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    searchBtn: {
      width: 44,
      height: 44,
      borderRadius: adminTokens.radiusSm,
      backgroundColor: adminTokens.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      backgroundColor: adminTokens.accentBlue,
      borderRadius: adminTokens.radiusSm,
      paddingVertical: 12,
    },
    createBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: adminTokens.radiusMd,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      backgroundColor: colors.surface2,
      marginBottom: 10,
    },
    rowTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, fontFamily: 'monospace' },
    rowSub: { fontSize: 13, color: colors.ink3, marginTop: 4 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    badge: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: adminTokens.accentBlue,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      borderRadius: adminTokens.radiusPill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeOff: { color: colors.ink3 },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 24 },
  });
}
