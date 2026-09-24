import { api } from './client'

export interface Track {
  id: string
  name: string
  artist_name: string
  album_name: string
  audio: string
  image: string
  duration: number
}

export const musicApi = {
  search: (query: string, limit = 10) =>
    api.post<{ tracks: Track[]; total: number }>('/api/music/search', { query, limit }),
  history: () => api.get<unknown[]>('/api/music/history'),
}
