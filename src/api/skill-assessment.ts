import { apiRequest } from './client';

export type SkillDomain = { key: string; label?: string; description?: string; [key: string]: unknown };

export function fetchSkillAssessmentDomains(token: string) {
  return apiRequest<{ domains: SkillDomain[] }>('/api/skill-assessments/domains', { token });
}

export function fetchSkillAssessmentSessions(token: string) {
  return apiRequest<{ sessions: unknown[] }>('/api/skill-assessments/sessions', { token });
}

export function fetchSkillAssessmentSession(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/skill-assessments/sessions/${sessionId}`, {
    token,
  });
}

export function createSkillAssessmentSession(
  payload: { domainKey: string; targetLevel: string },
  token: string,
) {
  return apiRequest<{ session: Record<string, unknown> }>('/api/skill-assessments/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function startSkillAssessmentSession(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/skill-assessments/sessions/${sessionId}/start`, {
    method: 'POST',
    token,
  });
}

export function saveSkillAssessmentProgress(
  sessionId: string,
  payload: { answers: { questionId: string; answer: string }[]; currentQuestionIndex: number },
  token: string,
) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/skill-assessments/sessions/${sessionId}/progress`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function submitSkillAssessmentSession(
  sessionId: string,
  answers: { questionId: string; answer: string }[],
  token: string,
) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/skill-assessments/sessions/${sessionId}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers }),
  });
}
