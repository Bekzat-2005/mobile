import { apiRequest } from './client';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function sendAssistantChat(messages: ChatMessage[], token: string) {
  return apiRequest<{ reply: string; model?: string; provider?: string }>('/api/assistant/chat', {
    method: 'POST',
    token,
    body: JSON.stringify({ messages }),
  });
}
