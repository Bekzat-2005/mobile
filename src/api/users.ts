import { apiRequest, toQueryString } from './client';
import type { AuthUser } from './auth';

export function fetchCurrentUser(token: string) {
  return apiRequest<{ user: AuthUser }>('/api/users/me', { token });
}

export type PointsHistoryEntry = {
  id?: string;
  amount?: number;
  title?: string;
  description?: string;
  createdAt?: string;
  direction?: string;
  reasonKey?: string;
  [key: string]: unknown;
};

export function fetchPointsHistory(token: string, limit = 20) {
  return apiRequest<{ balance: number; history: PointsHistoryEntry[] }>(
    `/api/users/me/points-history${toQueryString({ limit })}`,
    { token },
  );
}

export function updateCurrentUserProfile(payload: Record<string, unknown>, token: string) {
  return apiRequest<{ user: AuthUser }>('/api/users/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
