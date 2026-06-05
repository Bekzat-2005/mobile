import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/types';
import { fetchAdminDashboard, type AdminDashboard } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function AdminDashboardScreen({}: Props) {
  const { colors } = useAppTheme();
  const { token, user } = useAuth();
  const s = styles(colors);

  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetchAdminDashboard(token);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    void load();
  }, [user?.role, load]);

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Доступ только для администраторов.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
        }
      >
        <Text style={s.eyebrow}>Администрирование</Text>
        <Text style={s.title}>Панель администратора</Text>

        {error ? <Text style={s.err}>{error}</Text> : null}

        <View style={s.grid}>
          <View style={s.stat}>
            <Text style={s.statVal}>{stats?.totalUsers ?? 0}</Text>
            <Text style={s.statLbl}>пользователей</Text>
            <Text style={s.statMeta}>активных: {stats?.activeUsers ?? 0}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{stats?.bannedUsers ?? 0}</Text>
            <Text style={s.statLbl}>заблокировано</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{stats?.totalPosts ?? 0}</Text>
            <Text style={s.statLbl}>публикаций</Text>
            <Text style={s.statMeta}>жалоб: {stats?.reportedPosts ?? 0}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{stats?.totalPrompts ?? 0}</Text>
            <Text style={s.statLbl}>промптов</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Платформа</Text>
          <Text style={s.row}>
            Обслуживание:{' '}
            <Text style={s.rowStrong}>
              {data?.system?.maintenance?.enabled ? 'Включено' : 'Выключено'}
            </Text>
          </Text>
          <Text style={s.row}>
            AI-провайдер: <Text style={s.rowStrong}>{data?.system?.ai?.activeProvider || '—'}</Text>
          </Text>
          {data?.system?.featureFlags ? (
            <View style={s.flags}>
              {Object.entries(data.system.featureFlags).map(([key, enabled]) => (
                <View key={key} style={[s.flag, !enabled && s.flagOff]}>
                  <Text style={s.flagTxt}>
                    {key} · {enabled ? 'вкл' : 'выкл'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={s.sectionTitle}>Последние действия</Text>
        {(data?.recentActivity || []).length === 0 ? (
          <Text style={s.muted}>Пока нет записей.</Text>
        ) : (
          (data?.recentActivity || []).slice(0, 12).map((item, i) => (
            <View key={item.id || i} style={s.activity}>
              <Text style={s.activityAction}>{item.action || 'Действие'}</Text>
              <Text style={s.activitySub}>
                {item.entityType} · {item.entityLabel || item.entityId || '—'}
              </Text>
              <Text style={s.activityMeta}>
                @{item.actor?.username || 'admin'} · {fmtDate(item.createdAt)}
              </Text>
            </View>
          ))
        )}

        <Pressable style={s.refreshBtn} onPress={() => { setRefreshing(true); void load(); }}>
          <Text style={s.refreshBtnTxt}>Обновить</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20, paddingBottom: 40 },
    muted: { color: colors.ink3, fontSize: 15, padding: 20 },
    err: { color: colors.danger, marginBottom: 12 },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 6, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    stat: {
      width: '48%',
      flexGrow: 1,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      backgroundColor: colors.surface2,
    },
    statVal: { fontSize: 28, fontWeight: '800', color: colors.ink },
    statLbl: { fontSize: 11, color: colors.ink3, marginTop: 4, textTransform: 'uppercase' },
    statMeta: { fontSize: 12, color: colors.ink2, marginTop: 6 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      marginTop: 16,
      backgroundColor: colors.surface2,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 12 },
    row: { fontSize: 14, color: colors.ink2, marginBottom: 8 },
    rowStrong: { fontWeight: '700', color: colors.ink },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    flag: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    flagOff: { borderColor: colors.line, backgroundColor: colors.surface },
    flagTxt: { fontSize: 11, color: colors.ink2 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginTop: 24,
      marginBottom: 12,
    },
    activity: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.surface2,
    },
    activityAction: { fontSize: 14, fontWeight: '700', color: colors.ink },
    activitySub: { fontSize: 13, color: colors.ink2, marginTop: 4 },
    activityMeta: { fontSize: 12, color: colors.ink3, marginTop: 6 },
    refreshBtn: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      alignItems: 'center',
    },
    refreshBtnTxt: { fontWeight: '600', color: colors.ink },
  });
}
