import { useState, useCallback, useRef } from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import Dashboard from './components/Dashboard'
import AIAssistant from './components/AIAssistant'
import Vision from './components/Vision'
import AudioPanel from './components/AudioPanel'
import Device from './components/Device'
import Settings from './components/Settings'
import Music from './components/Music'
import Weather from './components/Weather'
import Navigation from './components/Navigation'
import { useVoice } from './hooks/useVoice'
import { parseCommand, stripWakeWord } from './hooks/useCommandRouter'
import { musicApi } from './api/music'

export type Tab = 'dashboard' | 'ai' | 'vision' | 'audio' | 'device' | 'settings' | 'music' | 'weather' | 'navigation'

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons: Record<Tab, React.ReactNode> = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" opacity="0.4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>,
  vision: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  audio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M2 12h2M20 12h2M6 8v8M10 5v14M14 7v10M18 9v6" strokeLinecap="round"/></svg>,
  music: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  weather: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  navigation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  device: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" strokeLinecap="round"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round"/></svg>,
}

const tabLabels: Record<Tab, string> = {
  dashboard: 'Dashboard', ai: 'AI Chat', vision: 'Vision', audio: 'Audio',
  music: 'Music', weather: 'Weather', navigation: 'Navigation', device: 'Device', settings: 'Settings',
}

const sidebarTabs: Tab[] = ['dashboard', 'ai', 'vision', 'audio', 'music', 'weather', 'navigation', 'device', 'settings']
const mobileTabs: Tab[] = ['dashboard', 'ai', 'vision', 'music', 'settings']

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl font-mono text-xs text-cyan-300 animate-slide-in flex items-center gap-3"
      style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', backdropFilter: 'blur(16px)', boxShadow: '0 0 20px rgba(0,229,255,0.15)' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(0,229,255,0.8)' }} />
      {msg}
      <button onClick={onDismiss} className="text-white/30 hover:text-white ml-1">✕</button>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, voiceState, wakeWord }: {
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  voiceState: string
  wakeWord: string
}) {
  const { backendOnline } = useAppContext()
  const stateColors: Record<string, string> = { idle: '#ffffff30', wake_word: '#4d9eff', listening: '#a855f7', processing: '#00e5ff' }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen flex-shrink-0 relative z-10"
      style={{ background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(0,229,255,0.08)', boxShadow: '4px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border border-cyan-400/50" style={{ animation: 'ring-spin 8s linear infinite' }} />
            <div className="absolute inset-1.5 rounded-full border border-purple-500/30" style={{ animation: 'ring-spin-reverse 12s linear infinite' }} />
            <div className="absolute inset-2.5 rounded-full bg-cyan-400/20 border border-cyan-400/70"
              style={{ boxShadow: '0 0 10px rgba(0,229,255,0.5)' }} />
          </div>
          <div>
            <div className="font-display text-[10px] font-black tracking-[0.2em] text-white/80">VISIONARY</div>
            <div className="font-display text-[10px] font-black tracking-[0.2em] text-cyan-400" style={{ textShadow: '0 0 10px rgba(0,229,255,0.7)' }}>NEXUS</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{
            backgroundColor: backendOnline ? '#4ade80' : '#f59e0b',
            boxShadow: `0 0 5px ${backendOnline ? '#4ade80' : '#f59e0b'}`,
          }} />
          <span className="font-mono text-[9px] text-white/30 tracking-widest">
            {backendOnline ? 'BACKEND ONLINE' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {sidebarTabs.map(id => {
          const isActive = activeTab === id
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? 'nav-item-active' : 'hover:bg-white/5'}`}>
              <span className={`transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-white/35 group-hover:text-white/65'}`}>
                {icons[id]}
              </span>
              <span className={`font-display text-[10px] tracking-wider font-medium transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-white/70'}`}>
                {tabLabels[id].toUpperCase()}
              </span>
              {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 5px rgba(0,229,255,0.8)' }} />}
            </button>
          )
        })}
      </nav>

      {/* Voice status + battery */}
      <div className="px-3 py-3 border-t border-white/5 space-y-2">
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stateColors[voiceState] || '#ffffff30', boxShadow: voiceState !== 'idle' ? `0 0 5px ${stateColors[voiceState]}` : 'none' }} />
          <span className="font-mono text-[9px] text-white/35 truncate">
            {voiceState === 'idle' ? `Wake: "${wakeWord}"` : voiceState.toUpperCase()}
          </span>
        </div>
        <div className="glass rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Battery</span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-green-400 w-3/4" style={{ boxShadow: '0 0 4px rgba(74,222,128,0.6)' }} />
            </div>
            <span className="font-mono text-[9px] text-green-400">74%</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Main App (inner, needs context) ──────────────────────────────────────────
