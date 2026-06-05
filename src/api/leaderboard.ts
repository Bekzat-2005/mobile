import { apiRequest } from './client';

/** Как в skillo-be leaderboard.service (rank, id, username, name, points) */
export type LeaderboardEntry = {
  rank: number;
  id: string;
  username?: string;
  name?: string;
  points: number;
};

export function fetchLeaderboard() {
  return apiRequest<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
}
