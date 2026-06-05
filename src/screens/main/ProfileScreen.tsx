import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AuthUser } from '../../api/auth';
import { fetchCareerSessions } from '../../api/career';
import { fetchSkillAssessmentSessions } from '../../api/skill-assessment';
import { fetchPublicSocialProfile } from '../../api/social';
import {
  fetchPointsHistory,
  updateCurrentUserProfile,
  type PointsHistoryEntry,
} from '../../api/users';
import { formatCareerStatus, formatSkillStatus, formatUserRole } from '../../lib/status-labels';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

function splitDisplayName(full?: string) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function formatRuDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatRuDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function sessionIdOf(s: Record<string, unknown>): string {
  return String(s.id ?? s._id ?? '');
}

function buildEditForm(user: AuthUser | null) {
  const { firstName, lastName } = splitDisplayName(user?.name);
  const contact = user?.contactInfo;
  return {
    username: user?.username || '',
    firstName,
    lastName,
    aboutMe: user?.aboutMe || '',
    github: contact?.github || '',
  };
}

export default function ProfileScreen() {
  const { colors, toggle, mode } = useAppTheme();
  const { user, logout, token, refreshUser } = useAuth();
  const navigation = useNavigation();
  const s = styles(colors);

  const [extrasLoading, setExtrasLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [socialProfile, setSocialProfile] = useState<Record<string, unknown> | null>(null);
  const [pointsData, setPointsData] = useState<{ balance: number; history: PointsHistoryEntry[] } | null>(
    null,
  );
  const [careerSessions, setCareerSessions] = useState<Record<string, unknown>[]>([]);
  const [skillSessions, setSkillSessions] = useState<Record<string, unknown>[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(buildEditForm(user));
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadExtras = useCallback(async () => {
    if (!token || !user?.id) {
      setSocialProfile(null);
      setPointsData(null);
      setCareerSessions([]);
      setSkillSessions([]);
      return;
    }
    setExtrasLoading(true);
    try {
      const [soc, pts, career, skill] = await Promise.all([
        fetchPublicSocialProfile(user.id, token),
        fetchPointsHistory(token, 25),
        fetchCareerSessions(token),
        fetchSkillAssessmentSessions(token),
      ]);
      setSocialProfile(soc.profile || null);
      setPointsData({ balance: pts.balance, history: pts.history || [] });
      setCareerSessions((career.sessions as Record<string, unknown>[]) || []);
      setSkillSessions((skill.sessions as Record<string, unknown>[]) || []);
    } catch {
      setSocialProfile(null);
    } finally {
      setExtrasLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadExtras();
    }, [loadExtras]),
  );

  useEffect(() => {
    if (!editOpen) setEditForm(buildEditForm(user));
  }, [user, editOpen]);

  const reputationScore = useMemo(() => {
    const rep = socialProfile?.reputation as { score?: number } | undefined;
    return typeof rep?.score === 'number' ? rep.score : null;
  }, [socialProfile]);

  const social = socialProfile?.social as { followers?: unknown[]; following?: unknown[] } | undefined;
  const followersLen = Array.isArray(social?.followers) ? social.followers.length : 0;
  const followingLen = Array.isArray(social?.following) ? social.following.length : 0;

  const pointsBalance = pointsData?.balance ?? user?.points ?? 0;

  const initial = useMemo(() => {
    const raw = user?.username || user?.name || user?.email || '?';
    return String(raw).charAt(0).toUpperCase();
  }, [user]);

  const goAuth = (screen: 'Login' | 'Register') => {
    navigation.navigate(screen as never);
  };

  function openLearn(screen: string, params?: Record<string, string>) {
    if (params) {
      navigation.navigate('Learn' as never, { screen, params } as never);
    } else {
      navigation.navigate('Learn' as never, { screen } as never);
    }
  }

  const openLeaderboard = () => {
    navigation.navigate('Community' as never, { screen: 'Leaderboard' } as never);
  };

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshUser();
      await loadExtras();
    } finally {
      setRefreshing(false);
    }
  }

  function openAdmin() {
    navigation.navigate('AdminDashboard' as never);
  }

  async function saveProfile() {
    if (!token || !user) return;
    setSaveError('');
    setSaving(true);
    try {
      const name = [editForm.firstName, editForm.lastName]
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' ');
      const payload: Record<string, unknown> = {
        name,
        username: editForm.username.trim(),
        aboutMe: editForm.aboutMe.trim(),
        contactInfo: {
          phone: user.contactInfo?.phone || '',
          telegram: user.contactInfo?.telegram || '',
          linkedin: user.contactInfo?.linkedin || '',
          github: editForm.github.trim(),
          visibility: user.contactInfo?.visibility || {
            phone: false,
            telegram: false,
            linkedin: false,
            github: true,
          },
        },
      };
      await updateCurrentUserProfile(payload, token);
      await refreshUser();
      setEditOpen(false);
      await loadExtras();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  const careerPreview = careerSessions.slice(0, 4);
  const skillPreview = skillSessions.slice(0, 4);
  const historyPreview = (pointsData?.history || []).slice(0, 8);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerRow}>
          <Text style={s.title}>Профиль</Text>
          <Pressable onPress={toggle} hitSlop={12} accessibilityLabel="Переключить тему">
            <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.ink} />
          </Pressable>
        </View>

        {!user || !token ? (
          <View style={s.card}>
            <Text style={s.lead}>Войдите, чтобы видеть профиль, очки и активность.</Text>
            <Pressable style={s.primary} onPress={() => goAuth('Login')}>
              <Text style={s.primaryText}>Войти</Text>
            </Pressable>
            <Pressable style={s.outline} onPress={() => goAuth('Register')}>
              <Text style={s.outlineText}>Регистрация</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.hero}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{initial}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.displayName}>{user.name || user.username || 'Профиль'}</Text>
                <Text style={s.handle}>@{user.username || '—'}</Text>
                {user.role ? (
                  <Text style={s.rolePill}>{formatUserRole(String(user.role))}</Text>
                ) : null}
                {user.createdAt ? (
                  <Text style={s.joined}>На платформе с {formatRuDate(user.createdAt)}</Text>
                ) : null}
              </View>
            </View>

            <Pressable style={s.editProfileBtn} onPress={() => setEditOpen(true)}>
              <Ionicons name="create-outline" size={18} color={colors.ink} />
              <Text style={s.editProfileBtnTxt}>Редактировать профиль</Text>
            </Pressable>

            {user.role === 'admin' ? (
              <Pressable style={s.adminBtn} onPress={openAdmin}>
                <Ionicons name="shield-outline" size={18} color={colors.accent} />
                <Text style={s.adminBtnTxt}>Панель администратора</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
            ) : null}

            {extrasLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.accent} />
            ) : null}

            {/* Репутация и очки */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Репутация и очки</Text>
              <View style={s.metricsGrid}>
                <View style={s.metricCell}>
                  <Text style={s.metricVal}>{pointsBalance}</Text>
                  <Text style={s.metricLbl}>очков</Text>
                </View>
                {reputationScore != null ? (
                  <View style={s.metricCell}>
                    <Text style={s.metricVal}>{reputationScore}</Text>
                    <Text style={s.metricLbl}>репутация</Text>
                  </View>
                ) : (
                  <View style={s.metricCell}>
                    <Text style={s.metricVal}>—</Text>
                    <Text style={s.metricLbl}>репутация</Text>
                  </View>
                )}
                <View style={s.metricCell}>
                  <Text style={s.metricVal}>{followersLen}</Text>
                  <Text style={s.metricLbl}>подписчики</Text>
                </View>
                <View style={s.metricCell}>
                  <Text style={s.metricVal}>{followingLen}</Text>
                  <Text style={s.metricLbl}>подписки</Text>
                </View>
              </View>
              <Pressable style={s.linkBtn} onPress={openLeaderboard}>
                <Text style={s.linkBtnText}>Лидерборд</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </Pressable>
            </View>

            {/* История очков */}
            {historyPreview.length ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>История очков</Text>
                {historyPreview.map((h, i) => (
                  <View key={String(h.id ?? i)} style={s.historyRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.historyTitle} numberOfLines={2}>
                        {String(h.title || h.reasonKey || 'Начисление')}
                      </Text>
                      <Text style={s.historyDate}>{formatRuDateTime(h.createdAt as string)}</Text>
                    </View>
                    <Text
                      style={[
                        s.historyAmt,
                        (Number(h.amount) || 0) < 0 ? { color: colors.danger } : { color: colors.success },
                      ]}
                    >
                      {(Number(h.amount) || 0) > 0 ? '+' : ''}
                      {Number(h.amount) || 0}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* О себе (read-only кратко) */}
            {(user.aboutMe || user.location || (user.techStack && user.techStack.length > 0)) ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>О себе</Text>
                {user.aboutMe ? <Text style={s.bodyText}>{user.aboutMe}</Text> : null}
                {user.location ? (
                  <Text style={s.metaLine}>
                    <Text style={s.metaBold}>Локация: </Text>
                    {user.location}
                  </Text>
                ) : null}
                {user.techStack && user.techStack.length > 0 ? (
                  <View style={s.tagsWrap}>
                    {user.techStack.slice(0, 12).map((t) => (
                      <Text key={t} style={s.tag}>
                        {t}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {user.additionalInfo ? <Text style={s.bodyTextMuted}>{user.additionalInfo}</Text> : null}
              </View>
            ) : (
              <View style={s.section}>
                <Text style={s.sectionTitle}>О себе</Text>
                <Text style={s.placeholder}>Добавьте описание и стек — кнопка «карандаш» выше.</Text>
              </View>
            )}

            {/* Обучение */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Обучение</Text>
              <Pressable style={s.navRow} onPress={() => openLearn('CareerDirections')}>
                <Ionicons name="git-branch-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>План развития и дорожные карты</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('CareerSessions')}>
                <Ionicons name="map-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Мои карьерные сессии ({careerSessions.length})</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('SkillDomains')}>
                <Ionicons name="speedometer-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Оценка навыков</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('SkillSessions')}>
                <Ionicons name="ribbon-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Мои оценки ({skillSessions.length})</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('StudyRoadmap')}>
                <Ionicons name="book-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Roadmap по теме (ИИ)</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('InterviewHub')}>
                <Ionicons name="mic-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Тренировка интервью</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('Analytics')}>
                <Ionicons name="stats-chart-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>Аналитика</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
              <Pressable style={s.navRow} onPress={() => openLearn('Assistant')}>
                <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
                <Text style={s.navRowText}>AI-ассистент</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
              </Pressable>
            </View>

            {/* Сессии карьеры */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Карьерные сессии</Text>
              {careerPreview.length === 0 ? (
                <Text style={s.placeholder}>Пока нет сессий. Откройте «План развития».</Text>
              ) : (
                careerPreview.map((sess) => {
                  const id = sessionIdOf(sess);
                  const status = String(sess.status || '');
                  return (
                    <Pressable
                      key={id || Math.random().toString()}
                      style={s.sessionRow}
                      onPress={() => id && openLearn('CareerSessionDetail', { sessionId: id })}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.sessionTitle} numberOfLines={1}>
                          {String(sess.directionKey || sess.targetRole || 'Сессия')}
                        </Text>
                        <Text style={s.sessionMeta}>{formatCareerStatus(status)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.ink3} />
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Оценки навыков */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Сессии оценки навыков</Text>
              {skillPreview.length === 0 ? (
                <Text style={s.placeholder}>Пока нет оценок. Раздел «Оценка навыков».</Text>
              ) : (
                skillPreview.map((sess) => {
                  const id = sessionIdOf(sess);
                  const status = String(sess.status || '');
                  return (
                    <Pressable
                      key={id || Math.random().toString()}
                      style={s.sessionRow}
                      onPress={() => id && openLearn('SkillSessionDetail', { sessionId: id })}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.sessionTitle} numberOfLines={1}>
                          {String(sess.domainKey || 'Навык')}
                        </Text>
                        <Text style={s.sessionMeta}>{formatSkillStatus(status)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.ink3} />
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Контакты (если есть) */}
            {user.contactInfo && (user.contactInfo.phone || user.contactInfo.telegram) ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Контакты</Text>
                {user.contactInfo.phone ? (
                  <Text style={s.metaLine}>{user.contactInfo.phone}</Text>
                ) : null}
                {user.contactInfo.telegram ? (
                  <Text style={s.metaLine}>{user.contactInfo.telegram}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Проверенные навыки */}
            {user.verifiedSkills && user.verifiedSkills.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Подтверждённые навыки</Text>
                {user.verifiedSkills.slice(0, 8).map((vs, i) => (
                  <Text key={i} style={s.metaLine}>
                    {typeof vs === 'object' && vs && 'domainKey' in vs
                      ? String((vs as { domainKey?: string }).domainKey)
                      : JSON.stringify(vs)}
                  </Text>
                ))}
              </View>
            ) : null}

            <Pressable style={s.logout} onPress={() => logout()}>
              <Text style={s.logoutText}>Выйти</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={editOpen}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setEditOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.modalHead, { borderBottomColor: colors.line }]}>
            <Pressable onPress={() => setEditOpen(false)} hitSlop={12}>
              <Text style={s.modalCancel}>Отмена</Text>
            </Pressable>
            <Text style={s.modalTitle}>Редактирование профиля</Text>
            <Pressable onPress={saveProfile} disabled={saving} hitSlop={12}>
              {saving ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={s.modalSave}>Сохранить</Text>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLbl}>Username</Text>
            <TextInput
              style={s.fieldIn}
              value={editForm.username}
              autoCapitalize="none"
              onChangeText={(t) => setEditForm((f) => ({ ...f, username: t }))}
              placeholder="@username"
              placeholderTextColor={colors.ink3}
            />
            <Text style={s.fieldLbl}>Имя</Text>
            <TextInput
              style={s.fieldIn}
              value={editForm.firstName}
              onChangeText={(t) => setEditForm((f) => ({ ...f, firstName: t }))}
              placeholderTextColor={colors.ink3}
            />
            <Text style={s.fieldLbl}>Фамилия</Text>
            <TextInput
              style={s.fieldIn}
              value={editForm.lastName}
              onChangeText={(t) => setEditForm((f) => ({ ...f, lastName: t }))}
              placeholderTextColor={colors.ink3}
            />
            <Text style={s.fieldLbl}>О себе</Text>
            <TextInput
              style={[s.fieldIn, s.fieldArea]}
              value={editForm.aboutMe}
              onChangeText={(t) => setEditForm((f) => ({ ...f, aboutMe: t }))}
              multiline
              placeholder="Кратко о себе и целях"
              placeholderTextColor={colors.ink3}
            />
            <Text style={s.fieldLbl}>Ссылка на GitHub</Text>
            <TextInput
              style={s.fieldIn}
              value={editForm.github}
              autoCapitalize="none"
              onChangeText={(t) => setEditForm((f) => ({ ...f, github: t }))}
              placeholder="https://github.com/username"
              placeholderTextColor={colors.ink3}
            />
            {saveError ? <Text style={s.saveErr}>{saveError}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 20, paddingBottom: 48 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.ink },
    lead: { fontSize: 15, color: colors.ink2, lineHeight: 22, marginBottom: 16 },
    primary: {
      backgroundColor: colors.ink,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
    outline: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface2,
    },
    outlineText: { color: colors.ink, fontWeight: '600', fontSize: 16 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      backgroundColor: colors.surface2,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      marginBottom: 20,
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: { fontSize: 26, fontWeight: '700', color: colors.accent },
    displayName: { fontSize: 20, fontWeight: '700', color: colors.ink },
    handle: { fontSize: 14, color: colors.ink2, marginTop: 2 },
    rolePill: {
      alignSelf: 'flex-start',
      marginTop: 8,
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink2,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 8,
      paddingVertical: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    joined: { fontSize: 12, color: colors.ink3, marginTop: 8 },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    editProfileBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.ink },
    adminBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.accentMuted,
      backgroundColor: colors.accentMuted,
    },
    adminBtnTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.accent },
    section: {
      marginBottom: 22,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.ink3,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCell: {
      width: '47%',
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      backgroundColor: colors.surface2,
    },
    metricVal: { fontSize: 22, fontWeight: '700', color: colors.ink },
    metricLbl: { fontSize: 11, color: colors.ink3, marginTop: 4 },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.line,
    },
    linkBtnText: { fontSize: 15, fontWeight: '600', color: colors.accent },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: 12,
    },
    historyTitle: { fontSize: 14, color: colors.ink, fontWeight: '500' },
    historyDate: { fontSize: 11, color: colors.ink3, marginTop: 4 },
    historyAmt: { fontSize: 15, fontWeight: '700' },
    bodyText: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    bodyTextMuted: { fontSize: 14, color: colors.ink3, lineHeight: 20, marginTop: 10 },
    metaLine: { fontSize: 14, color: colors.ink2, marginTop: 8 },
    metaBold: { fontWeight: '700', color: colors.ink },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    tag: {
      fontSize: 12,
      color: colors.accent,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surface2,
    },
    placeholder: { fontSize: 14, color: colors.ink3, lineHeight: 20 },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    navRowText: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: 8,
    },
    sessionTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    sessionMeta: { fontSize: 12, color: colors.ink3, marginTop: 2 },
    logout: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 14,
      alignItems: 'center',
    },
    logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalCancel: { fontSize: 16, color: colors.ink2 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    modalSave: { fontSize: 16, fontWeight: '700', color: colors.accent },
    modalBody: { padding: 16, paddingBottom: 40 },
    fieldLbl: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.ink3,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
      marginTop: 12,
    },
    fieldIn: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 12,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface2,
    },
    fieldArea: { minHeight: 88, textAlignVertical: 'top' },
    saveErr: { color: colors.danger, marginTop: 16, fontSize: 14 },
  });
}
