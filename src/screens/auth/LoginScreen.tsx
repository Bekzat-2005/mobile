import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { authStyles } from './auth-styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);

  const s = authStyles(colors);

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

  async function onGoogle() {
    setError('');
    setGooglePending(true);
    try {
      await loginWithGoogle();
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка Google-входа');
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Вход</Text>
        <Text style={s.title}>Войди и продолжай.</Text>
        <Text style={s.subtitle}>Доступ к профилю, обучению и вакансиям в одном месте.</Text>

        <Pressable
          style={[s.googleBtn, googlePending && s.btnDisabled]}
          onPress={onGoogle}
          disabled={googlePending || pending}
        >
          {googlePending ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.ink} />
              <Text style={s.googleBtnTxt}>Продолжить через Google</Text>
            </>
          )}
        </Pressable>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerTxt}>или email</Text>
          <View style={s.dividerLine} />
        </View>

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
            editable={!pending && !googlePending}
          />
          <Text style={s.label}>Пароль</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!pending && !googlePending}
          />
          <Pressable
            style={[s.btn, pending && s.btnDisabled]}
            onPress={submit}
            disabled={pending || googlePending}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Войти</Text>
            )}
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
