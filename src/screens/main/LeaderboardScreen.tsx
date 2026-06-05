import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

import type { LeaderboardEntry } from '../../api/leaderboard';
import { fetchLeaderboard } from '../../api/leaderboard';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

function rankLabel(rank: number) {
  return `#${rank}`;
}

function displayName(entry: LeaderboardEntry) {
  const u = entry.username || entry.name || 'участник';
  return u.startsWith('@') ? u : `@${u}`;
}

export default function LeaderboardScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation<{ navigate: (n: string) => void; getParent: () => { navigate: (n: string, p?: object) => void } | undefined }>();
  const s = styles(colors);

  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { leaderboard } = await fetchLeaderboard();
      setRows(Array.isArray(leaderboard) ? leaderboard : []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Не удалось загрузить рейтинг');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentUserEntry = user?.id ? rows.find((e) => e.id === user.id) : undefined;
  const topThree = rows.slice(0, 3);

  function goDailyTasks() {
    navigation.navigate('DailyTasks');
  }

  function goLearn() {
    navigation.getParent()?.navigate('Learn', { screen: 'LearnHub' });
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
        }
      >
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Достижения</Text>
          <Text style={s.heroTitle}>Рейтинг</Text>
          <Text style={s.heroCopy}>
            Таблица участников по очкам. Выполняйте ежедневные задания, набирайте баллы и поднимайтесь в общем топе.
          </Text>
          <Pressable style={s.heroCta} onPress={goLearn}>
            <Ionicons name="rocket-outline" size={18} color={colors.accent} />
            <Text style={s.heroCtaTxt}>К развитию и практике</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <Pressable style={s.sideCard} onPress={goDailyTasks}>
          <Text style={s.sideLabel}>Задание дня</Text>
          <Text style={s.sideTitle}>4 вопроса, один короткий тест</Text>
          <Text style={s.sideBody}>
            Выберите направление, выполните задание и получите очки за правильные ответы. Одно задание в день на
            направление.
          </Text>
          <View style={s.sideCta}>
            <Text style={s.sideCtaTxt}>Открыть ежедневные задания</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </View>
        </Pressable>

        {topThree.length > 0 ? (
          <View style={s.sideCard}>
            <Text style={s.sideLabel}>Топ сегодня</Text>
            {topThree.map((entry) => (
              <View key={entry.id} style={s.topRow}>
                <Text style={s.topRank}>{rankLabel(entry.rank)}</Text>
                <Text style={s.topName} numberOfLines={1}>
                  {displayName(entry)}
                </Text>
                <Text style={s.topPts}>{entry.points}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.boardHead}>
          <View>
            <Text style={s.boardKicker}>Лидеры</Text>
            <Text style={s.boardHint}>Обновляется по набранным очкам</Text>
          </View>
          <Pressable style={s.refreshBtn} onPress={() => { setRefreshing(true); void load(); }} hitSlop={10}>
            <Ionicons name="refresh" size={18} color={colors.accent} />
            <Text style={s.refreshTxt}>Обновить</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={s.errBanner}>
            <Text style={s.errText}>{error}</Text>
          </View>
        ) : null}

        {currentUserEntry ? (
          <View style={s.youRow}>
            <Text style={s.youLabel}>Ваше место</Text>
            <Text style={s.youRank}>{rankLabel(currentUserEntry.rank)}</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.youPts}>{currentUserEntry.points} очков</Text>
          </View>
        ) : null}

        {rows.length === 0 && !error ? (
          <Text style={s.empty}>Пока никто не набрал очков. Начните первым.</Text>
        ) : null}

        {rows.map((entry) => {
          const isMe = Boolean(user?.id && entry.id === user.id);
          const isTop = entry.rank <= 3;
          return (
            <View
              key={entry.id}
              style={[s.row, isMe && s.rowMe, isTop && s.rowTop]}
            >
              <Text style={[s.rank, isTop && s.rankTop]}>{rankLabel(entry.rank)}</Text>
              <Text style={[s.name, (isMe || isTop) && s.nameStrong]} numberOfLines={1}>
                {displayName(entry)}
              </Text>
              <Text style={s.pts}>
                {entry.points}
                <Text style={s.ptsSmall}> очков</Text>
              </Text>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    scroll: { paddingBottom: 40 },
    hero: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    heroTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
    heroCopy: {
      fontSize: 15,
      color: colors.ink2,
      lineHeight: 22,
      marginTop: 12,
    },
    heroCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    heroCtaTxt: { fontSize: 14, fontWeight: '700', color: colors.accent },
    sideCard: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    sideLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    sideTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 8 },
    sideBody: { fontSize: 14, color: colors.ink2, lineHeight: 21 },
    sideCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      alignSelf: 'flex-start',
    },
    sideCtaTxt: { fontSize: 14, fontWeight: '700', color: colors.accent },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      gap: 10,
    },
    topRank: { fontSize: 13, fontWeight: '800', color: colors.ink3, width: 40, fontVariant: ['tabular-nums'] },
    topName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    topPts: { fontSize: 13, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    boardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      marginTop: 8,
    },
    boardKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: colors.ink,
      textTransform: 'uppercase',
    },
    boardHint: { fontSize: 13, color: colors.ink3, marginTop: 4 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    refreshTxt: { fontSize: 14, fontWeight: '600', color: colors.accent },
    errBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.surface2,
    },
    errText: { color: colors.danger, fontSize: 14 },
    youRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.ink,
    },
    youLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
    },
    youRank: { fontSize: 16, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    youPts: { fontSize: 13, color: colors.ink3 },
    empty: { textAlign: 'center', color: colors.ink3, marginTop: 24, paddingHorizontal: 24, fontSize: 15 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: 10,
    },
    rowMe: { backgroundColor: colors.accentMuted },
    rowTop: {},
    rank: {
      width: 44,
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink3,
      fontVariant: ['tabular-nums'],
    },
    rankTop: { color: colors.ink },
    name: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '500' },
    nameStrong: { fontWeight: '800' },
    pts: { fontSize: 15, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    ptsSmall: { fontSize: 12, fontWeight: '500', color: colors.ink3 },
  });
}
