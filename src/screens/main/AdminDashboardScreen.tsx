import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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

type StatCardConfig = {
  id: string;
  label: string;
  value: number;
  meta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

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

function StatCard({
  label,
  value,
  meta,
  icon,
  tint,
  colors,
}: StatCardConfig & { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const s = cardStyles(colors);
  return (
    <View style={s.statCard}>
      <View style={[s.iconWrap, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
      {meta ? <Text style={s.statMeta}>{meta}</Text> : null}
    </View>
  );
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
        <View style={s.deniedWrap}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.ink3} />
          <Text style={s.deniedText}>Доступ только для администраторов.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.loadingText}>Загрузка статистики…</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const statCards: StatCardConfig[] = [
    {
      id: 'users',
      label: 'Пользователи',
      value: stats?.totalUsers ?? 0,
      meta: `Активных: ${stats?.activeUsers ?? 0}`,
      icon: 'people-outline',
      tint: colors.accent,
    },
    {
      id: 'banned',
      label: 'Заблокированы',
      value: stats?.bannedUsers ?? 0,
      meta: 'Аккаунты со статусом banned',
      icon: 'ban-outline',
      tint: colors.danger,
    },
    {
      id: 'posts',
      label: 'Публикации',
      value: stats?.totalPosts ?? 0,
      meta: `Жалоб: ${stats?.reportedPosts ?? 0}`,
      icon: 'newspaper-outline',
      tint: '#6366f1',
    },
    {
      id: 'prompts',
      label: 'Промпты',
      value: stats?.totalPrompts ?? 0,
      meta: 'AI-шаблоны платформы',
      icon: 'chatbubbles-outline',
      tint: '#0ea5e9',
    },
  ];

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
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Администрирование</Text>
            <Text style={s.title}>Панель администратора</Text>
          </View>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={s.err}>{error}</Text>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>Статистика системы</Text>
        <View style={s.grid}>
          {statCards.map((card) => (
            <StatCard key={card.id} {...card} colors={colors} />
          ))}
        </View>

        <View style={s.platformCard}>
          <View style={s.cardHead}>
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
            <Text style={s.cardTitle}>Состояние платформы</Text>
          </View>

          <View style={s.systemRow}>
            <View style={s.systemBlock}>
              <Text style={s.blockLbl}>Режим обслуживания</Text>
              <Text style={s.blockVal}>
                {data?.system?.maintenance?.enabled ? 'Включён' : 'Выключен'}
              </Text>
              <Text style={s.blockSub}>
                {data?.system?.maintenance?.message || 'Сообщение не задано'}
              </Text>
            </View>

            <View style={s.systemBlock}>
              <Text style={s.blockLbl}>AI-провайдер</Text>
              <Text style={s.blockVal}>{data?.system?.ai?.activeProvider || 'gemini'}</Text>
              <Text style={s.blockSub}>Серверный провайдер генерации</Text>
            </View>
          </View>

          {data?.system?.featureFlags ? (
            <>
              <Text style={s.flagsTitle}>Флаги функций</Text>
              <View style={s.flags}>
                {Object.entries(data.system.featureFlags).map(([key, enabled]) => (
                  <View key={key} style={[s.flag, !enabled && s.flagOff]}>
                    <Ionicons
                      name={enabled ? 'checkmark-circle' : 'close-circle-outline'}
                      size={14}
                      color={enabled ? colors.accent : colors.ink3}
                    />
                    <Text style={[s.flagTxt, !enabled && s.flagTxtOff]}>
                      {FEATURE_FLAG_LABELS[key] || key}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>

        <View style={s.activityCard}>
          <View style={s.cardHead}>
            <Ionicons name="time-outline" size={20} color={colors.accent} />
            <Text style={s.cardTitle}>Последние действия</Text>
          </View>

          {(data?.recentActivity || []).length === 0 ? (
            <Text style={s.muted}>Пока действий админов нет.</Text>
          ) : (
            (data?.recentActivity || []).slice(0, 12).map((item, i) => (
              <View key={item.id || i} style={s.activity}>
                <View style={s.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.activityAction}>{item.action || 'Действие'}</Text>
                  <Text style={s.activitySub}>
                    {item.entityType} · {item.entityLabel || item.entityId || '—'}
                  </Text>
                  <Text style={s.activityMeta}>
                    @{item.actor?.username || 'admin'} · {fmtDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable
          style={s.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.ink} />
          <Text style={s.refreshBtnTxt}>Обновить данные</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

function cardStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    statCard: {
      width: '48%',
      flexGrow: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
      ...cardShadow,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    statVal: { fontSize: 28, fontWeight: '800', color: colors.ink },
    statLbl: { fontSize: 12, fontWeight: '600', color: colors.ink2, marginTop: 4 },
    statMeta: { fontSize: 11, color: colors.ink3, marginTop: 6, lineHeight: 16 },
  });
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: colors.ink3, fontSize: 14, marginTop: 8 },
    scroll: { padding: 20, paddingBottom: 40 },
    deniedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    deniedText: { color: colors.ink3, fontSize: 15, textAlign: 'center' },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 24,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 4 },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}11`,
      marginBottom: 16,
    },
    err: { color: colors.danger, flex: 1, fontSize: 14 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    platformCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 18,
      marginTop: 20,
      backgroundColor: colors.surface2,
      ...cardShadow,
    },
    activityCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 18,
      marginTop: 16,
      backgroundColor: colors.surface2,
      ...cardShadow,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    systemRow: { gap: 12 },
    systemBlock: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      backgroundColor: colors.surface,
    },
    blockLbl: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    blockVal: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 6 },
    blockSub: { fontSize: 12, color: colors.ink3, marginTop: 4, lineHeight: 18 },
    flagsTitle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 10,
    },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    flag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    flagOff: { borderColor: colors.line, backgroundColor: colors.surface },
    flagTxt: { fontSize: 11, fontWeight: '600', color: colors.accent },
    flagTxtOff: { color: colors.ink3 },
    muted: { color: colors.ink3, fontSize: 14 },
    activity: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginTop: 6,
    },
    activityAction: { fontSize: 14, fontWeight: '700', color: colors.ink },
    activitySub: { fontSize: 13, color: colors.ink2, marginTop: 3 },
    activityMeta: { fontSize: 12, color: colors.ink3, marginTop: 4 },
    refreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      backgroundColor: colors.surface2,
    },
    refreshBtnTxt: { fontWeight: '600', color: colors.ink, fontSize: 15 },
  });
}
