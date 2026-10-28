import { useState, useRef, useEffect, useCallback } from 'react'
import { conversationsApi, type Conversation, type Message } from '../api/conversations'
import { useVoice, useSpeechOutput } from '../hooks/useVoice'
import { useAppContext } from '../context/AppContext'

// ── Simple markdown renderer ──────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []
  let codeLang = ''

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLang = line.slice(3); codeLines = [] }
      else {
        elements.push(
          <div key={i} className="my-2 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 font-mono text-[10px]"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#a855f7' }}>
              {codeLang || 'code'}
              <button
                onClick={() => navigator.clipboard.writeText(codeLines.join('\n'))}
                className="hover:text-cyan-400 transition-colors">copy</button>
            </div>
            <pre className="px-3 py-2 text-xs font-mono overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
        inCode = false; codeLines = []; codeLang = ''
      }
      return
    }
    if (inCode) { codeLines.push(line); return }

    if (line.startsWith('### ')) elements.push(<h3 key={i} className="text-sm font-bold text-cyan-300 mt-2">{line.slice(4)}</h3>)
    else if (line.startsWith('## ')) elements.push(<h2 key={i} className="text-sm font-bold text-cyan-400 mt-2">{line.slice(3)}</h2>)
    else if (line.startsWith('# ')) elements.push(<h1 key={i} className="text-base font-bold text-white mt-2">{line.slice(2)}</h1>)
    else if (line.startsWith('- ') || line.startsWith('* ')) elements.push(<li key={i} className="ml-3 text-sm text-white/80">{formatInline(line.slice(2))}</li>)
    else if (/^\d+\. /.test(line)) elements.push(<li key={i} className="ml-3 text-sm text-white/80 list-decimal">{formatInline(line.replace(/^\d+\. /, ''))}</li>)
    else if (line.trim() === '') elements.push(<div key={i} className="h-1" />)
    else elements.push(<p key={i} className="text-sm text-white/85 leading-relaxed">{formatInline(line)}</p>)
  })

  return <div className="space-y-0.5">{elements}</div>
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="px-1 rounded text-cyan-300 font-mono text-xs" style={{ background: 'rgba(0,0,0,0.3)' }}>{part.slice(1, -1)}</code>
    return part
  })
}

// ── Waveform ──────────────────────────────────────────────────────────────────
function MiniWaveform({ active, color = '#a855f7' }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-0.5" style={{ height: 20 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-full" style={{
          width: 2,
          backgroundColor: active ? color : `${color}40`,
          height: active ? undefined : '4px',
          minHeight: 4, maxHeight: 18,
          ...(active ? { height: `${4 + Math.sin(i * 0.8) * 8 + 4}px` } : {}),
          animation: active ? `waveform-bar ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.05}s`,
          boxShadow: active ? `0 0 4px ${color}` : 'none',
        }} />
      ))}
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
interface ChatTabProps {
  conv: Conversation
  isActive: boolean
  onSelect: () => void
  onRename: (id: number, title: string) => void
  onDelete: (id: number) => void
}

