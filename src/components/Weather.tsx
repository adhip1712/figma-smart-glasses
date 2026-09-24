import { useState, useEffect } from 'react'
import { weatherApi, type WeatherData } from '../api/services'

const weatherIcons: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '🌤',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧', '09n': '🌧', '10d': '🌦', '10n': '🌧',
  '11d': '⛈', '11n': '⛈', '13d': '❄️', '13n': '❄️',
  '50d': '🌫', '50n': '🌫',
}

const popularCities = ['New York', 'London', 'Tokyo', 'Mumbai', 'Bangalore', 'Dubai', 'Paris', 'Sydney']

export default function Weather() {
  const [city, setCity] = useState('London')
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<WeatherData[]>([])

  useEffect(() => { fetchWeather('London') }, [])

  const fetchWeather = async (c: string) => {
    setLoading(true); setError(null)
    try {
      const res = await weatherApi.get(c)
      setData(res)
      setHistory(prev => [res, ...prev.filter(h => h.city !== res.city)].slice(0, 6))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch weather')
    } finally { setLoading(false) }
  }

  const statBlock = (label: string, value: string, color: string) => (
    <div key={label} className="glass rounded-xl p-3 text-center">
      <div className="font-mono text-[9px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
      <div className="font-mono text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-widest text-white">WEATHER</h1>
        <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">OpenWeatherMap · Real-time</div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchWeather(city)}
          placeholder="Enter city name…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-transparent outline-none font-mono text-sm text-white/80 placeholder-white/20"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.4)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button onClick={() => fetchWeather(city)}
          className="px-5 py-2.5 rounded-xl font-display text-[11px] tracking-wider transition-all hover:scale-105"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}>
          {loading ? '…' : 'GET'}
        </button>
      </div>

      {/* Quick cities */}
      <div className="flex flex-wrap gap-2">
        {popularCities.map(c => (
          <button key={c} onClick={() => { setCity(c); fetchWeather(c) }}
            className="px-3 py-1 rounded-full font-mono text-[10px] transition-all hover:scale-105"
            style={{
              background: data?.city === c ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${data?.city === c ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: data?.city === c ? '#00e5ff' : '#ffffff50',
            }}>{c}</button>
        ))}
      </div>

      {error && <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      {/* Main card */}
      {data && (
        <div className="glass rounded-2xl p-6"
          style={{ border: '1px solid rgba(0,229,255,0.15)', background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(168,85,247,0.04) 100%)' }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-display text-2xl font-bold text-white">{data.city}, {data.country}</div>
              <div className="font-mono text-sm text-white/50 mt-1">{data.description}</div>
            </div>
            <div className="text-5xl">{weatherIcons[data.icon] ?? '🌡'}</div>
          </div>
          <div className="flex items-end gap-4 mb-6">
            <div className="font-display text-7xl font-black text-glow-cyan" style={{ color: '#00e5ff' }}>
              {Math.round(data.temp)}°
            </div>
            <div className="pb-2">
              <div className="font-mono text-xs text-white/40">Feels like {Math.round(data.feels_like)}°C</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statBlock('Humidity', `${data.humidity}%`, '#4d9eff')}
            {statBlock('Wind', `${data.wind_speed} m/s`, '#a855f7')}
            {statBlock('Visibility', `${(data.visibility / 1000).toFixed(1)} km`, '#00e5ff')}
            {statBlock('Feels Like', `${Math.round(data.feels_like)}°C`, '#4ade80')}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="glass rounded-2xl p-4">
          <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-3">Recent Searches</div>
          <div className="flex flex-wrap gap-3">
            {history.slice(1).map(h => (
              <button key={h.city} onClick={() => { setCity(h.city); fetchWeather(h.city) }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass hover:bg-white/5 transition-all">
                <span className="text-lg">{weatherIcons[h.icon] ?? '🌡'}</span>
                <div>
                  <div className="font-mono text-[11px] text-white/70">{h.city}</div>
                  <div className="font-mono text-[10px] text-white/35">{Math.round(h.temp)}°C</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
