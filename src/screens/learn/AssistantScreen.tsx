import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LearnStackParamList } from '../../navigation/types';
import { LearnPageHero } from '../../components/learn/LearnPageHero';
import { sendAssistantChat } from '../../api/assistant';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<LearnStackParamList, 'Assistant'>;

const STORAGE_KEY = 'skillo_assistant_messages_v1';

type ChatItem = { id: string; role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  'Объясни архитектуру авторизации простыми словами.',
  'Что изучать дальше после основ JavaScript?',
  'Как улучшить UX страницы профиля?',
  'Предложи три идеи новых функций для Skillo.',
];

function welcomeMessage(): ChatItem {
  return {
    id: 'welcome',
    role: 'assistant',
    content: 'Задай вопрос по обучению, коду или продукту. Отвечу коротко и по делу.',
  };
}

export default function AssistantScreen({}: Props) {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const s = styles(colors);
  const listRef = useRef<FlatList<ChatItem>>(null);

  const [messages, setMessages] = useState<ChatItem[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ChatItem[];
          if (Array.isArray(parsed) && parsed.length) {
            setMessages(parsed);
          }
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
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (hydrated) scrollToEnd();
  }, [hydrated, messages.length, scrollToEnd]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !token || sending) return;
    setErr('');
    setInput('');

    const userMsg: ChatItem = { id: `u-${Date.now()}`, role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    try {
      const res = await sendAssistantChat(
        next.map((m) => ({ role: m.role, content: m.content })),
        token,
      );
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([welcomeMessage()]);
    setErr('');
  }

  if (!token) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Войдите в аккаунт, чтобы пользоваться ассистентом.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <View style={s.heroWrap}>
          <LearnPageHero
            eyebrow="ИИ"
            title="Ассистент"
            lead="Многоходовый чат с тем же API, что на сайте. История сохраняется на устройстве."
          />
          <Pressable style={s.clearBtn} onPress={clearChat}>
            <Ionicons name="trash-outline" size={16} color={colors.ink3} />
            <Text style={s.clearTxt}>Очистить чат</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
              <Text style={[s.bubbleTxt, item.role === 'user' && s.bubbleTxtUser]}>{item.content}</Text>
            </View>
          )}
        />

        <ScrollChips prompts={QUICK_PROMPTS} onPick={(p) => void send(p)} colors={colors} />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={s.composer}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Сообщение…"
            placeholderTextColor={colors.ink3}
            multiline
            maxLength={4000}
          />
          <Pressable
            style={[s.send, (sending || !input.trim()) && s.sendDisabled]}
            onPress={() => void send()}
            disabled={sending || !input.trim()}
          >
            {sending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={colors.surface} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScrollChips({
  prompts,
  onPick,
  colors,
}: {
  prompts: string[];
  onPick: (p: string) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {prompts.map((p) => (
        <Pressable
          key={p}
          onPress={() => onPick(p)}
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.surface2,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.ink2 }} numberOfLines={1}>
            {p.length > 36 ? `${p.slice(0, 36)}…` : p}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.surface },
    heroWrap: { paddingHorizontal: 16 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 8 },
    clearTxt: { fontSize: 13, color: colors.ink3 },
    list: { paddingHorizontal: 16, paddingBottom: 8 },
    bubble: {
      maxWidth: '88%',
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.line,
    },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.ink },
    bubbleAi: { alignSelf: 'flex-start', backgroundColor: colors.surface2 },
    bubbleTxt: { fontSize: 15, lineHeight: 22, color: colors.ink2 },
    bubbleTxtUser: { color: colors.surface },
    err: { color: colors.danger, paddingHorizontal: 16, fontSize: 13, marginBottom: 4 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface2,
    },
    send: {
      width: 44,
      height: 44,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: { opacity: 0.5 },
    muted: { padding: 20, color: colors.ink2 },
  });
}
