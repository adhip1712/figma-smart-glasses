import { api } from './client'

export interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface AskResponse {
  conversation_id: number
  response: string
  role: string
}

export const conversationsApi = {
  list: () => api.get<Conversation[]>('/api/conversations'),
  create: (title?: string) => api.post<Conversation>('/api/conversations', { title: title ?? 'New Chat' }),
  get: (id: number) => api.get<Conversation>(`/api/conversations/${id}`),
  rename: (id: number, title: string) => api.patch<Conversation>(`/api/conversations/${id}`, { title }),
  delete: (id: number) => api.delete<{ ok: boolean }>(`/api/conversations/${id}`),
  messages: (id: number) => api.get<Message[]>(`/api/conversations/${id}/messages`),
  ask: (message: string, conversation_id?: number) =>
    api.post<AskResponse>('/api/ask', { message, conversation_id }),
}
