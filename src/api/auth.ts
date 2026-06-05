import { apiRequest } from './client';

export type AuthUser = {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  /** Игровые очки (та же модель, что на веб-профиле). */
  points?: number;
  createdAt?: string;
  aboutMe?: string;
  location?: string;
  techStack?: string[];
  additionalInfo?: string;
  contactInfo?: {
    phone?: string;
    telegram?: string;
    linkedin?: string;
    github?: string;
    visibility?: Record<string, boolean>;
  };
  verifiedSkills?: unknown[];
  usernameUpdatedAt?: string;
  authProviders?: string[];
  [key: string]: unknown;
};

export type AuthPayload = {
  token: string;
  user: AuthUser;
};

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: {
  email: string;
  password: string;
  username: string;
  name?: string;
}) {
  return apiRequest<AuthPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
