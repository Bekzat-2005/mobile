import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { login as apiLogin, register as apiRegister, type AuthUser } from '../api/auth';
import { fetchCurrentUser } from '../api/users';
import { STORAGE_TOKEN_KEY } from '../config';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; username: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return (await AsyncStorage.getItem(STORAGE_TOKEN_KEY)) ?? null;
    }
    return (await SecureStore.getItemAsync(STORAGE_TOKEN_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function writeToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
    else await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(STORAGE_TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(STORAGE_TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = await readToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }
    setToken(t);
    const { user: u } = await fetchCurrentUser(t);
    setUser(u);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } catch {
        await writeToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await apiLogin({ email, password });
    await writeToken(t);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(
    async (payload: { email: string; password: string; username: string; name?: string }) => {
      const { token: t, user: u } = await apiRegister(payload);
      await writeToken(t);
      setToken(t);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    await writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshUser }),
    [token, user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
