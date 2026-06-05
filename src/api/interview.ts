import { apiRequest } from './client';

export type InterviewDomain = { key: string; label?: string; [key: string]: unknown };

export function fetchInterviewDomains(token: string) {
  return apiRequest<{ domains: InterviewDomain[] }>('/api/interviews/domains', { token });
}

export function fetchInterviewSessions(token: string) {
  return apiRequest<{ sessions: unknown[] }>('/api/interviews/sessions', { token });
}

export function fetchInterviewSession(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/interviews/sessions/${sessionId}`, { token });
}

export function createInterviewSession(payload: { domainKey: string; targetLevel: string }, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>('/api/interviews/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function startInterviewSession(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/interviews/sessions/${sessionId}/start`, {
    method: 'POST',
    token,
  });
}
