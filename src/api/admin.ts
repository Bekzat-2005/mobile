import { apiRequest } from './client';

export type AdminDashboardStats = {
  totalUsers?: number;
  activeUsers?: number;
  bannedUsers?: number;
  totalPosts?: number;
  reportedPosts?: number;
  totalPrompts?: number;
};

export type AdminDashboard = {
  stats: AdminDashboardStats;
  system?: {
    maintenance?: { enabled?: boolean; message?: string };
    ai?: { activeProvider?: string };
    featureFlags?: Record<string, boolean>;
  };
  recentActivity?: {
    id?: string;
    action?: string;
    entityType?: string;
    entityLabel?: string;
    entityId?: string;
    actor?: { username?: string };
    createdAt?: string;
  }[];
};

export function fetchAdminDashboard(token: string) {
  return apiRequest<AdminDashboard>('/api/admin/dashboard', { token });
}
