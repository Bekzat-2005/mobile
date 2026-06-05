import { apiRequest, toQueryString } from './client';

export type SocialPost = {
  id?: string;
  _id?: string;
  title?: string;
  content?: string;
  author?: { username?: string; name?: string };
  createdAt?: string;
  likes?: number;
  dislikes?: number;
  commentsCount?: number;
  viewerReaction?: 'like' | 'dislike' | null;
  [key: string]: unknown;
};

export type SocialComment = {
  id?: string;
  _id?: string;
  content?: string;
  author?: { username?: string; name?: string };
  createdAt?: string;
  [key: string]: unknown;
};

/** Публичный социальный профиль (репутация, подписчики, активность) — как на веб-профиле. */
export function fetchPublicSocialProfile(userId: string, token?: string | null) {
  return apiRequest<{ profile: Record<string, unknown> }>(
    `/api/social/profiles/${userId}`,
    token ? { token } : {},
  );
}

export function fetchSocialPosts(token: string | null | undefined, query: { limit?: number } = {}) {
  return apiRequest<{ posts: SocialPost[] }>(
    `/api/social/posts${toQueryString({ limit: query.limit })}`,
    token ? { token } : {},
  );
}

export function createSocialPost(
  payload: { title: string; content: string; tags?: string[] },
  token: string,
) {
  return apiRequest('/api/social/posts', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function togglePostReaction(postId: string, reactionType: 'like' | 'dislike', token: string) {
  return apiRequest<{ likes: number; dislikes: number; reactionType?: 'like' | 'dislike' | null }>(
    `/api/social/posts/${postId}/react`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ reactionType }),
    },
  );
}

export function fetchPostComments(postId: string, token?: string | null) {
  return apiRequest<{ comments: SocialComment[] }>(
    `/api/social/posts/${postId}/comments`,
    token ? { token } : {},
  );
}

export function createPostComment(postId: string, content: string, token: string) {
  return apiRequest<{ comment: SocialComment }>(`/api/social/posts/${postId}/comments`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
  });
}
