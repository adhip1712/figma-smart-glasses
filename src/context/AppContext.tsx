import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { settingsApi } from '../api/services'

interface AppSettings {
  wake_word: string
  voice_input: string
  voice_output: string
  microphone: string
  music_autoplay: string
  navigation_units: string
  camera_enabled: string
  theme: string
  accent_color: string
  animations: string
}

const DEFAULTS: AppSettings = {
  wake_word: 'Hey Vision',
  voice_input: 'true',
  voice_output: 'true',
  microphone: 'true',
  music_autoplay: 'false',
  navigation_units: 'metric',
  camera_enabled: 'true',
  theme: 'Orion Dark',
  accent_color: 'Cyan',
  animations: 'true',
}

interface AppCtx {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>
  backendOnline: boolean
}

const AppContext = createContext<AppCtx>({
  settings: DEFAULTS,
  updateSetting: async () => {},
  backendOnline: false,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [backendOnline, setBackendOnline] = useState(false)

  useEffect(() => {
    settingsApi.getAll()
      .then(data => {
        setSettings({ ...DEFAULTS, ...data } as AppSettings)
        setBackendOnline(true)
      })
      .catch(() => setBackendOnline(false))
  }, [])

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    try { await settingsApi.update(key, value) } catch { /* offline */ }
  }, [])

  return (
    <AppContext.Provider value={{ settings, updateSetting, backendOnline }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
