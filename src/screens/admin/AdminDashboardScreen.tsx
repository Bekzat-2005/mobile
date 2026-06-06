import { Ionicons } from '@expo/vector-icons';
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
import { useAppTheme } from '../../context/ThemeContext';
import { AdminAccessDenied, useRequireAdmin } from './admin-guard';
import { adminStyles, adminTokens } from './admin-styles';
import { AdminNavRow } from './components/AdminNavRow';
import { AdminStatCard } from './components/AdminStatCard';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

const FEATURE_FLAG_LABELS: Record<string, string> = {
  assistant: 'Ассистент',
  community: 'Сообщество',
  vacancies: 'Вакансии',
  analytics: 'Аналитика',
  planner: 'Планировщик',
  assessments: 'Оценки',
  interviewMode: 'Интервью',
  adminPanel: 'Админ-панель',
};

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

export default function AdminDashboardScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { isAdmin, token } = useRequireAdmin();
  const s = adminStyles(colors);
  const local = styles(colors);

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
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAdmin, load]);

  if (!isAdmin) return <AdminAccessDenied />;

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={adminTokens.accentBlue} />
        <Text style={s.lead}>Загрузка обзорной статистики…</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <View style={local.hero}>
          <View style={local.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={adminTokens.accentBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Skillo Admin</Text>
            <Text style={s.title}>Обзор платформы</Text>
          </View>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>Разделы</Text>
        <AdminNavRow
          title="Пользователи"
          subtitle="Список, роли, блокировки и редактирование"
          icon="people-outline"
          onPress={() => navigation.navigate('AdminUsers')}
        />
        <AdminNavRow
          title="Публикации"
          subtitle="Модерация постов сообщества"
          icon="newspaper-outline"
          onPress={() => navigation.navigate('AdminPosts')}
        />
        <AdminNavRow
          title="Промпты"
          subtitle="AI-шаблоны: создание и редактирование"
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('AdminPrompts')}
        />
        <AdminNavRow
          title="Система"
          subtitle="AI-провайдер, обслуживание, флаги"
          icon="settings-outline"
          onPress={() => navigation.navigate('AdminSystem')}
        />

        <Text style={s.sectionTitle}>Статистика</Text>
        <View style={local.statsGrid}>
          <AdminStatCard
            label="Пользователи"
            value={stats?.totalUsers ?? 0}
            meta={`Активных: ${stats?.activeUsers ?? 0}`}
            icon="people-outline"
          />
          <AdminStatCard
            label="Заблокированы"
            value={stats?.bannedUsers ?? 0}
            meta="Аккаунты со статусом banned"
            icon="ban-outline"
            tint={colors.danger}
          />
          <AdminStatCard
            label="Публикации"
            value={stats?.totalPosts ?? 0}
            meta={`Жалоб: ${stats?.reportedPosts ?? 0}`}
            icon="newspaper-outline"
            tint="#6366f1"
          />
          <AdminStatCard
            label="Промпты"
            value={stats?.totalPrompts ?? 0}
            meta="AI-шаблоны платформы"
            icon="chatbubbles-outline"
            tint="#0ea5e9"
          />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Состояние платформы</Text>
          <View style={local.systemRow}>
            <Text style={local.systemLbl}>Режим обслуживания</Text>
            <Text style={local.systemVal}>
              {data?.system?.maintenance?.enabled ? 'Включён' : 'Выключен'}
            </Text>
          </View>
          <View style={local.systemRow}>
            <Text style={local.systemLbl}>AI-провайдер</Text>
            <Text style={local.systemVal}>{data?.system?.ai?.activeProvider || 'gemini'}</Text>
          </View>
          {data?.system?.featureFlags ? (
            <View style={local.flags}>
              {Object.entries(data.system.featureFlags).map(([key, enabled]) => (
                <View key={key} style={[local.flag, !enabled && local.flagOff]}>
                  <Ionicons
                    name={enabled ? 'checkmark-circle' : 'close-circle-outline'}
                    size={14}
                    color={enabled ? adminTokens.accentBlue : colors.ink3}
                  />
                  <Text style={[local.flagTxt, !enabled && local.flagTxtOff]}>
                    {FEATURE_FLAG_LABELS[key] || key}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={s.sectionTitle}>Последние действия</Text>
        <View style={s.card}>
          {(data?.recentActivity || []).length === 0 ? (
            <Text style={s.cardSub}>Пока действий админов нет.</Text>
          ) : (
            (data?.recentActivity || []).slice(0, 12).map((item, i) => (
              <View key={item.id || i} style={local.activity}>
                <View style={local.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={local.activityAction}>{item.action || 'Действие'}</Text>
                  <Text style={local.activitySub}>
                    {item.entityType} · {item.entityLabel || item.entityId || '—'}
                  </Text>
                  <Text style={local.activityMeta}>
                    @{item.actor?.username || 'admin'} · {fmtDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: adminTokens.radiusMd,
      backgroundColor: adminTokens.accentBlueMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIcon: {
      width: 40,
      height: 40,
      borderRadius: adminTokens.radiusSm,
      backgroundColor: adminTokens.accentBlueMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    systemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: adminTokens.accentBlueLine,
    },
    systemLbl: { fontSize: 14, color: colors.ink2 },
    systemVal: { fontSize: 14, fontWeight: '700', color: colors.ink },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    flag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: adminTokens.radiusPill,
      borderWidth: 1,
      borderColor: adminTokens.accentBlue,
      backgroundColor: adminTokens.accentBlueMuted,
    },
    flagOff: { borderColor: colors.line, backgroundColor: colors.surface },
    flagTxt: { fontSize: 11, fontWeight: '600', color: adminTokens.accentBlue },
    flagTxtOff: { color: colors.ink3 },
    activity: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: adminTokens.accentBlueLine,
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: adminTokens.accentBlue,
      marginTop: 6,
    },
    activityAction: { fontSize: 14, fontWeight: '700', color: colors.ink },
    activitySub: { fontSize: 13, color: colors.ink2, marginTop: 3 },
    activityMeta: { fontSize: 12, color: colors.ink3, marginTop: 4 },
  });
}
