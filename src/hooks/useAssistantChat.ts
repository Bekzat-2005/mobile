import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';

import { sendAssistantChat } from '../api/assistant';

export const ASSISTANT_STORAGE_KEY = 'skillo_assistant_messages_v1';

export type ChatItem = { id: string; role: 'user' | 'assistant'; content: string };

export function welcomeMessage(): ChatItem {
  return {
    id: 'welcome',
    role: 'assistant',
    content: 'Я AI-ассистент Skillo. Задай вопрос по обучению, вакансиям или тестам.',
  };
}

export function useAssistantChat(token: string | null) {
  const [messages, setMessages] = useState<ChatItem[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<FlatList<ChatItem>>(null);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ASSISTANT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ChatItem[];
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
        }
      } catch {
        await AsyncStorage.removeItem(ASSISTANT_STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const clearHistory = useCallback(async () => {
    setMessages([welcomeMessage()]);
    setErr('');
    await AsyncStorage.removeItem(ASSISTANT_STORAGE_KEY);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return false;
      if (!token) {
        setErr('Войдите в аккаунт для чата с ассистентом.');
        return false;
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
        return true;
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка отправки');
        return false;
      } finally {
        setSending(false);
      }
    },
    [messages, scrollToEnd, sending, token],
  );

  return {
    messages,
    input,
    setInput,
    sending,
    err,
    hydrated,
    listRef,
    scrollToEnd,
    send,
    clearHistory,
  };
}
