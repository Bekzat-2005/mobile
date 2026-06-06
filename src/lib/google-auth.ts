import * as WebBrowser from 'expo-web-browser';

import { getApiBaseUrl } from '../config';

WebBrowser.maybeCompleteAuthSession();

/** Бэкенд разрешает returnTo на 127.0.0.1 (см. skillo-be client-origin.js) */
const GOOGLE_RETURN_TO = 'http://127.0.0.1/oauth/google/callback';

function parseOAuthHash(url: string): { token?: string; error?: string } {
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const paramStr =
    hashIdx >= 0
      ? url.slice(hashIdx + 1)
      : queryIdx >= 0
        ? url.slice(queryIdx + 1)
        : '';
  const params = new URLSearchParams(paramStr);
  return {
    token: params.get('token') || undefined,
    error: params.get('error') || undefined,
  };
}

export async function signInWithGoogle(): Promise<string> {
  const base = getApiBaseUrl();
  const authUrl = `${base}/api/auth/google?returnTo=${encodeURIComponent(GOOGLE_RETURN_TO)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_RETURN_TO);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google-вход отменён');
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Не удалось завершить Google-вход');
  }

  const { token, error } = parseOAuthHash(result.url);
  if (error) {
    throw new Error(decodeURIComponent(error.replace(/\+/g, ' ')));
  }
  if (!token) {
    throw new Error('Токен не получен от сервера');
  }

  return token;
}
