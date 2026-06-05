import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setError('');
    setPending(true);
    try {
      await login(email.trim(), password);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setPending(false);
    }
  }

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Вход</Text>
        <Text style={s.title}>Войди и продолжай.</Text>
        <Text style={s.subtitle}>Доступ к профилю и вакансиям в одном месте.</Text>

        <View style={s.card}>
          <Text style={s.label}>Почта</Text>
          <TextInput
            style={s.input}
            placeholder="user@example.com"
            placeholderTextColor={colors.ink3}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={s.label}>Пароль</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={[s.btn, pending && s.btnDisabled]} onPress={submit} disabled={pending}>
            {pending ? <ActivityIndicator color={colors.surface} /> : <Text style={s.btnText}>Войти</Text>}
          </Pressable>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={s.link}>Создать аккаунт</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 24, paddingBottom: 48 },
    eyebrow: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: '600', color: colors.ink, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.ink2, lineHeight: 22, marginBottom: 28 },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      padding: 20,
      backgroundColor: colors.surface2,
      marginBottom: 16,
    },
    label: { fontSize: 13, color: colors.ink2, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.surface,
      marginBottom: 16,
    },
    btn: {
      backgroundColor: colors.ink,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
    error: { color: colors.danger, marginBottom: 12 },
    link: { color: colors.accent, fontSize: 15, marginTop: 8 },
  });
}
