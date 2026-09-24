import { useState, useEffect, useCallback } from 'react'
import { deviceApi, type DeviceStatus } from '../api/services'

function SignalBars({ strength }: { strength: number }) {
  const bars = Math.min(5, Math.max(0, Math.round((strength + 100) / 14)))
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-2 rounded-sm" style={{
          height: `${i * 4}px`,
          backgroundColor: i <= bars ? '#00e5ff' : 'rgba(255,255,255,0.12)',
          boxShadow: i <= bars ? '0 0 4px rgba(0,229,255,0.5)' : 'none',
        }} />
      ))}
    </div>
  )
}

function BatteryBar({ level }: { level: number }) {
  const color = level > 50 ? '#4ade80' : level > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center px-0.5 gap-0.5 rounded-sm"
        style={{ width: 44, height: 20, border: `1px solid ${color}60`, background: `${color}10` }}>
        <div className="h-3 rounded-sm transition-all duration-700"
          style={{ width: `${level * 0.34}px`, background: color, boxShadow: `0 0 6px ${color}` }} />
        <div className="absolute -right-1.5 top-1/2 w-1.5 h-2.5 rounded-r-sm -translate-y-1/2"
          style={{ background: `${color}60` }} />
      </div>
      <span className="font-mono text-sm font-bold" style={{ color }}>{level}%</span>
    </div>
  )
}

