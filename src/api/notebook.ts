import { apiRequest, toQueryString } from './client';

export type NotebookSourceContext = {
  sourceType: string;
  directionLabel?: string;
  roadmapTitle?: string;
  sectionTitle?: string;
  topicTitle?: string;
  lessonTitle?: string;
  pagePath?: string;
};

export type NotebookNote = {
  id: string;
  type: 'manual' | 'ai_generated';
  title: string;
  manualNote: string;
  tags?: string[];
  sourceContext?: NotebookSourceContext;
  createdAt?: string;
  updatedAt?: string;
};

export function fetchNotebook(
  token: string,
  params: { search?: string; type?: string; groupId?: string } = {},
) {
  return apiRequest<{ notes: NotebookNote[]; groups: unknown[]; ungroupedCount: number }>(
    `/api/notebook${toQueryString(params)}`,
    { token },
  );
}

export function createNotebookNote(
  token: string,
  payload: {
    title: string;
    manualNote: string;
    tags?: string[];
    sourceContext?: NotebookSourceContext;
  },
) {
  return apiRequest<{ note: NotebookNote }>('/api/notebook/notes', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function updateNotebookNote(
  token: string,
  noteId: string,
  payload: {
    title: string;
    manualNote: string;
    tags?: string[];
    sourceContext?: NotebookSourceContext;
  },
) {
  return apiRequest<{ note: NotebookNote }>(`/api/notebook/notes/${noteId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
