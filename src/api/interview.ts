import { apiRequest } from './client';

export type InterviewDomain = { key: string; label?: string; [key: string]: unknown };

export type InterviewQuestion = {
  id: string;
  order?: number;
  focusArea?: string;
  prompt: string;
};

export type InterviewAnswerFeedback = {
  overallScore?: number;
  correctness?: number;
  completeness?: number;
  clarity?: number;
  explanation?: string;
  improvementSuggestion?: string;
  model?: string;
};

export type InterviewAnswer = {
  questionId: string;
  transcript?: string;
  transcriptionModel?: string;
  transcriptionLanguage?: string;
  submittedAt?: string;
  feedback?: InterviewAnswerFeedback;
};

export type InterviewSession = {
  id: string;
  _id?: string;
  status: 'ready' | 'in_progress' | 'completed' | string;
  domainKey?: string;
  domainLabel?: string;
  targetLevel?: string;
  interview?: {
    title?: string;
    introduction?: string;
    estimatedDurationMinutes?: number;
    questions?: InterviewQuestion[];
    answers?: InterviewAnswer[];
    currentQuestionIndex?: number;
    startedAt?: string | null;
    submittedAt?: string | null;
  };
  summary?: {
    overallScore?: number;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    answeredQuestions?: number;
    totalQuestions?: number;
    model?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export function fetchInterviewDomains(token: string) {
  return apiRequest<{ domains: InterviewDomain[] }>('/api/interviews/domains', { token });
}

export function fetchInterviewSessions(token: string) {
  return apiRequest<{ sessions: InterviewSession[] }>('/api/interviews/sessions', { token });
}

export function fetchInterviewSession(sessionId: string, token: string) {
  return apiRequest<{ session: InterviewSession }>(`/api/interviews/sessions/${sessionId}`, { token });
}

export function createInterviewSession(payload: { domainKey: string; targetLevel: string }, token: string) {
  return apiRequest<{ session: InterviewSession }>('/api/interviews/sessions', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function startInterviewSession(sessionId: string, token: string) {
  return apiRequest<{ session: InterviewSession }>(`/api/interviews/sessions/${sessionId}/start`, {
    method: 'POST',
    token,
  });
}

export function submitInterviewAnswer(
  sessionId: string,
  payload: {
    questionId: string;
    audioDataUrl: string;
    fileName?: string;
    language?: string;
  },
  token: string,
) {
  return apiRequest<{ session: InterviewSession }>(`/api/interviews/sessions/${sessionId}/answers`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function completeInterviewSession(sessionId: string, token: string) {
  return apiRequest<{ session: InterviewSession }>(`/api/interviews/sessions/${sessionId}/complete`, {
    method: 'POST',
    token,
  });
}
