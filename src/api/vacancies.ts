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
  return apiRequest(`/api/vacancies/${id}/apply`, { method: 'POST', token });
}
