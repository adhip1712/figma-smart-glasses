import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

function Toggle({ value, onChange, color = '#00e5ff' }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!value)} className="w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0"
      style={{ background: value ? `${color}40` : 'rgba(255,255,255,0.1)' }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
        style={{ left: value ? 'calc(100% - 22px)' : '2px', background: value ? color : '#ffffff40', boxShadow: value ? `0 0 10px ${color}80` : 'none' }} />
    </button>
  )
}

function Select({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-transparent outline-none font-mono text-xs text-cyan-400 cursor-pointer"
      style={{ background: 'rgba(0,229,255,0.05)' }}>
      {options.map(o => <option key={o} value={o} style={{ background: '#0d1528', color: '#00e5ff' }}>{o}</option>)}
    </select>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="font-display text-xs tracking-widest text-white/40 uppercase pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-white/75">{label}</div>
        {description && <div className="font-mono text-[10px] text-white/30 mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { settings, updateSetting, backendOnline } = useAppContext()
  const [saved, setSaved] = useState(false)

  const b = (key: string) => settings[key as keyof typeof settings] === 'true'
  const toggle = (key: string) => (v: boolean) => { updateSetting(key as keyof typeof settings, String(v)); flash() }
  const select = (key: string) => (v: string) => { updateSetting(key as keyof typeof settings, v); flash() }
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const wakeWordOptions = ['Hey Vision', 'Hey Visionary', 'Vision', 'Visionary', 'Hey Nexus', 'Nexus']

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white">SETTINGS</h1>
          <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">Visionary Nexus · System Config</div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="font-mono text-[10px] text-green-400">✓ Saved</span>}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full glass`}>
            <div className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: backendOnline ? '#4ade80' : '#ef4444',
              boxShadow: backendOnline ? '0 0 6px #4ade80' : 'none',
            }} />
            <span className="font-mono text-[9px]" style={{ color: backendOnline ? '#4ade80' : '#ef4444' }}>
              {backendOnline ? 'BACKEND ONLINE' : 'OFFLINE MODE'}
            </span>
          </div>
        </div>
      </div>

      <Section title="Voice & Wake Word">
        <Row label="Wake Word" description="Trigger phrase for voice activation">
          <Select options={wakeWordOptions} value={settings.wake_word} onChange={select('wake_word')} />
        </Row>
        <Row label="Voice Input" description="Enable microphone for commands">
          <Toggle value={b('voice_input')} onChange={toggle('voice_input')} />
        </Row>
        <Row label="Voice Output" description="Text-to-speech AI responses">
          <Toggle value={b('voice_output')} onChange={toggle('voice_output')} color="#a855f7" />
        </Row>
        <Row label="Microphone Active">
          <Toggle value={b('microphone')} onChange={toggle('microphone')} />
        </Row>
      </Section>

      <Section title="AI Chat">
        <Row label="AI Model" description="Groq inference engine">
          <span className="font-mono text-xs text-cyan-400">LLaMA-3.3-70B</span>
        </Row>
        <Row label="Backend Endpoint" description="FastAPI server URL">
          <span className="font-mono text-[10px] text-white/40">localhost:8001</span>
        </Row>
      </Section>

      <Section title="Music">
        <Row label="Autoplay" description="Auto-play next track">
          <Toggle value={b('music_autoplay')} onChange={toggle('music_autoplay')} color="#4d9eff" />
        </Row>
        <Row label="Service" description="Streaming provider">
          <span className="font-mono text-xs text-cyan-400">Jamendo (Free)</span>
        </Row>
      </Section>

      <Section title="Navigation">
        <Row label="Units" description="Distance units">
          <Select options={['metric', 'imperial']} value={settings.navigation_units} onChange={select('navigation_units')} />
        </Row>
        <Row label="Routing" description="Routing engine">
          <span className="font-mono text-xs text-white/40">OSRM + OpenStreetMap</span>
        </Row>
      </Section>

      <Section title="Camera">
        <Row label="Camera Enabled">
          <Toggle value={b('camera_enabled')} onChange={toggle('camera_enabled')} />
        </Row>
        <Row label="Hardware" description="Camera module">
          <span className="font-mono text-xs text-white/40">ESP32-CAM</span>
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <Select options={['Orion Dark', 'Midnight', 'Deep Space', 'Cyber']} value={settings.theme} onChange={select('theme')} />
        </Row>
        <Row label="Accent Color">
          <Select options={['Cyan', 'Purple', 'Blue', 'Green', 'Violet']} value={settings.accent_color} onChange={select('accent_color')} />
        </Row>
        <Row label="Animations">
          <Toggle value={b('animations')} onChange={toggle('animations')} />
        </Row>
      </Section>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="font-display text-xs tracking-widest text-red-400/60 uppercase mb-4">Danger Zone</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 py-2.5 rounded-xl font-display text-[10px] tracking-widest transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            FACTORY RESET
          </button>
          <button className="flex-1 py-2.5 rounded-xl font-display text-[10px] tracking-widest transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
            REBOOT DEVICE
          </button>
        </div>
      </div>
    </div>
  )
}
