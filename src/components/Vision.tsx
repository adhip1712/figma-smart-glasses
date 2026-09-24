import { useState, useEffect, useCallback } from 'react'
import { cameraApi, type CameraStatus } from '../api/services'

export default function Vision() {
  const [status, setStatus] = useState<CameraStatus | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [scanY, setScanY] = useState(0)
  const [showHUD, setShowHUD] = useState(true)

  const fetchStatus = useCallback(async () => {
    try { setStatus(await cameraApi.status()) } catch { /* backend offline */ }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!status?.streaming) return
    const interval = setInterval(() => setScanY(prev => (prev >= 100 ? 0 : prev + 0.9)), 22)
    return () => clearInterval(interval)
  }, [status?.streaming])

  const action = async (fn: () => Promise<unknown>, name: string) => {
    setLoading(name); setError(null)
    try {
      await fn()
      await fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally { setLoading(null) }
  }

  const handleCapture = async () => {
    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 300)
    await action(cameraApi.capture, 'capture')
  }

  const detectedObjects = status?.streaming ? [
    { label: 'Laptop', confidence: 96.2, x: 15, y: 20, w: 35, h: 25, color: '#00e5ff' },
    { label: 'Coffee Mug', confidence: 89.1, x: 60, y: 55, w: 12, h: 18, color: '#a855f7' },
    { label: 'Notebook', confidence: 91.8, x: 52, y: 20, w: 20, h: 30, color: '#4d9eff' },
    { label: 'Person', confidence: 98.4, x: 72, y: 10, w: 22, h: 60, color: '#4ade80' },
  ] : []

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white">VISION MODE</h1>
          <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5 uppercase">
            ESP32-CAM · Neural Vision System
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
          <div className={`w-2 h-2 rounded-full ${status?.streaming ? 'bg-green-400' : 'bg-white/20'}`}
            style={status?.streaming ? { boxShadow: '0 0 6px #4ade80', animation: 'status-blink 2s infinite' } : {}} />
          <span className={`font-display text-[10px] tracking-widest ${status?.streaming ? 'text-green-400' : 'text-white/30'}`}>
            {status?.streaming ? 'LIVE' : status?.status?.toUpperCase() ?? 'STANDBY'}
          </span>
        </div>
      </div>

      {error && <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Camera viewport */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1528 40%, #0a1020 70%, #050810 100%)',
              border: '1px solid rgba(0,229,255,0.2)',
              boxShadow: '0 0 40px rgba(0,229,255,0.08)',
              aspectRatio: '16/9',
            }}>
            {captureFlash && <div className="absolute inset-0 bg-white/60 z-30 pointer-events-none" />}

            {!status?.streaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
                <div className="text-4xl opacity-30">📷</div>
                <div className="font-mono text-xs text-white/30">Camera offline — press START to connect</div>
                <div className="font-mono text-[10px] text-white/20">Configure ESP32-CAM stream URL in Settings</div>
              </div>
            )}

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)', backgroundSize: '10% 10%' }} />

            {/* Ambient gradient */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(ellipse at 30% 40%, rgba(0,229,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(168,85,247,0.1) 0%, transparent 50%)' }} />

            {/* Detection boxes */}
            {showHUD && detectedObjects.map(obj => (
              <div key={obj.label} className="absolute"
                style={{ left: `${obj.x}%`, top: `${obj.y}%`, width: `${obj.w}%`, height: `${obj.h}%` }}>
                <div className="absolute inset-0 rounded-sm"
                  style={{ border: `1px solid ${obj.color}`, boxShadow: `0 0 8px ${obj.color}40, inset 0 0 8px ${obj.color}10` }} />
                {/* TL */}
                <div className="absolute -top-px -left-px w-3 h-3 animate-hud-corner"
                  style={{ borderTop: `2px solid ${obj.color}`, borderLeft: `2px solid ${obj.color}` }} />
                {/* TR */}
                <div className="absolute -top-px -right-px w-3 h-3 animate-hud-corner"
                  style={{ borderTop: `2px solid ${obj.color}`, borderRight: `2px solid ${obj.color}` }} />
                {/* BL */}
                <div className="absolute -bottom-px -left-px w-3 h-3 animate-hud-corner"
                  style={{ borderBottom: `2px solid ${obj.color}`, borderLeft: `2px solid ${obj.color}` }} />
                {/* BR */}
                <div className="absolute -bottom-px -right-px w-3 h-3 animate-hud-corner"
                  style={{ borderBottom: `2px solid ${obj.color}`, borderRight: `2px solid ${obj.color}` }} />
                <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded-sm font-mono text-[9px] whitespace-nowrap"
                  style={{ background: `${obj.color}20`, border: `1px solid ${obj.color}60`, color: obj.color }}>
                  {obj.label} {obj.confidence.toFixed(0)}%
                </div>
              </div>
            ))}

            {/* Scan line */}
            {status?.streaming && (
              <div className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${scanY}%`, height: 2,
                  background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.8) 20%, rgba(0,229,255,1) 50%, rgba(0,229,255,0.8) 80%, transparent)',
                  boxShadow: '0 0 12px rgba(0,229,255,0.6)',
                }} />
            )}

            {/* HUD corners */}
            {showHUD && (
              <div className="absolute inset-3 pointer-events-none animate-hud-corner">
                <div className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: '2px solid rgba(0,229,255,0.6)', borderLeft: '2px solid rgba(0,229,255,0.6)' }} />
                <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: '2px solid rgba(0,229,255,0.6)', borderRight: '2px solid rgba(0,229,255,0.6)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderBottom: '2px solid rgba(0,229,255,0.6)', borderLeft: '2px solid rgba(0,229,255,0.6)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: '2px solid rgba(0,229,255,0.6)', borderRight: '2px solid rgba(0,229,255,0.6)' }} />
              </div>
            )}

            {/* Status overlays */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <div className="font-mono text-[9px] bg-black/60 px-2 py-1 rounded text-white/40">
                {status?.resolution ?? '—'} · {status?.fps ?? '—'}FPS
              </div>
            </div>
            {status?.streaming && (
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1 font-mono text-[9px] bg-black/60 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-status-blink" style={{ color: '#ef4444' }} />
                  <span className="text-white/60">REC</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap gap-2">
            {!status?.streaming ? (
              <button onClick={() => action(cameraApi.start, 'start')} disabled={loading === 'start'}
                className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                {loading === 'start' ? '…' : '▶ START'}
              </button>
            ) : (
              <button onClick={() => action(cameraApi.stop, 'stop')} disabled={loading === 'stop'}
                className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                {loading === 'stop' ? '…' : '■ STOP'}
              </button>
            )}
            <button onClick={handleCapture} disabled={loading === 'capture'}
              className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105"
              style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}>
              {loading === 'capture' ? '…' : '📷 CAPTURE'}
            </button>
            <button onClick={() => setShowHUD(v => !v)}
              className="px-4 py-2 rounded-xl font-display text-[10px] tracking-wider transition-all hover:scale-105"
              style={{
                background: showHUD ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showHUD ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: showHUD ? '#a855f7' : '#ffffff30',
              }}>
              HUD {showHUD ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Camera status */}
          <div className="glass rounded-2xl p-4">
            <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-4">Camera Status</div>
            {[
              { label: 'Status', value: status?.status ?? '—', color: status?.streaming ? '#4ade80' : '#ffffff40' },
              { label: 'Resolution', value: status?.resolution ?? '—', color: '#00e5ff' },
              { label: 'Frame Rate', value: status?.fps ? `${status.fps} FPS` : '—', color: '#4d9eff' },
              { label: 'Streaming', value: status?.streaming ? 'YES' : 'NO', color: status?.streaming ? '#4ade80' : '#ffffff30' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="font-mono text-[10px] text-white/35">{label}</span>
                <span className="font-mono text-[10px] font-medium" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Detected objects */}
          <div className="glass rounded-2xl p-4">
            <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-3">
              Detected ({detectedObjects.length})
            </div>
            {detectedObjects.length === 0 ? (
              <div className="font-mono text-[10px] text-white/20 text-center py-4">No objects — start camera</div>
            ) : (
              <div className="space-y-3">
                {detectedObjects.map(obj => (
                  <div key={obj.label} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: obj.color, boxShadow: `0 0 6px ${obj.color}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-[11px] text-white/75">{obj.label}</span>
                        <span className="font-mono text-[10px]" style={{ color: obj.color }}>{obj.confidence.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${obj.confidence}%`, backgroundColor: obj.color, boxShadow: `0 0 4px ${obj.color}` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
