import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
  fetchAdminUsers,
  type AdminPagination,
  type AdminUser,
} from '../../api/admin';
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';
import { AdminUserListItem } from './components/AdminUserListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUsers'>;

type RoleFilter = '' | 'user' | 'company' | 'admin';
type StatusFilter = '' | 'active' | 'suspended' | 'banned';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: '', label: 'Все роли' },
  { value: 'user', label: 'Участник' },
  { value: 'company', label: 'Компания' },
  { value: 'admin', label: 'Админ' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активен' },
  { value: 'suspended', label: 'Приостановлен' },
  { value: 'banned', label: 'Заблокирован' },
];

export default function AdminUsersScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);
  const local = styles(colors);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<AdminPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [role, setRole] = useState<RoleFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');

  const load = useCallback(
    async (page = 1, opts?: { refresh?: boolean }) => {
      if (!token) return;
      if (opts?.refresh) setRefreshing(true);
      else if (page === 1) setLoading(true);
      setError('');
      try {
        const res = await fetchAdminUsers(token, { search, role, status, page, limit: 15 });
        setUsers(res.users || []);
        setPagination(res.pagination);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки пользователей');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, search, role, status],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void load(1);
    }, [isAdmin, load]),
  );

  useEffect(() => {
    if (isAdmin && !loading) void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status]);

  function applySearch() {
    setSearch(searchDraft.trim());
  }

  if (!isAdmin) return <AdminAccessDenied />;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={local.toolbar}>
        <Text style={s.eyebrow}>Администрирование</Text>
        <Text style={local.title}>Пользователи</Text>
        <Text style={s.lead}>Всего: {pagination.total}</Text>

        <View style={local.searchRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={searchDraft}
            onChangeText={setSearchDraft}
            placeholder="Имя, email, username…"
            placeholderTextColor={colors.ink3}
            returnKeyType="search"
            onSubmitEditing={applySearch}
          />
          <Pressable style={local.searchBtn} onPress={applySearch}>
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={local.filterRow}>
          {ROLE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value || 'all-role'}
              style={[local.chip, role === opt.value && local.chipActive]}
              onPress={() => setRole(opt.value)}
            >
              <Text style={[local.chipTxt, role === opt.value && local.chipTxtActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={local.filterRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value || 'all-status'}
              style={[local.chip, status === opt.value && local.chipActive]}
              onPress={() => setStatus(opt.value)}
            >
              <Text style={[local.chipTxt, status === opt.value && local.chipTxtActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <View style={[s.errorBox, { marginHorizontal: 20 }]}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={adminTokens.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={() => load(pagination.page, { refresh: true })}
          renderItem={({ item }) => (
            <AdminUserListItem
              user={item}
              onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={local.empty}>Пользователи не найдены.</Text>
          }
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={local.pagination}>
                <Pressable
                  style={[local.pageBtn, pagination.page <= 1 && local.pageBtnDisabled]}
                  disabled={pagination.page <= 1}
                  onPress={() => load(pagination.page - 1)}
                >
                  <Text style={local.pageBtnTxt}>← Назад</Text>
                </Pressable>
                <Text style={local.pageInfo}>
                  {pagination.page} / {pagination.totalPages}
                </Text>
                <Pressable
                  style={[
                    local.pageBtn,
                    pagination.page >= pagination.totalPages && local.pageBtnDisabled,
                  ]}
                  disabled={pagination.page >= pagination.totalPages}
                  onPress={() => load(pagination.page + 1)}
                >
                  <Text style={local.pageBtnTxt}>Далее →</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    toolbar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 },
    searchRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    searchBtn: {
      width: 48,
      height: 48,
      borderRadius: adminTokens.radiusSm,
      backgroundColor: adminTokens.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: adminTokens.radiusPill,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: adminTokens.accentBlue,
      backgroundColor: adminTokens.accentBlueMuted,
    },
    chipTxt: { fontSize: 12, fontWeight: '600', color: colors.ink2 },
    chipTxtActive: { color: adminTokens.accentBlue },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 32, fontSize: 15 },
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: adminTokens.accentBlueLine,
    },
    pageBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: adminTokens.radiusSm,
      borderWidth: 1,
      borderColor: adminTokens.accentBlueLine,
      backgroundColor: colors.surface2,
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnTxt: { fontSize: 14, fontWeight: '600', color: colors.ink },
    pageInfo: { fontSize: 14, color: colors.ink2, fontWeight: '600' },
  });
}
