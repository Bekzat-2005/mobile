import { apiRequest } from './client';

export type AnalyticsWeakArea = {
  topic?: string;
  explanation?: string;
  suggestedFocus?: string;
};

export type AnalyticsStudyPlanStep = {
  step?: string;
  rationale?: string;
};

export type AnalyticsMetrics = {
  totalQuestionsAnswered?: number;
  correctAnswers?: number;
  accuracyRate?: number;
  avgTimePerQuestion?: number;
  avgTimePerTheory?: number;
  retryRate?: number;
  dropoffRate?: number;
  activityFrequency?: string;
  totalSessions?: number;
  recentSessionDays?: number;
  topicStats?: { topic?: string; total?: number; correct?: number; accuracy?: number }[];
  weakestTopics?: string[];
  strongestTopics?: string[];
  mostLikedTopics?: string[];
  completedDomains?: string[];
  lastAnalysis?: {
    generatedAt?: string;
    model?: string;
    overallInsight?: string;
    weakAreas?: (string | AnalyticsWeakArea)[];
    strengths?: string[];
    behavioralPatterns?: string[];
    recommendations?: string[];
    nextTopics?: string[];
    studyPlan?: (string | AnalyticsStudyPlanStep)[];
  };
  [key: string]: unknown;
};

export type TestHistoryItem = {
  testType?: string;
  title?: string;
  subtitle?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  completedAt?: string;
  [key: string]: unknown;
};

export function trackAnalyticsEvent(
  eventType: string,
  metadata: Record<string, unknown>,
  token: string,
) {
  return apiRequest<{ ok: boolean }>('/api/analytics/events', {
    method: 'POST',
    token,
    body: JSON.stringify({ eventType, metadata }),
  });
}

export function fetchMyAnalytics(token: string) {
  return apiRequest<{ metrics: AnalyticsMetrics }>('/api/analytics/me', { token });
}

export function recomputeAnalytics(token: string) {
  return apiRequest<{ metrics: AnalyticsMetrics }>('/api/analytics/me/recompute', {
    method: 'POST',
    token,
  });
}

export function generateAnalyticsAiAnalysis(direction: string, token: string) {
  return apiRequest<{ metrics: AnalyticsMetrics }>('/api/analytics/me/analyze', {
    method: 'POST',
    token,
    body: JSON.stringify({ direction }),
  });
}

export function fetchTestHistory(token: string) {
  return apiRequest<{ history: TestHistoryItem[] }>('/api/analytics/me/history', { token });
}
