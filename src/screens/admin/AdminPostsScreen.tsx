import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import { fetchAdminPosts, type AdminPagination, type AdminPost } from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPosts'>;

export default function AdminPostsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);
  const local = styles(colors);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (page = 1) => {
      if (!token) return;
      setError('');
      try {
        const res = await fetchAdminPosts(token, { search, reportedOnly, page, limit: 15 });
        setPosts(res.posts || []);
        setPagination(res.pagination);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    },
    [token, search, reportedOnly],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void load(1);
    }, [isAdmin, load]),
  );

  useEffect(() => {
    if (isAdmin && !loading) void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, reportedOnly]);

  if (!isAdmin) return <AdminAccessDenied />;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={local.toolbar}>
        <Text style={s.eyebrow}>Контент</Text>
        <Text style={local.title}>Публикации</Text>
        <View style={local.searchRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={searchDraft}
            onChangeText={setSearchDraft}
            placeholder="Поиск по заголовку…"
            placeholderTextColor={colors.ink3}
            onSubmitEditing={() => setSearch(searchDraft.trim())}
          />
          <Pressable style={local.searchBtn} onPress={() => setSearch(searchDraft.trim())}>
            <Ionicons name="search" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={local.reportRow}>
          <Text style={local.reportLbl}>Только с жалобами</Text>
          <Switch
            value={reportedOnly}
            onValueChange={setReportedOnly}
            trackColor={{ true: adminTokens.accentBlue, false: colors.line }}
          />
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={adminTokens.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Pressable
              style={local.row}
              onPress={() => navigation.navigate('AdminPostDetail', { postId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={local.rowTitle} numberOfLines={2}>
                  {item.title || 'Без заголовка'}
                </Text>
                <Text style={local.rowSub} numberOfLines={1}>
                  @{item.author?.username || '—'} · {item.domainLabel || item.domainKey || '—'}
                </Text>
                <View style={local.badges}>
                  <Text style={local.badge}>{item.status || '—'}</Text>
                  {(item.reports?.count ?? 0) > 0 ? (
                    <Text style={[local.badge, local.badgeDanger]}>
                      жалоб: {item.reports?.count}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={local.empty}>Публикации не найдены</Text>}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={local.pagination}>
                <Pressable
                  disabled={pagination.page <= 1}
                  onPress={() => load(pagination.page - 1)}
                  style={local.pageBtn}
                >
                  <Text>←</Text>
                </Pressable>
                <Text>
                  {pagination.page}/{pagination.totalPages}
                </Text>
                <Pressable
                  disabled={pagination.page >= pagination.totalPages}
                  onPress={() => load(pagination.page + 1)}
                  style={local.pageBtn}
                >
                  <Text>→</Text>
                </Pressable>
              </View>
            ) : null
          }
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
    reportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    reportLbl: { fontSize: 14, color: colors.ink2 },
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
    rowTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    rowSub: { fontSize: 12, color: colors.ink3, marginTop: 4 },
    badges: { flexDirection: 'row', gap: 6, marginTop: 8 },
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
    badgeDanger: { color: colors.danger, borderColor: `${colors.danger}44` },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 24 },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    pageBtn: { padding: 10 },
  });
}
