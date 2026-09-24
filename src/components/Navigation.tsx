import { useState } from 'react'
import { navigationApi, type RouteData } from '../api/services'

const maneuverIcons: Record<string, string> = {
  depart: '🚀', arrive: '📍', turn: '↩', 'turn-left': '←', 'turn-right': '→',
  'slight left': '↖', 'slight right': '↗', straight: '↑', merge: '⤴',
  roundabout: '🔄', fork: '⑂', default: '•',
}

function ManeuverIcon({ type, modifier }: { type: string; modifier: string }) {
  const key = modifier ? `${type}-${modifier}`.toLowerCase() : type.toLowerCase()
  const icon = maneuverIcons[key] || maneuverIcons[type.toLowerCase()] || maneuverIcons.default
  return <span className="text-sm">{icon}</span>
}

export default function Navigation() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  const getRoute = async () => {
    if (!origin.trim() || !destination.trim()) { setError('Enter both origin and destination'); return }
    setLoading(true); setError(null); setRoute(null)
    try {
      const res = await navigationApi.route(origin, destination)
      setRoute(res)
      setActiveStep(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Route not found')
    } finally { setLoading(false) }
  }

  const formatDuration = (min: number) => {
    if (min < 60) return `${Math.round(min)} min`
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`
  }

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-widest text-white">NAVIGATION</h1>
        <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">OpenStreetMap · OSRM Routing</div>
      </div>

      {/* Input form */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1 pt-3">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400" style={{ boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
            <div className="w-0.5 h-6 bg-white/15 rounded" />
            <div className="w-2.5 h-2.5 rounded-sm border-2 border-purple-500" style={{ boxShadow: '0 0 8px rgba(168,85,247,0.5)' }} />
          </div>
          <div className="flex-1 space-y-2">
            <input
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && getRoute()}
              placeholder="Origin (e.g. Times Square, New York)"
              className="w-full px-4 py-2.5 rounded-xl bg-transparent outline-none font-mono text-sm text-white/80 placeholder-white/20"
              style={{ border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.04)' }}
            />
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && getRoute()}
              placeholder="Destination (e.g. Central Park, New York)"
              className="w-full px-4 py-2.5 rounded-xl bg-transparent outline-none font-mono text-sm text-white/80 placeholder-white/20"
              style={{ border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.04)' }}
            />
          </div>
        </div>
        <button onClick={getRoute} disabled={loading}
          className="w-full py-2.5 rounded-xl font-display text-[11px] tracking-widest transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.35)', color: '#00e5ff', boxShadow: '0 0 16px rgba(0,229,255,0.1)' }}>
          {loading ? 'CALCULATING ROUTE…' : 'GET DIRECTIONS'}
        </button>
      </div>

      {error && <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      {/* Route summary */}
      {route && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5"
            style={{ border: '1px solid rgba(0,229,255,0.15)', background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(168,85,247,0.04) 100%)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-xs text-white/40 uppercase tracking-widest">Route</div>
                <div className="font-display text-sm text-white mt-1">{route.origin} → {route.destination}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold text-cyan-400 text-glow-cyan">
                  {formatDuration(route.duration_min)}
                </div>
                <div className="font-mono text-xs text-white/40">{route.distance_km.toFixed(1)} km</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Distance', value: `${route.distance_km.toFixed(1)} km`, color: '#00e5ff' },
                { label: 'Duration', value: formatDuration(route.duration_min), color: '#a855f7' },
                { label: 'Steps', value: String(route.steps.length), color: '#4d9eff' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass rounded-xl p-3 text-center">
                  <div className="font-mono text-[9px] text-white/30 uppercase tracking-widest">{label}</div>
                  <div className="font-mono text-sm font-bold mt-1" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Turn-by-turn */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <span className="font-display text-xs tracking-widest text-white/40 uppercase">Turn-by-Turn Directions</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {route.steps.map((step, i) => (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`flex items-start gap-4 px-5 py-3 border-b border-white/5 last:border-0 cursor-pointer transition-all ${activeStep === i ? 'bg-cyan-500/5' : 'hover:bg-white/3'}`}
                >
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-sm"
                    style={{
                      background: activeStep === i ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${activeStep === i ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <ManeuverIcon type={step.type} modifier={step.modifier} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-mono text-xs ${activeStep === i ? 'text-cyan-300' : 'text-white/65'} truncate`}>
                      {step.instruction || `${step.type} ${step.modifier}`.trim() || 'Continue'}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-[10px] text-white/30">{step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)}km` : `${step.distance}m`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!route && !loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🗺</div>
          <div className="font-mono text-xs text-white/30">Enter origin and destination to get directions</div>
        </div>
      )}
    </div>
  )
}
