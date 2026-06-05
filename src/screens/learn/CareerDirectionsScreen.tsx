import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { createCareerSession, fetchCareerDirections, type CareerDirection } from '../../api/career';
import { defaultCareerProfile } from '../../constants/career-defaults';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'CareerDirections'>;

/** Порядок секций как на бэкенде (career-directions): сначала ключевые области. */
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

function sessionIdOf(s: Record<string, unknown>) {
  return String(s.id ?? s._id ?? '');
}

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
  const [pick, setPick] = useState<CareerDirection | null>(null);
  const [targetRole, setTargetRole] = useState('Junior разработчик');
  const [mode, setMode] = useState<'start_from_zero' | 'assessment'>('start_from_zero');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
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
    setTargetRole(typeof roles[0] === 'string' ? roles[0] : 'Junior разработчик');
    setPick(item);
  }

  async function confirmCreate() {
    if (!token || !pick) return;
    setErr('');
    setCreating(true);
    try {
      const { session } = await createCareerSession(
        {
          directionKey: pick.key,
          targetRole: targetRole.trim(),
          onboardingMode: mode,
          profile: { ...defaultCareerProfile },
        },
        token,
      );
      const id = sessionIdOf(session);
      setPick(null);
      navigation.navigate('CareerSessionDetail', { sessionId: id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
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
            <Text style={s.heroLead}>
              Сначала выберите область (например, Frontend или Backend). Затем откроются связанные специализации —
              нажмите на нужную, чтобы начать дорожную карту.
            </Text>
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
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
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
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.ink3}
                />
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
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.dirTitle}>{dir.label || dir.key}</Text>
                        {dir.description ? (
                          <Text style={s.dirDesc} numberOfLines={3}>
                            {String(dir.description)}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.ink4} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={!!pick} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{pick?.label}</Text>
            {pick?.description ? (
              <Text style={s.modalDesc} numberOfLines={5}>
                {String(pick.description)}
              </Text>
            ) : null}
            <Text style={s.label}>Целевая роль</Text>
            <TextInput
              style={s.input}
              value={targetRole}
              onChangeText={setTargetRole}
              placeholderTextColor={colors.ink3}
            />
            <Text style={s.label}>Режим</Text>
            <View style={s.modeRow}>
              <Pressable
                style={[s.modeBtn, mode === 'start_from_zero' && s.modeOn]}
                onPress={() => setMode('start_from_zero')}
              >
                <Text style={s.modeTxt}>С нуля</Text>
              </Pressable>
              <Pressable style={[s.modeBtn, mode === 'assessment' && s.modeOn]} onPress={() => setMode('assessment')}>
                <Text style={s.modeTxt}>Через тест</Text>
              </Pressable>
            </View>
            {err ? <Text style={s.err}>{err}</Text> : null}
            <View style={s.modalActions}>
              <Pressable
                style={s.cancel}
                onPress={() => {
                  setErr('');
                  setPick(null);
                }}
              >
                <Text style={s.cancelTxt}>Отмена</Text>
              </Pressable>
              <Pressable style={[s.ok, creating && { opacity: 0.6 }]} disabled={creating} onPress={confirmCreate}>
                <Text style={s.okTxt}>{creating ? '…' : 'Создать план'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    heroLead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginTop: 10 },
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
    groupHeadOpen: {
      borderBottomWidth: 0,
      backgroundColor: colors.surface3,
    },
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
      alignItems: 'flex-start',
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
      marginTop: 7,
    },
    dirTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    dirDesc: { fontSize: 13, color: colors.ink2, marginTop: 4, lineHeight: 18 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalCard: {
      backgroundColor: colors.surface,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.line,
      maxHeight: '88%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    modalDesc: { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 12 },
    label: { fontSize: 12, color: colors.ink3, marginBottom: 6, marginTop: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      color: colors.ink,
      fontSize: 16,
    },
    modeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    modeBtn: { flex: 1, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: 'center' },
    modeOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    modeTxt: { color: colors.ink, fontWeight: '600' },
    err: { color: colors.danger, marginTop: 10, fontSize: 13 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
    cancel: { paddingVertical: 10, paddingHorizontal: 16 },
    cancelTxt: { color: colors.ink2 },
    ok: { backgroundColor: colors.ink, paddingVertical: 10, paddingHorizontal: 20 },
    okTxt: { color: colors.surface, fontWeight: '700' },
  });
}
