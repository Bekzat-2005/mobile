import { apiRequest, toQueryString } from './client';

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  status?: string;
  companyName?: string;
  points?: number;
  aboutMe?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminDashboardStats = {
  totalUsers?: number;
  activeUsers?: number;
  bannedUsers?: number;
  totalPosts?: number;
  reportedPosts?: number;
  totalPrompts?: number;
};

export type AdminPlatformSettings = {
  maintenance?: { enabled?: boolean; message?: string };
  ai?: { activeProvider?: string };
  featureFlags?: Record<string, boolean>;
  limits?: Record<string, number>;
};

export type AdminAuditLog = {
  id?: string;
  action?: string;
  entityType?: string;
  entityLabel?: string;
  entityId?: string;
  actor?: { username?: string };
  createdAt?: string;
};

export type AdminDashboard = {
  stats: AdminDashboardStats;
  system?: AdminPlatformSettings;
  recentActivity?: AdminAuditLog[];
};

export type AdminUsersQuery = {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type AdminUserUpdatePayload = {
  name?: string;
  role?: string;
  status?: string;
  companyName?: string;
  points?: number;
};

export function fetchAdminDashboard(token: string) {
  return apiRequest<AdminDashboard>('/api/admin/dashboard', { token });
}

export function fetchAdminUsers(token: string, query: AdminUsersQuery = {}) {
  return apiRequest<{ users: AdminUser[]; pagination: AdminPagination }>(
    `/api/admin/users${toQueryString({
      search: query.search,
      role: query.role,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 15,
    })}`,
    { token },
  );
}

export function fetchAdminUser(userId: string, token: string) {
  return apiRequest<{ user: AdminUser }>(`/api/admin/users/${userId}`, { token });
}

export function updateAdminUser(userId: string, payload: AdminUserUpdatePayload, token: string) {
  return apiRequest<{ user: AdminUser }>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(userId: string, token: string) {
  return apiRequest<{ user: AdminUser }>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export type AdminPost = {
  id: string;
  title?: string;
  content?: string;
  domainKey?: string;
  domainLabel?: string;
  status?: string;
  tags?: string[];
  author?: { username?: string; id?: string };
  reports?: { count?: number; status?: string };
  metrics?: { commentsCount?: number; likesCount?: number };
  createdAt?: string;
  [key: string]: unknown;
};

export type AdminPostsQuery = {
  search?: string;
  status?: string;
  reportedOnly?: boolean | string;
  page?: number;
  limit?: number;
};

export type AdminPostUpdatePayload = {
  title?: string;
  content?: string;
  domainKey?: string;
  domainLabel?: string;
  status?: string;
  reportStatus?: string;
  tags?: string[];
};

export function fetchAdminPosts(token: string, query: AdminPostsQuery = {}) {
  return apiRequest<{ posts: AdminPost[]; pagination: AdminPagination }>(
    `/api/admin/posts${toQueryString({
      search: query.search,
      status: query.status,
      reportedOnly: query.reportedOnly ? 'true' : '',
      page: query.page ?? 1,
      limit: query.limit ?? 15,
    })}`,
    { token },
  );
}

export function fetchAdminPost(postId: string, token: string) {
  return apiRequest<{ post: AdminPost }>(`/api/admin/posts/${postId}`, { token });
}

export function updateAdminPost(postId: string, payload: AdminPostUpdatePayload, token: string) {
  return apiRequest<{ post: AdminPost }>(`/api/admin/posts/${postId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPost(postId: string, token: string) {
  return apiRequest<{ post: AdminPost }>(`/api/admin/posts/${postId}`, {
    method: 'DELETE',
    token,
  });
}

export type AdminPrompt = {
  id?: string;
  key: string;
  category?: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  version?: number;
  isActive?: boolean;
  variables?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminPromptsQuery = {
  search?: string;
  category?: string;
  isActive?: string;
  page?: number;
  limit?: number;
};

export type AdminPromptPayload = {
  key?: string;
  category?: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  isActive?: boolean;
  variables?: string[];
};

export function fetchAdminPrompts(token: string, query: AdminPromptsQuery = {}) {
  return apiRequest<{ prompts: AdminPrompt[]; pagination: AdminPagination }>(
    `/api/admin/prompts${toQueryString({
      search: query.search,
      category: query.category,
      isActive: query.isActive,
      page: query.page ?? 1,
      limit: query.limit ?? 15,
    })}`,
    { token },
  );
}

export function fetchAdminPrompt(promptKey: string, token: string) {
  return apiRequest<{ prompt: AdminPrompt }>(
    `/api/admin/prompts/${encodeURIComponent(promptKey)}`,
    { token },
  );
}

export function createAdminPrompt(payload: AdminPromptPayload, token: string) {
  return apiRequest<{ prompt: AdminPrompt }>('/api/admin/prompts', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateAdminPrompt(promptKey: string, payload: AdminPromptPayload, token: string) {
  return apiRequest<{ prompt: AdminPrompt }>(
    `/api/admin/prompts/${encodeURIComponent(promptKey)}`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminPrompt(promptKey: string, token: string) {
  return apiRequest<{ prompt: AdminPrompt }>(
    `/api/admin/prompts/${encodeURIComponent(promptKey)}`,
    { method: 'DELETE', token },
  );
}

export type AdminSystemSettings = AdminPlatformSettings & {
  id?: string;
  updatedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function fetchAdminSystemSettings(token: string) {
  return apiRequest<{ settings: AdminSystemSettings }>('/api/admin/system', { token });
}

export function updateAdminSystemSettings(payload: AdminSystemSettings, token: string) {
  return apiRequest<{ settings: AdminSystemSettings }>('/api/admin/system', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
