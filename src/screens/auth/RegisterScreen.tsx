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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { register, loginWithGoogle } = useAuth();
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);

  const s = authStyles(colors);

  async function submit() {
    setError('');
    setPending(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
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
      setError(e instanceof Error ? e.message : 'Ошибка Google-регистрации');
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Регистрация</Text>
        <Text style={s.title}>Начни бесплатно.</Text>
        <Text style={s.subtitle}>Имя пользователя 3–20 символов: буквы, цифры, подчёркивание.</Text>

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
          <Text style={s.label}>Имя пользователя</Text>
          <TextInput
            style={s.input}
            placeholder="skillo_dev"
            placeholderTextColor={colors.ink3}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            editable={!pending && !googlePending}
          />
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
          <Text style={s.label}>Имя (необязательно)</Text>
          <TextInput
            style={s.input}
            placeholder="Как к тебе обращаться"
            placeholderTextColor={colors.ink3}
            value={name}
            onChangeText={setName}
            editable={!pending && !googlePending}
          />
          <Text style={s.label}>Пароль (мин. 8 символов)</Text>
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
              <Text style={s.btnText}>Создать аккаунт</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={s.link}>Уже есть аккаунт — войти</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
