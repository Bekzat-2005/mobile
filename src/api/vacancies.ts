import { apiRequest, toQueryString } from './client';

export type Vacancy = {
  _id?: string;
  id?: string;
  title?: string;
  companyName?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  experienceLevel?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  location?: string;
  applicantCount?: number;
  hasAssessment?: boolean;
  status?: string;
  [key: string]: unknown;
};

export type VacancyQAItem = {
  _id?: string;
  question: string;
  answer: string;
  category: 'technical' | 'behavioral' | 'situational' | 'experience' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
};

export type VacancyQuestion = {
  _id?: string;
  text: string;
  type?: string;
  difficulty?: string;
};

export type VacancyTask = {
  _id?: string;
  title: string;
  description?: string;
  type?: string;
  timeLimit?: number;
};

export type VacancyAssessment = {
  questions: VacancyQuestion[];
  tasks: VacancyTask[];
  title?: string;
};

export type VacancyApplicationAnswer = {
  questionId?: string;
  text?: string;
  score?: number;
  feedback?: string;
};

export type VacancyTaskSubmission = {
  taskId?: string;
  content?: string;
  score?: number;
  feedback?: string;
};

export type VacancyApplication = {
  _id?: string;
  status?: 'in_progress' | 'completed' | 'invited' | 'rejected' | string;
  score?: number;
  answers?: VacancyApplicationAnswer[];
  taskSubmissions?: VacancyTaskSubmission[];
  overallFeedback?: string;
  strengths?: string[];
  improvements?: string[];
  overallScore?: number;
  [key: string]: unknown;
};

export function fetchVacancies(
  params: { skills?: string[]; experienceLevel?: string; limit?: number; skip?: number } = {},
  token?: string | null,
) {
  const q: Record<string, string | number | undefined> = {};
  if (params.skills?.length) q.skills = params.skills.join(',');
  if (params.experienceLevel) q.experienceLevel = params.experienceLevel;
  if (params.limit != null) q.limit = params.limit;
  if (params.skip != null) q.skip = params.skip;
  return apiRequest<{ vacancies: Vacancy[] }>(`/api/vacancies${toQueryString(q)}`, {
    token: token ?? undefined,
  });
}

export function fetchVacancy(id: string, token?: string | null) {
  return apiRequest<{ vacancy: Vacancy }>(`/api/vacancies/${id}`, { token: token ?? undefined });
}

export function applyToVacancy(id: string, token: string) {
  return apiRequest<{ application: VacancyApplication; isNew?: boolean; assessment?: VacancyAssessment }>(
    `/api/vacancies/${id}/apply`,
    { method: 'POST', token },
  );
}

export function getMyVacancyApplication(id: string, token: string) {
  return apiRequest<{ application: VacancyApplication; assessment?: VacancyAssessment }>(
    `/api/vacancies/${id}/my-application`,
    { token },
  );
}

export function submitVacancyApplication(
  id: string,
  payload: {
    answers: { questionId: string; text: string }[];
    taskSubmissions: { taskId: string; content: string }[];
  },
  token: string,
) {
  return apiRequest<{ application: VacancyApplication }>(`/api/vacancies/${id}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function fetchVacancyQA(id: string, token?: string | null) {
  return apiRequest<{ qaList: VacancyQAItem[]; cached?: boolean }>(`/api/vacancies/${id}/qa`, {
    token: token ?? undefined,
  });
}
