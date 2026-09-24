import { api } from './client'

export interface WeatherData {
  city: string
  country: string
  temp: number
  feels_like: number
  humidity: number
  description: string
  icon: string
  wind_speed: number
  visibility: number
}

export interface RouteData {
  origin: string
  destination: string
  distance_km: number
  duration_min: number
  steps: { instruction: string; type: string; modifier: string; distance: number; duration: number }[]
}

export interface DeviceStatus {
  connected: boolean
  status: string
  ip: string | null
  device_id: string
  firmware: string
  battery: number
  signal: number
}

export interface CameraStatus {
  streaming: boolean
  capturing: boolean
  resolution: string
  fps: number
  status: string
}

export const weatherApi = {
  get: (city: string) => api.get<WeatherData>(`/api/weather/${encodeURIComponent(city)}`),
}

export const navigationApi = {
  geocode: (q: string) => api.get<{ lat: number; lon: number; display_name: string }>(`/api/navigation/geocode?q=${encodeURIComponent(q)}`),
  route: (origin: string, destination: string) =>
    api.post<RouteData>('/api/navigation/route', { origin, destination }),
}

export const deviceApi = {
  status: () => api.get<DeviceStatus>('/api/device/status'),
  connect: () => api.post('/api/device/connect'),
  disconnect: () => api.post('/api/device/disconnect'),
  restart: () => api.post('/api/device/restart'),
  sleep: () => api.post('/api/device/sleep'),
  wake: () => api.post('/api/device/wake'),
}

export const cameraApi = {
  status: () => api.get<CameraStatus>('/api/camera/status'),
  start: () => api.post('/api/camera/start'),
  stop: () => api.post('/api/camera/stop'),
  capture: () => api.post('/api/camera/capture'),
  stream: () => api.get('/api/camera/stream'),
}

export const settingsApi = {
  getAll: () => api.get<Record<string, string>>('/api/settings'),
  update: (key: string, value: string) => api.patch(`/api/settings/${key}`, { value }),
  updateAll: (data: Record<string, string>) => api.put('/api/settings', data),
}
