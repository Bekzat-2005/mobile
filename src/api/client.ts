import { describeApiEndpointForErrors, getApiBaseUrl } from '../config';

export type ApiRequestOptions = RequestInit & { token?: string | null };

function isLikelyNetworkFailure(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = String((err as Error)?.message || err);
  return (
    msg.includes('Network request failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Load failed') ||
    msg.includes('NetworkError')
  );
}

function networkErrorMessage(base: string): string {
  return [
    'Не удалось достучаться до API.',
    `Сейчас используется адрес: ${base}`,
    'На телефоне адрес 127.0.0.1 указывает на сам телефон, а не на ваш компьютер.',
    'Создайте файл .env в skillo-mobile с строкой EXPO_PUBLIC_API_BASE_URL=http://IP_ВАШЕГО_ПК:4000 (тот же IP, что в Expo/Metro), перезапустите npx expo start.',
    'Убедитесь, что skillo-be слушает порт 4000 и доступен в локальной сети (firewall).',
  ].join('\n');
}

export async function apiRequest<T = unknown>(
  path: string,
  { token, headers, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string>),
      },
    });
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      throw new Error(networkErrorMessage(describeApiEndpointForErrors()));
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: string }).message)
        : 'Запрос не выполнен';
    const error = new Error(message) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    if (typeof payload === 'object' && payload && 'details' in payload) {
      error.details = (payload as { details: unknown }).details;
    }
    throw error;
  }

  return payload as T;
}

export function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}
