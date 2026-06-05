import { apiRequest } from './client';

export type DailyTaskQuestion = {
  prompt: string;
  options: string[];
  difficulty?: string;
};

export type DailyTask = {
  id: string;
  directionKey: string;
  date: string;
  timeLimit: number;
  questions: DailyTaskQuestion[];
};

export type DailyTaskStatus = {
  completed: boolean;
  submission?: { score: number; maxScore: number; pointsEarned: number };
};

export type DailyTaskSubmitResult = {
  score: number;
  maxScore: number;
  pointsEarned: number;
  results: { correct: boolean; correctIndex: number; explanation?: string }[];
  currentUser?: Record<string, unknown>;
};

export function fetchDailyTask(directionKey: string) {
  return apiRequest<{ task: DailyTask }>(`/api/daily-tasks/${directionKey}`);
}

export function fetchDailyTaskStatus(directionKey: string, token: string) {
  return apiRequest<DailyTaskStatus>(`/api/daily-tasks/${directionKey}/status`, { token });
}

export function submitDailyTask(directionKey: string, answers: number[], token: string) {
  return apiRequest<DailyTaskSubmitResult>(`/api/daily-tasks/${directionKey}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers }),
  });
}
