import { apiRequest } from './client';

export type CareerDirection = {
  key: string;
  label?: string;
  description?: string;
  groupKey?: string;
  groupLabel?: string;
  targetRoles?: string[];
  [key: string]: unknown;
};

export function fetchCareerDirections(token: string) {
  return apiRequest<{ directions: CareerDirection[] }>('/api/career/directions', { token });
}

export function fetchCareerSessions(token: string) {
  return apiRequest<{ sessions: unknown[] }>('/api/career/sessions', { token });
}

export function fetchCareerSession(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/career/sessions/${sessionId}`, { token });
}

export function createCareerSession(
  payload: {
    directionKey: string;
    targetRole: string;
    onboardingMode: 'assessment' | 'start_from_zero';
    profile: Record<string, unknown>;
  },
  token: string,
) {
  return apiRequest<{ session: Record<string, unknown> }>('/api/career/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export type CareerAssessmentAnswer = { questionId: string; answer: string };

export type CareerSkillLevel = { area: string; level: string };

export function submitCareerSession(sessionId: string, answers: CareerAssessmentAnswer[], token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/career/sessions/${sessionId}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers }),
  });
}

export function confirmCareerSkillLevels(
  sessionId: string,
  skillLevels: CareerSkillLevel[],
  token: string,
) {
  return apiRequest<{ session: Record<string, unknown> }>(
    `/api/career/sessions/${sessionId}/confirm-skills`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ skillLevels }),
    },
  );
}

export function switchCareerSessionToZeroStart(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(
    `/api/career/sessions/${sessionId}/start-from-zero`,
    { method: 'POST', token },
  );
}

export function retryCareerRoadmapGeneration(sessionId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(`/api/career/sessions/${sessionId}/retry-roadmap`, {
    method: 'POST',
    token,
  });
}

/** Генерация теории, Q&A и вопросов мини-теста по теме (как на вебе). */
export function generateCareerTopicContent(sessionId: string, topicId: string, token: string) {
  return apiRequest<{ session: Record<string, unknown> }>(
    `/api/career/sessions/${sessionId}/topics/${topicId}/generate`,
    { method: 'POST', token },
  );
}

export type CareerTopicQuizAnswer = { questionId: string; answer: string };

export type CareerTopicCompleteEvaluation = {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  nextTopicId?: string | null;
};

/** Отправка ответов мини-теста; при успехе открывается следующая тема на сервере. */
export function completeCareerTopic(
  sessionId: string,
  topicId: string,
  answers: CareerTopicQuizAnswer[],
  token: string,
) {
  return apiRequest<{
    session: Record<string, unknown>;
    evaluation: CareerTopicCompleteEvaluation;
    currentUser?: Record<string, unknown> | null;
  }>(`/api/career/sessions/${sessionId}/topics/${topicId}/complete`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers }),
  });
}
