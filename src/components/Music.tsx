import { useState, useRef, useEffect } from 'react'
import { musicApi, type Track } from '../api/music'

function WaveAnim({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height: 18 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-1 rounded-full" style={{
          backgroundColor: '#00e5ff',
          height: active ? undefined : '3px',
          ...(active ? { height: `${4 + Math.sin(i * 1.2) * 6 + 4}px` } : {}),
          animation: active ? `waveform-bar ${0.3 + i * 0.08}s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.06}s`,
          boxShadow: active ? '0 0 4px rgba(0,229,255,0.6)' : 'none',
        }} />
      ))}
    </div>
  )
}

export default function Music() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [queueIndex, setQueueIndex] = useState(0)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Default search on load
    handleSearch('ambient electronic')
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100)
    }
    const onEnded = () => {
      if (tracks.length > queueIndex + 1) playAt(queueIndex + 1)
      else setPlaying(false)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded) }
  }, [tracks, queueIndex])

  const handleSearch = async (q?: string) => {
    const searchQ = q ?? query.trim()
    if (!searchQ) return
    setLoading(true); setError(null)
    try {
      const res = await musicApi.search(searchQ)
      setTracks(res.tracks)
      if (res.tracks.length === 0) setError('No tracks found')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally { setLoading(false) }
  }

  const playAt = (index: number) => {
    const track = tracks[index]
    if (!track?.audio) { setError('No audio available for this track'); return }
    setCurrentTrack(track)
    setQueueIndex(index)
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = track.audio
    audioRef.current.volume = volume / 100
    audioRef.current.play().then(() => setPlaying(true)).catch(e => setError(String(e)))
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(e => setError(String(e))) }
  }

  const nextTrack = () => { if (queueIndex < tracks.length - 1) playAt(queueIndex + 1) }
  const prevTrack = () => { if (queueIndex > 0) playAt(queueIndex - 1) }

  const seekTo = (pct: number) => {
    if (!audioRef.current?.duration) return
    audioRef.current.currentTime = (pct / 100) * audioRef.current.duration
    setProgress(pct)
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-widest text-white">MUSIC</h1>
          <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">Jamendo · Free Streaming</div>
        </div>
        {currentTrack && (
          <div className="flex items-center gap-2">
            <WaveAnim active={playing} />
            <span className="font-mono text-[10px] text-cyan-400 max-w-32 truncate">{currentTrack.name}</span>
          </div>
        )}
      </div>

      {/* Now playing bar */}
      {currentTrack && (
        <div className="glass-cyan rounded-2xl p-4 flex gap-4 items-center">
          <img src={currentTrack.image} alt={currentTrack.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(0,229,255,0.2)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm text-white truncate">{currentTrack.name}</div>
            <div className="font-mono text-xs text-white/50 truncate">{currentTrack.artist_name}</div>
            {/* Progress */}
            <div className="mt-2 flex items-center gap-2">
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer bg-white/10 overflow-hidden"
                onClick={e => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                  seekTo(((e.clientX - rect.left) / rect.width) * 100)
                }}
              >
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00e5ff, #a855f7)', boxShadow: '0 0 6px rgba(0,229,255,0.4)' }} />
              </div>
              <span className="font-mono text-[9px] text-white/30 flex-shrink-0">{formatDuration(currentTrack.duration)}</span>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={prevTrack} disabled={queueIndex === 0}
              className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button onClick={togglePlay}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}>
              {playing
                ? <svg viewBox="0 0 24 24" fill="#00e5ff" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg viewBox="0 0 24 24" fill="#00e5ff" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={nextTrack} disabled={queueIndex >= tracks.length - 1}
              className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff50" strokeWidth="1.5" className="w-4 h-4">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round"/>
            </svg>
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))}
              className="w-20" />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search tracks, artists, genres…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-transparent outline-none font-mono text-sm text-white/80 placeholder-white/20"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.4)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button onClick={() => handleSearch()}
          className="px-5 py-2.5 rounded-xl font-display text-[11px] tracking-wider transition-all hover:scale-105"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}>
          {loading ? '…' : 'SEARCH'}
        </button>
      </div>

      {error && <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

      {/* Track list */}
      <div className="glass rounded-2xl overflow-hidden">
        {tracks.length === 0 && !loading && (
          <div className="p-8 text-center font-mono text-xs text-white/30">Search for music above</div>
        )}
        {tracks.map((track, i) => (
          <div key={track.id}
            onClick={() => playAt(i)}
            className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-white/5 last:border-0 hover:bg-white/5 ${currentTrack?.id === track.id ? 'bg-cyan-500/5' : ''}`}>
            <div className="w-6 flex-shrink-0 text-center">
              {currentTrack?.id === track.id && playing
                ? <WaveAnim active={true} />
                : <span className="font-mono text-xs text-white/25">{i + 1}</span>}
            </div>
            <img src={track.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div className="flex-1 min-w-0">
              <div className={`font-mono text-sm truncate ${currentTrack?.id === track.id ? 'text-cyan-400' : 'text-white/80'}`}>{track.name}</div>
              <div className="font-mono text-[10px] text-white/35 truncate">{track.artist_name}</div>
            </div>
            <div className="font-mono text-[10px] text-white/25 flex-shrink-0">{formatDuration(track.duration)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
