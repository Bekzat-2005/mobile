import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { fetchCareerDirections, type CareerDirection } from '../../api/career';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerDirections'>;

const GROUP_ORDER: string[] = [
  'Frontend',
  'Backend и API',
  'Fullstack и продукт',
  'Mobile',
  'QA и тестирование',
  'Data',
  'Platform и Infra',
];

type DirectionGroup = {
  label: string;
  items: CareerDirection[];
};

function groupCareerDirections(directions: CareerDirection[]): DirectionGroup[] {
  const map = new Map<string, CareerDirection[]>();
  for (const d of directions) {
    const label = typeof d.groupLabel === 'string' && d.groupLabel.trim() ? d.groupLabel.trim() : 'Другое';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(d);
  }

  const labels = Array.from(map.keys());
  labels.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ru');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return labels.map((label) => ({
    label,
    items: (map.get(label) || []).slice().sort((x, y) => {
      const lx = String(x.label || x.key);
      const ly = String(y.label || y.key);
      return lx.localeCompare(ly, 'ru');
    }),
  }));
}

function directionsCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'направлений';
  if (mod10 === 1) return 'направление';
  if (mod10 >= 2 && mod10 <= 4) return 'направления';
  return 'направлений';
}

function iconForGroup(label: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Frontend: 'color-palette-outline',
    'Backend и API': 'server-outline',
    'Fullstack и продукт': 'git-network-outline',
    Mobile: 'phone-portrait-outline',
    'QA и тестирование': 'shield-checkmark-outline',
    Data: 'analytics-outline',
    'Platform и Infra': 'cloud-outline',
    Другое: 'apps-outline',
  };
  return map[label] || 'folder-outline';
}

export default function CareerDirectionsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const [directions, setDirections] = useState<CareerDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  const groups = useMemo(() => groupCareerDirections(directions), [directions]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { directions: d } = await fetchCareerDirections(token);
      setDirections(d);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  function toggleGroup(label: string) {
    setExpandedLabel((prev) => (prev === label ? null : label));
  }

  function openDirection(item: CareerDirection) {
    const roles = Array.isArray(item.targetRoles) ? item.targetRoles : [];
    const defaultTargetRole = typeof roles[0] === 'string' ? roles[0] : 'Junior разработчик';
    navigation.navigate('CareerSessionSetup', {
      directionKey: item.key,
      directionLabel: String(item.label || item.key),
      defaultTargetRole,
    });
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.lead}>Нужна авторизация.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { flex: 1 }]} edges={['top']}>
      <FlatList
        style={{ flex: 1 }}
        data={groups}
        keyExtractor={(g) => g.label}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View style={s.hero}>
            <Text style={s.heroEyebrow}>Карьера</Text>
            <Text style={s.heroTitle}>План развития</Text>
            <Pressable style={s.sessionsLink} onPress={() => navigation.navigate('CareerSessions')}>
              <Text style={s.sessionsLinkText}>Мои сессии</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </Pressable>
          </View>
        }
        renderItem={({ item: group }) => {
          const open = expandedLabel === group.label;
          return (
            <View style={s.groupWrap}>
              <Pressable
                style={[s.groupHead, open && s.groupHeadOpen]}
                onPress={() => toggleGroup(group.label)}
              >
                <View style={s.groupIconWrap}>
                  <Ionicons name={iconForGroup(group.label)} size={22} color={colors.accent} />
                </View>
                <View style={s.groupHeadText}>
                  <Text style={s.groupTitle}>{group.label}</Text>
                  <Text style={s.groupMeta}>
                    {group.items.length} {directionsCountLabel(group.items.length)}
                  </Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.ink3} />
              </Pressable>
              {open ? (
                <View style={s.nested}>
                  {group.items.map((dir, idx) => (
                    <Pressable
                      key={dir.key}
                      style={({ pressed }) => [
                        s.dirRow,
                        idx === group.items.length - 1 && s.dirRowLast,
                        pressed && { opacity: 0.92 },
                      ]}
                      onPress={() => openDirection(dir)}
                    >
                      <View style={s.dirDot} />
                      <Text style={s.dirTitle}>{dir.label || dir.key}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.ink4} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    centered: { justifyContent: 'center', alignItems: 'center' },
    lead: { padding: 20, color: colors.ink2 },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    hero: {
      paddingTop: 4,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      marginBottom: 16,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    heroTitle: { fontSize: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
    sessionsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 14,
      alignSelf: 'flex-start',
    },
    sessionsLinkText: { fontSize: 15, fontWeight: '600', color: colors.accent },
    groupWrap: { marginBottom: 12 },
    groupHead: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surface2,
      gap: 12,
    },
    groupHeadOpen: { borderBottomWidth: 0, backgroundColor: colors.surface3 },
    groupIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupHeadText: { flex: 1, minWidth: 0 },
    groupTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    groupMeta: { fontSize: 13, color: colors.ink3, marginTop: 2 },
    nested: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    dirRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    dirRowLast: { borderBottomWidth: 0 },
    dirDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    dirTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  });
}