export default function Device() {
  const [status, setStatus] = useState<DeviceStatus | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' }[]>([])

  const logColors = { info: '#4d9eff', success: '#4ade80', warn: '#f59e0b', error: '#ef4444' }

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLog(prev => [{ time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg, type }, ...prev.slice(0, 29)])
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const s = await deviceApi.status()
      setStatus(s)
    } catch { addLog('Backend unreachable', 'warn') }
  }, [addLog])

  useEffect(() => {
    fetchStatus()
    addLog('Device panel loaded', 'info')
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus, addLog])

  const action = async (fn: () => Promise<unknown>, label: string, name: string) => {
    setLoading(name); setError(null)
    addLog(`${label} initiated…`, 'info')
    try {
      await fn()
      await fetchStatus()
      addLog(`${label} complete`, 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(msg)
      addLog(`${label} failed: ${msg}`, 'error')
    } finally { setLoading(null) }
  }

  const isConnected = status?.status === 'connected'

  const components = [
    { name: 'ESP32-CAM', model: 'AI-Thinker v2', statusKey: 'camera', color: '#4ade80', details: [['Resolution', '1920×1080'], ['FPS', '30'], ['Flash', '4MB'], ['PSRAM', '8MB']] },
    { name: 'INMP441', model: 'MEMs Microphone', statusKey: 'mic', color: '#a855f7', details: [['Sample Rate', '44.1kHz'], ['Bit Depth', '24-bit'], ['SNR', '62dB'], ['Interface', 'I2S']] },
    { name: 'Speaker', model: 'MAX98357 Amp', statusKey: 'speaker', color: '#4d9eff', details: [['Power', '3.2W'], ['Freq', '20Hz–20kHz'], ['THD', '<0.1%'], ['Interface', 'I2S']] },
  ]

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white">DEVICE</h1>
          <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5 uppercase">Hardware Interface Layer</div>
        </div>
        <div className="flex items-center gap-4">
          {status && <BatteryBar level={status.battery} />}
          {status && <SignalBars strength={status.signal} />}
        </div>
      </div>

      {error && <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400 flex items-center justify-between"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        {error} <button onClick={() => setError(null)} className="ml-2 hover:text-white">✕</button>
      </div>}

      {/* Connection bar */}
      <div className="glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Device ID', value: status?.device_id ?? '—', color: '#00e5ff' },
          { label: 'IP Address', value: status?.ip ?? 'Not connected', color: '#4d9eff' },
          { label: 'Status', value: status?.status?.toUpperCase() ?? '—', color: isConnected ? '#4ade80' : '#ffffff40' },
          { label: 'Firmware', value: status?.firmware ?? '—', color: '#a855f7' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-1">{label}</div>
            <div className="font-mono text-xs font-medium" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isConnected ? (
          <button onClick={() => action(deviceApi.connect, 'Connect', 'connect')} disabled={!!loading}
            className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
            {loading === 'connect' ? '…' : '⚡ CONNECT'}
          </button>
        ) : (
          <button onClick={() => action(deviceApi.disconnect, 'Disconnect', 'disconnect')} disabled={!!loading}
            className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            {loading === 'disconnect' ? '…' : '⊘ DISCONNECT'}
          </button>
        )}
        <button onClick={() => action(deviceApi.restart, 'Restart', 'restart')} disabled={!!loading}
          className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
          {loading === 'restart' ? '…' : '↺ RESTART'}
        </button>
        <button onClick={() => action(deviceApi.sleep, 'Sleep', 'sleep')} disabled={!!loading}
          className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'rgba(77,158,255,0.08)', border: '1px solid rgba(77,158,255,0.2)', color: '#4d9eff' }}>
          {loading === 'sleep' ? '…' : '💤 SLEEP'}
        </button>
        <button onClick={() => action(deviceApi.wake, 'Wake', 'wake')} disabled={!!loading}
          className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
          {loading === 'wake' ? '…' : '☀ WAKE'}
        </button>
        <button onClick={fetchStatus}
          className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff50' }}>
          ↻ REFRESH
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hardware components */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {components.map(comp => (
            <div key={comp.name} className="glass rounded-2xl p-4 hover:scale-[1.02] transition-transform"
              style={{ border: `1px solid ${comp.color}25` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-2 h-2 rounded-full" style={{
                  backgroundColor: isConnected ? comp.color : '#ffffff25',
                  boxShadow: isConnected ? `0 0 6px ${comp.color}` : 'none',
                  animation: isConnected ? 'status-blink 2s infinite' : 'none',
                  color: comp.color,
                }} />
                <span className="font-mono text-[9px]" style={{ color: isConnected ? comp.color : '#ffffff30' }}>
                  {isConnected ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>
              <div className="font-display text-sm font-bold text-white mb-0.5">{comp.name}</div>
              <div className="font-mono text-[9px] text-white/30 mb-3">{comp.model}</div>
              <div className="space-y-1.5">
                {comp.details.map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="font-mono text-[9px] text-white/30">{l}</span>
                    <span className="font-mono text-[9px] text-white/60">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* System metrics */}
          <div className="md:col-span-3 glass rounded-2xl p-4">
            <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-4">System Resources</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CPU', value: 34, color: '#00e5ff', unit: '%', max: 100 },
                { label: 'Memory', value: 61, color: '#a855f7', unit: '%', max: 100 },
                { label: 'Storage', value: 42, color: '#4d9eff', unit: '%', max: 100 },
                { label: 'Temp', value: status?.battery ? 42 : 0, color: '#f59e0b', unit: '°C', max: 85 },
              ].map(({ label, value, color, unit, max }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-white/35 uppercase">{label}</span>
                    <span className="font-mono text-[9px]" style={{ color }}>{value}{unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="glass rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <span className="font-display text-xs tracking-widest text-white/40 uppercase">System Log</span>
            <button onClick={() => setLog([])} className="font-mono text-[9px] text-white/20 hover:text-white/50">clear</button>
          </div>
          <div className="flex-1 space-y-1 overflow-auto" style={{ maxHeight: 340 }}>
            {log.length === 0 && (
              <div className="font-mono text-[9px] text-white/20 text-center py-4">No events yet</div>
            )}
            {log.map((e, i) => (
              <div key={i} className="flex gap-2 py-0.5 font-mono text-[9px] border-b border-white/5 last:border-0">
                <span className="text-white/20 flex-shrink-0">{e.time}</span>
                <span style={{ color: logColors[e.type] }}>{e.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