function ChatTab({ conv, isActive, onSelect, onRename, onDelete }: ChatTabProps) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(conv.title)

  const commit = () => {
    setEditing(false)
    if (editVal.trim() && editVal !== conv.title) onRename(conv.id, editVal.trim())
  }

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer flex-shrink-0 group transition-all duration-200 ${isActive ? 'nav-item-active' : 'hover:bg-white/5'}`}
      style={{ minWidth: 120, maxWidth: 160 }}
    >
      {editing ? (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setEditVal(conv.title) } }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent outline-none font-mono text-[11px] text-white border-b border-cyan-400/50 min-w-0"
        />
      ) : (
        <span className={`flex-1 font-mono text-[11px] truncate ${isActive ? 'text-cyan-400' : 'text-white/50'}`}>
          {conv.title}
        </span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); setEditing(true); setEditVal(conv.title) }}
          className="text-white/30 hover:text-cyan-400 transition-colors text-[10px]"
          title="Rename"
        >✎</button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
          className="text-white/30 hover:text-red-400 transition-colors text-[10px]"
          title="Delete"
        >✕</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { settings } = useAppContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(() => {
    const s = localStorage.getItem('activeConvId')
    return s ? Number(s) : null
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceOutputOn, setVoiceOutputOn] = useState(settings.voice_output === 'true')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const { speak } = useSpeechOutput()

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const list = await conversationsApi.list()
      setConversations(list)
      if (list.length === 0) return
      // Restore or select first
      const saved = localStorage.getItem('activeConvId')
      const savedId = saved ? Number(saved) : null
      const found = savedId && list.find(c => c.id === savedId)
      if (found) setActiveId(found.id)
      else if (!activeId) setActiveId(list[0].id)
    } catch { /* offline */ }
  }, [activeId])

  useEffect(() => { loadConversations() }, [])

  // Load messages for active conv
  useEffect(() => {
    if (!activeId) return
    localStorage.setItem('activeConvId', String(activeId))
    conversationsApi.messages(activeId)
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const newChat = useCallback(async () => {
    try {
      const conv = await conversationsApi.create()
      setConversations(prev => [conv, ...prev])
      setActiveId(conv.id)
      setMessages([])
    } catch { setError('Failed to create chat') }
  }, [])

  const deleteChat = useCallback(async (id: number) => {
    try {
      await conversationsApi.delete(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeId === id) {
        const remaining = conversations.filter(c => c.id !== id)
        setActiveId(remaining[0]?.id ?? null)
        setMessages([])
      }
    } catch { setError('Failed to delete chat') }
  }, [activeId, conversations])

  const renameChat = useCallback(async (id: number, title: string) => {
    try {
      await conversationsApi.rename(id, title)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    } catch { setError('Failed to rename') }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setError(null)

    const optimistic: Message = { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setLoading(true)

    try {
      const res = await conversationsApi.ask(text, activeId ?? undefined)
      // Refresh messages from server
      const msgs = await conversationsApi.messages(res.conversation_id)
      setMessages(msgs)

      // Auto-set conv if new
      if (!activeId) {
        setActiveId(res.conversation_id)
        loadConversations()
      }

      // Auto-rename after first message
      const conv = conversations.find(c => c.id === res.conversation_id)
      if (conv && conv.title === 'New Chat') {
        const newTitle = text.slice(0, 50)
        setConversations(prev => prev.map(c => c.id === res.conversation_id ? { ...c, title: newTitle } : c))
      }

      if (voiceOutputOn) speak(res.response)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error sending message')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setLoading(false)
    }
  }, [loading, activeId, conversations, voiceOutputOn, speak, loadConversations])

  // Voice input
  const handleVoiceCommand = useCallback((text: string) => {
    if (text.trim()) sendMessage(text)
  }, [sendMessage])

  const { state: voiceState, startListening, stopListening } = useVoice({
    wakeWord: settings.wake_word,
    sensitivity: settings.wake_word_sensitivity,
    onCommand: handleVoiceCommand,
    enabled: settings.voice_input === 'true',
  })

  const isListening = voiceState === 'listening'

  // Tab navigation
  const navChat = useCallback((dir: 1 | -1) => {
    if (conversations.length === 0) return
    const idx = conversations.findIndex(c => c.id === activeId)
    const next = (idx + dir + conversations.length) % conversations.length
    setActiveId(conversations[next].id)
  }, [conversations, activeId])

  const stateColors = { idle: '#ffffff40', wake_word: '#4d9eff', listening: '#a855f7', processing: '#00e5ff' }
  const stateLabels = { idle: 'READY', wake_word: 'WAKE', listening: 'LISTENING', processing: 'PROCESSING' }

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-0px)] max-h-screen p-4 md:p-6 gap-3 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-widest text-white">AI ASSISTANT</h1>
          <div className="font-mono text-[10px] text-white/30 tracking-widest mt-0.5">VISIONARY NEXUS · GROQ LLaMA-3.3</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceOutputOn(v => !v)}
            className="px-2 py-1 rounded font-mono text-[10px] transition-all"
            style={{ color: voiceOutputOn ? '#00e5ff' : '#ffffff30', border: `1px solid ${voiceOutputOn ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.1)'}` }}
            title="Toggle voice output"
          >🔊</button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: stateColors[voiceState],
              boxShadow: voiceState !== 'idle' ? `0 0 6px ${stateColors[voiceState]}` : 'none',
              animation: voiceState !== 'idle' ? 'status-blink 1s infinite' : 'none',
            }} />
            <span className="font-display text-[9px] tracking-widest" style={{ color: stateColors[voiceState] }}>
              {stateLabels[voiceState]}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Tabs bar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={newChat}
          className="flex-shrink-0 px-3 py-2 rounded-lg font-display text-[10px] tracking-wider transition-all hover:scale-105"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}
        >+ NEW</button>
        <button onClick={() => navChat(-1)} className="flex-shrink-0 w-7 h-8 rounded glass text-white/40 hover:text-white/80 transition-colors text-sm">‹</button>
        <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {conversations.length === 0 && (
            <div className="font-mono text-[10px] text-white/20 px-2 self-center">No chats — create one</div>
          )}
          {conversations.map(conv => (
            <ChatTab key={conv.id} conv={conv} isActive={conv.id === activeId}
              onSelect={() => setActiveId(conv.id)}
              onRename={renameChat} onDelete={deleteChat} />
          ))}
        </div>
        <button onClick={() => navChat(1)} className="flex-shrink-0 w-7 h-8 rounded glass text-white/40 hover:text-white/80 transition-colors text-sm">›</button>
      </div>

      {/* Messages */}
      <div className="flex-1 glass rounded-2xl p-4 overflow-y-auto space-y-4 min-h-0">
        {!activeId && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/20" style={{ animation: 'ring-spin 8s linear infinite' }} />
              <div className="absolute inset-2 rounded-full border border-purple-500/20" style={{ animation: 'ring-spin-reverse 12s linear infinite' }} />
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>
                <span className="font-display text-xs text-cyan-400">VN</span>
              </div>
            </div>
            <div>
              <div className="font-display text-sm text-white/70 tracking-widest">VISIONARY NEXUS</div>
              <div className="font-mono text-xs text-white/30 mt-1">Press + NEW to start a conversation</div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 animate-slide-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-display text-[10px]"
              style={msg.role === 'assistant' ? {
                background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff',
              } : {
                background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7',
              }}>
              {msg.role === 'assistant' ? 'VN' : 'U'}
            </div>
            <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className="px-4 py-3 rounded-2xl"
                style={msg.role === 'assistant' ? {
                  background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', borderTopLeftRadius: 4,
                } : {
                  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.18)', borderTopRightRadius: 4,
                }}>
                {msg.role === 'assistant' ? <MarkdownText text={msg.content} /> : <p className="text-sm text-white/85">{msg.content}</p>}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="font-mono text-[9px] text-white/20">
                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                {msg.role === 'assistant' && (
                  <>
                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="font-mono text-[9px] text-white/20 hover:text-cyan-400 transition-colors">copy</button>
                    <button onClick={() => { const last = [...messages].reverse().find(m => m.role === 'user'); sendMessage(last?.content ?? '') }}
                      className="font-mono text-[9px] text-white/20 hover:text-purple-400 transition-colors">regen</button>
                    {voiceOutputOn && (
                      <button onClick={() => speak(msg.content)}
                        className="font-mono text-[9px] text-white/20 hover:text-blue-400 transition-colors">speak</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-display text-[10px]"
              style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}>
              VN
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-cyan-400"
                  style={{ animation: 'glow-pulse 1s ease-in-out infinite', animationDelay: `${i * 0.25}s` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 rounded-xl font-mono text-xs text-red-400 flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 flex-shrink-0 glass rounded-2xl p-2">
        {/* Mic button */}
        <button
          onClick={() => isListening ? stopListening() : startListening(true)}
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300"
          style={{
            background: isListening ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isListening ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isListening ? '0 0 16px rgba(168,85,247,0.3)' : 'none',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={isListening ? '#a855f7' : '#ffffff50'} strokeWidth="1.5" className="w-5 h-5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
          </svg>
        </button>

        {isListening && <MiniWaveform active={true} />}

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder={activeId ? 'Message Visionary Nexus… (Enter to send, Shift+Enter for newline)' : 'Create a new chat to start…'}
          disabled={!activeId}
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm text-white/80 placeholder-white/20 font-mono resize-none leading-relaxed"
          style={{ maxHeight: 120, overflowY: 'auto' }}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading || !activeId}
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300"
          style={{
            background: input.trim() && activeId ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${input.trim() && activeId ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: input.trim() && activeId ? '0 0 16px rgba(0,229,255,0.2)' : 'none',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={input.trim() && activeId ? '#00e5ff' : '#ffffff25'} strokeWidth="1.5" className="w-5 h-5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
