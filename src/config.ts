import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Явный URL API (приоритет). Пример: http://192.168.1.10:4000 для телефона в той же сети.
 */
const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function normalizeBase(url: string) {
  return url.replace(/\/+$/, '');
}

type ExpoGoConfigLoose = { debuggerHost?: string };
type Manifest2Loose = {
  extra?: { expoClient?: { hostUri?: string; debuggerHost?: string } };
};

/** IP/хост машины с Metro (тот же, что в QR Expo), без порта API */
export function resolveDevMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = extractHostFromHostUri(hostUri);
    if (host) return host;
  }

  const go = Constants.expoGoConfig as ExpoGoConfigLoose | null | undefined;
  if (go?.debuggerHost) {
    const host = go.debuggerHost.split(':')[0]?.trim();
    if (isUsableDevHost(host)) return host!;
  }

  const legacy = Constants.manifest as { debuggerHost?: string } | null | undefined;
  if (legacy?.debuggerHost) {
    const host = legacy.debuggerHost.split(':')[0]?.trim();
    if (isUsableDevHost(host)) return host!;
  }

  const m2 = Constants.manifest2 as Manifest2Loose | null | undefined;
  const ex = m2?.extra?.expoClient;
  if (ex?.hostUri) {
    const host = extractHostFromHostUri(ex.hostUri);
    if (host) return host;
  }
  if (ex?.debuggerHost) {
    const host = ex.debuggerHost.split(':')[0]?.trim();
    if (isUsableDevHost(host)) return host!;
  }

  const expUrl = Constants.experienceUrl;
  if (typeof expUrl === 'string' && expUrl.length > 0) {
    try {
      const u = new URL(expUrl);
      if (isUsableDevHost(u.hostname)) return u.hostname;
    } catch {
      const ip = expUrl.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
      if (ip?.[0]) return ip[0];
    }
  }

  return null;
}

function extractHostFromHostUri(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('://')) {
    try {
      const h = new URL(trimmed).hostname;
      return isUsableDevHost(h) ? h : null;
    } catch {
      return null;
    }
  }
  const host = trimmed.split(':')[0]?.trim();
  return isUsableDevHost(host) ? host! : null;
}

function isUsableDevHost(host: string | undefined): host is string {
  if (!host) return false;
  if (host === '0.0.0.0') return false;
  return true;
}

/**
 * Базовый URL API Skillo.
 * На физическом устройстве 127.0.0.1 — это сам телефон, поэтому в dev берём хост из Expo (LAN).
 */
export function getApiBaseUrl(): string {
  if (envUrl) {
    return normalizeBase(envUrl);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    const proto = protocol === 'https:' ? 'https:' : 'http:';
    return normalizeBase(`${proto}//${hostname}:4000`);
  }

  if (__DEV__) {
    const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;
    if (isAndroidEmulator) {
      return 'http://10.0.2.2:4000';
    }

    const host = resolveDevMachineHost();
    if (host) {
      return normalizeBase(`http://${host}:4000`);
    }

    return 'http://127.0.0.1:4000';
  }

  return normalizeBase('http://127.0.0.1:4000');
}

export function describeApiEndpointForErrors(): string {
  return getApiBaseUrl();
}

/** Как в skillo-fe/src/config/api.js */
export const STORAGE_TOKEN_KEY = 'skillo_auth_token';
