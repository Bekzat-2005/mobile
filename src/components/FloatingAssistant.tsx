import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigationState } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sendAssistantChat } from '../api/assistant';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const STORAGE_KEY = 'skillo_assistant_messages_v1';

type ChatItem = { id: string; role: 'user' | 'assistant'; content: string };

const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  VacancyDetail: [
    'Подхожу ли я под эту вакансию?',
    'Какие навыки нужно подтянуть?',
    'Как подготовиться к интервью?',
  ],
  VacancyAssessment: [
    'Как лучше ответить на этот вопрос?',
    'На что обратить внимание в оценке?',
  ],
  InterviewSessionDetail: [
    'Как лучше ответить на вопрос интервью?',
    'Какие темы часто спрашивают?',
  ],
  Analytics: [
    'Что означают мои показатели?',
    'Где у меня слабые места?',
  ],
  SkillSessionDetail: [
    'Как подготовиться к этой оценке?',
    'Объясни этот вопрос простыми словами.',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'С чего начать в Skillo?',
  'Что изучать дальше?',
  'Как улучшить результаты тестов?',
];

function welcomeMessage(): ChatItem {
  return {
    id: 'welcome',
    role: 'assistant',
    content: 'Я AI-ассистент Skillo. Задай вопрос по обучению, вакансиям или тестам.',
  };
}

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

export function FloatingAssistant() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const s = styles(colors);

  const routeName = useNavigationState(getActiveRouteName);
  const suggestions = ROUTE_SUGGESTIONS[routeName] || DEFAULT_SUGGESTIONS;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<FlatList<ChatItem>>(null);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ChatItem[];
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!token) {
      setErr('Войдите в аккаунт для чата с ассистентом.');
      return;
    }

    setErr('');
    setSending(true);
    const userMsg: ChatItem = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const next = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages(next);
    setInput('');
    scrollToEnd();

    try {
      const apiMessages = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendAssistantChat(apiMessages, token);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply || 'Пустой ответ.' },
      ]);
      scrollToEnd();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 72, right: 16 }]}
        onPress={() => setOpen(true)}
        accessibilityLabel="AI Ассистент"
      >
        <Ionicons name="sparkles" size={22} color={colors.surface} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <KeyboardAvoidingView
            style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={s.sheetHead}>
              <View>
                <Text style={s.sheetTitle}>AI Ассистент</Text>
                <Text style={s.sheetSub}>Контекст: {routeName || 'приложение'}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            {!token ? (
              <Text style={s.authHint}>Войдите в аккаунт, чтобы общаться с ассистентом.</Text>
            ) : null}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={s.list}
              contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
              renderItem={({ item }) => (
                <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
                  <Text style={[s.bubbleTxt, item.role === 'user' && s.bubbleTxtUser]}>{item.content}</Text>
                </View>
              )}
              onContentSizeChange={scrollToEnd}
            />

            <View style={s.chips}>
              {suggestions.map((chip) => (
                <Pressable key={chip} style={s.chip} onPress={() => void send(chip)}>
                  <Text style={s.chipTxt}>{chip}</Text>
                </Pressable>
              ))}
            </View>

            {err ? <Text style={s.err}>{err}</Text> : null}

            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Сообщение…"
                placeholderTextColor={colors.ink3}
                editable={!sending}
                multiline
              />
              <Pressable
                style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
                onPress={() => void send(input)}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Ionicons name="send" size={18} color={colors.surface} />
                )}
              </Pressable>
            </View>

            <Pressable
              style={s.clearBtn}
              onPress={() => {
                setMessages([welcomeMessage()]);
                void AsyncStorage.removeItem(STORAGE_KEY);
              }}
            >
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
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      zIndex: 100,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
    sheetSub: { fontSize: 12, color: colors.ink3, marginTop: 2 },
    authHint: { fontSize: 13, color: colors.ink3, marginBottom: 8 },
    list: { maxHeight: 320 },
    bubble: { maxWidth: '88%', padding: 10, borderRadius: 10 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.accent },
    bubbleAi: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
    bubbleTxt: { fontSize: 14, color: colors.ink2, lineHeight: 20 },
    bubbleTxtUser: { color: colors.surface },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface2,
    },
    chipTxt: { fontSize: 12, color: colors.ink2 },
    err: { color: colors.danger, fontSize: 12, marginBottom: 6 },
    inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      color: colors.ink,
      backgroundColor: colors.surface2,
    },
    sendBtn: {
      width: 44,
      height: 44,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },
    clearBtn: { alignItems: 'center', paddingVertical: 10 },
    clearBtnTxt: { fontSize: 12, color: colors.ink3 },
  });
}