function AppInner() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('activeTab')
    return (saved as Tab) || 'dashboard'
  })
  const [toast, setToast] = useState<string | null>(null)
  const { settings } = useAppContext()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTracks, setCurrentTracks] = useState<import('./api/music').Track[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const navigate = useCallback((tab: Tab) => {
    setActiveTab(tab)
    localStorage.setItem('activeTab', tab)
  }, [])

  const playTrack = useCallback((track: import('./api/music').Track) => {
    if (!track?.audio) return
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = track.audio
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [])

  const handleVoiceCommand = useCallback(async (rawText: string) => {
    const cmd = parseCommand(rawText)
    showToast(`Voice: "${rawText}"`)

    switch (cmd.type) {
      case 'TAB_SWITCH':
        navigate(cmd.payload as Tab)
        break
      case 'NEW_CHAT':
        navigate('ai')
        showToast('Opening AI Assistant — create a new chat')
        break
      case 'WEATHER':
        navigate('weather')
        break
      case 'NAVIGATION':
        navigate('navigation')
        break
      case 'CAMERA':
        navigate('vision')
        break
      case 'DEVICE_STATUS':
        navigate('device')
        break
      case 'SETTINGS':
        navigate('settings')
        break
      case 'PLAY_MUSIC': {
        navigate('music')
        if (cmd.payload) {
          try {
            const res = await musicApi.search(cmd.payload, 5)
            if (res.tracks[0]) {
              setCurrentTracks(res.tracks)
              setTrackIdx(0)
              playTrack(res.tracks[0])
              showToast(`Now playing: ${res.tracks[0].name}`)
            }
          } catch { showToast('Music search failed') }
        }
        break
      }
      case 'PAUSE_MUSIC':
        audioRef.current?.pause()
        setIsPlaying(false)
        break
      case 'RESUME_MUSIC':
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})
        break
      case 'NEXT_TRACK':
        if (currentTracks[trackIdx + 1]) { setTrackIdx(i => i + 1); playTrack(currentTracks[trackIdx + 1]) }
        break
      case 'PREVIOUS_TRACK':
        if (trackIdx > 0) { setTrackIdx(i => i - 1); playTrack(currentTracks[trackIdx - 1]) }
        break
      case 'STOP_MUSIC':
        audioRef.current?.pause()
        if (audioRef.current) { audioRef.current.currentTime = 0 }
        setIsPlaying(false)
        break
      case 'GENERAL_AI':
        navigate('ai')
        break
      default:
        break
    }
  }, [navigate, showToast, playTrack, currentTracks, trackIdx])

  const { state: voiceState, startListening } = useVoice({
    wakeWord: settings.wake_word,
    onCommand: handleVoiceCommand,
    enabled: settings.voice_input === 'true',
  })

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col md:flex-row relative overflow-hidden">
      {/* Backgrounds */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0" />
      <div className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 animate-orb"
        style={{ top: '-10%', left: '-10%', background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)' }} />
      <div className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{ bottom: '-5%', right: '-5%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', animation: 'orb-drift 16s ease-in-out infinite reverse' }} />
      <div className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{ top: '40%', left: '40%', background: 'radial-gradient(circle, rgba(77,158,255,0.04) 0%, transparent 70%)', animation: 'orb-drift 20s ease-in-out infinite' }} />

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={navigate} voiceState={voiceState} wakeWord={settings.wake_word} />

      {/* Main */}
      <main className="flex-1 relative z-10 overflow-auto pb-20 md:pb-0" style={{ minHeight: '100vh' }}>
        {/* Top bar (mobile) with wake word button */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5"
          style={{ background: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="font-display text-xs font-bold tracking-[0.2em] text-cyan-400" style={{ textShadow: '0 0 10px rgba(0,229,255,0.6)' }}>
            VISIONARY NEXUS
          </div>
          <button
            onClick={() => startListening(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: voiceState !== 'idle' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${voiceState !== 'idle' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={voiceState !== 'idle' ? '#a855f7' : '#ffffff50'} strokeWidth="1.5" className="w-4 h-4">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" strokeLinecap="round"/>
            </svg>
            <span className="font-display text-[9px] tracking-widest" style={{ color: voiceState !== 'idle' ? '#a855f7' : '#ffffff40' }}>
              {voiceState === 'idle' ? 'VOICE' : voiceState.toUpperCase()}
            </span>
          </button>
        </div>

        <div className="animate-slide-in" key={activeTab}>
          {activeTab === 'dashboard' && <Dashboard setActiveTab={navigate} />}
          {activeTab === 'ai' && <AIAssistant />}
          {activeTab === 'vision' && <Vision />}
          {activeTab === 'audio' && <AudioPanel />}
          {activeTab === 'music' && <Music />}
          {activeTab === 'weather' && <Weather />}
          {activeTab === 'navigation' && <Navigation />}
          {activeTab === 'device' && <Device />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'rgba(3,7,18,0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,229,255,0.1)' }}>
        {mobileTabs.map(id => (
          <button key={id} onClick={() => navigate(id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200">
            <span className={`transition-colors ${activeTab === id ? 'text-cyan-400' : 'text-white/25'}`}>{icons[id]}</span>
            <span className={`font-display text-[7px] tracking-wider ${activeTab === id ? 'text-cyan-400' : 'text-white/25'}`}>
              {tabLabels[id].split(' ')[0].toUpperCase()}
            </span>
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
