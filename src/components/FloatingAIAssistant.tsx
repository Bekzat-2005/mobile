import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigationState } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAssistantOverlay } from '../context/AssistantOverlayContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAssistantChat } from '../hooks/useAssistantChat';

const SHEET_HEIGHT_RATIO = 0.68;
const TAB_BAR_CLEARANCE = 64;

const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  CareerDirections: ['Как составить план развития?', 'С чего начать карьерный путь?'],
  CareerSessionDetail: ['Как пройти текущую тему?', 'Что учить дальше по плану?'],
  VacancyDetail: ['Подхожу ли я под эту вакансию?', 'Какие навыки подтянуть?'],
  VacancyAssessment: ['Как лучше ответить на этот вопрос?', 'На что обратить внимание?'],
  InterviewSessionDetail: ['Как улучшить ответ на интервью?', 'Какие темы часто спрашивают?'],
  Analytics: ['Что означают мои показатели?', 'Где слабые места?'],
  SkillSessionDetail: ['Объясни этот вопрос простыми словами.', 'Как подготовиться к оценке?'],
  LearnHub: ['С чего начать в Skillo?', 'Что изучать дальше?'],
  Home: ['С чего начать в Skillo?', 'Как улучшить результаты тестов?'],
  Profile: ['Как улучшить профиль?', 'Что изучать дальше?'],
};

const DEFAULT_SUGGESTIONS = [
  'С чего начать в Skillo?',
  'Что изучать дальше?',
  'Как улучшить результаты тестов?',
];

function getActiveRouteName(state: unknown): string {
  let current = state as { routes?: { name: string; state?: unknown }[]; index?: number } | undefined;
  if (!current) return '';
  while (current.routes && current.index != null) {
    const route = current.routes[current.index];
    if (!route?.state) return String(route?.name || '');
    current = route.state as typeof current;
  }
  return '';
}

function FabIcon() {
  return (
    <View style={fabStyles.wrap}>
      <Svg width={56} height={56} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="fabGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3b6bff" />
            <Stop offset="1" stopColor="#22c55e" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="56" rx="28" fill="url(#fabGrad)" />
      </Svg>
      <MaterialCommunityIcons name="brain" size={26} color="#ffffff" />
    </View>
  );
}

const fabStyles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function FloatingAIAssistant() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const { isOpen, open, close } = useAssistantOverlay();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => styles(colors), [colors]);

  const routeName = useNavigationState(getActiveRouteName);
  const suggestions = ROUTE_SUGGESTIONS[routeName] || DEFAULT_SUGGESTIONS;

  const {
    messages,
    input,
    setInput,
    sending,
    err,
    listRef,
    scrollToEnd,
    send,
    clearHistory,
  } = useAssistantChat(token);

  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;
  const fabBottom = insets.bottom + TAB_BAR_CLEARANCE;

  return (
    <>
      {!isOpen ? (
        <Pressable
          style={[s.fab, { bottom: fabBottom, right: 16 }]}
          onPress={open}
          accessibilityLabel="Ваш AI Ассистент"
          accessibilityRole="button"
        >
          <FabIcon />
        </Pressable>
      ) : null}

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={close}>
        <View style={s.backdrop}>
          <Pressable style={s.backdropTap} onPress={close} accessibilityLabel="Закрыть чат" />

          <KeyboardAvoidingView
            style={[s.sheet, { height: sheetHeight, paddingBottom: insets.bottom + 8 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            <View style={s.sheetHead}>
              <View style={s.headIconWrap}>
                <MaterialCommunityIcons name="brain" size={20} color={colors.accentSolid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Ваш AI Ассистент</Text>
                <Text style={s.sheetSub}>
                  {routeName ? `Контекст: ${routeName}` : 'Всегда под рукой'}
                </Text>
              </View>
              <Pressable onPress={close} hitSlop={12} accessibilityLabel="Закрыть">
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            {!token ? (
              <View style={s.authBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
                <Text style={s.authHint}>Войдите в аккаунт, чтобы общаться с ассистентом.</Text>
              </View>
            ) : null}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={s.list}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
                  {item.role === 'assistant' ? (
                    <View style={s.aiLabelRow}>
                      <MaterialCommunityIcons name="brain" size={12} color={colors.accentSolid} />
                      <Text style={s.aiLabel}>Skillo AI</Text>
                    </View>
                  ) : null}
                  <Text style={[s.bubbleTxt, item.role === 'user' && s.bubbleTxtUser]}>{item.content}</Text>
                </View>
              )}
              onContentSizeChange={scrollToEnd}
            />

            <View style={s.chips}>
              {suggestions.map((chip) => (
                <Pressable key={chip} style={s.chip} onPress={() => void send(chip)} disabled={sending}>
                  <Text style={s.chipTxt} numberOfLines={2}>
                    {chip}
                  </Text>
                </Pressable>
              ))}
            </View>

            {err ? <Text style={s.err}>{err}</Text> : null}

            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Напишите сообщение…"
                placeholderTextColor={colors.ink3}
                editable={!sending}
                multiline
                maxLength={4000}
              />
              <Pressable
                style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
                onPress={() => void send(input)}
                disabled={!input.trim() || sending}
                accessibilityLabel="Отправить"
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color="#ffffff" />
                )}
              </Pressable>
            </View>

            <Pressable style={s.clearBtn} onPress={() => void clearHistory()}>
              <Ionicons name="trash-outline" size={14} color={colors.ink3} />
              <Text style={s.clearBtnTxt}>Очистить историю</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      width: 56,
      height: 56,
      borderRadius: 28,
      elevation: 8,
      shadowColor: '#3b6bff',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      zIndex: 100,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdropTap: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 16,
    },
    handleRow: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 4,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.line,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      marginBottom: 8,
    },
    headIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
    sheetSub: { fontSize: 12, color: colors.ink3, marginTop: 2 },
    authBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      marginBottom: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    authHint: { flex: 1, fontSize: 13, color: colors.ink2, lineHeight: 18 },
    list: { flex: 1 },
    listContent: { paddingVertical: 8, gap: 10 },
    bubble: {
      maxWidth: '88%',
      padding: 12,
      borderRadius: 14,
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accentSolid,
      borderBottomRightRadius: 4,
    },
    bubbleAi: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.line,
      borderBottomLeftRadius: 4,
    },
    aiLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    aiLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.accentSolid,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bubbleTxt: { fontSize: 15, color: colors.ink2, lineHeight: 22 },
    bubbleTxtUser: { color: '#ffffff' },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    chip: {
      maxWidth: '48%',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    chipTxt: { fontSize: 12, color: colors.ink2, lineHeight: 16 },
    err: { color: colors.danger, fontSize: 12, marginBottom: 6 },
    inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      backgroundColor: colors.surface2,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentSolid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    clearBtnTxt: { fontSize: 12, color: colors.ink3 },
  });
}
