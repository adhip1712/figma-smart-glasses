import { useState, useRef, useCallback, useEffect } from 'react'
import { stripWakeWord } from './useCommandRouter'

export type VoiceState = 'idle' | 'wake_word' | 'listening' | 'processing'

interface Rec {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface UseVoiceOptions {
  wakeWord?: string
  onCommand: (text: string) => void
  enabled?: boolean
}

export function useVoice({ wakeWord = 'Hey Vision', onCommand, enabled = true }: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Rec | null>(null)
  const isListeningRef = useRef(false)
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestTranscriptRef = useRef('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAPI = (): (new () => Rec) | undefined => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  const startListening = useCallback((commandMode = false) => {
    const API = getAPI()
    if (!API) { setError('Speech recognition not supported in this browser'); return }
    if (isListeningRef.current) return

    if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
    latestTranscriptRef.current = ''
    const rec = new API() as Rec
    rec.continuous = !commandMode
    rec.interimResults = true
    rec.lang = 'en-US'
    recognitionRef.current = rec
    isListeningRef.current = true

    setState(commandMode ? 'listening' : 'wake_word')

    rec.onresult = (rawEvent: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = rawEvent as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text: string = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').toLowerCase()
      setTranscript(text)

      const wkLower = wakeWord.toLowerCase()
      const lastFinal = e.results[e.results.length - 1]?.isFinal

      if (!commandMode) {
        if (text.includes(wkLower) || text.includes('hey vision') || text.includes('nexus') || text.includes('visionary')) {
          setState('listening')
          const after = stripWakeWord(text)
          if (after.length > 3 && lastFinal) {
            setState('processing')
            onCommand(after)
            isListeningRef.current = false
            rec.stop()
          }
        }
      } else {
        // Wait for a short silence instead of submitting on the first final chunk;
        // speech recognition may deliver the rest of a long sentence in later events.
        latestTranscriptRef.current = text.trim()
        if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
        if (text.trim()) {
          commandTimerRef.current = setTimeout(() => {
            const completeText = latestTranscriptRef.current.trim()
            if (!completeText || !isListeningRef.current) return
            setState('processing')
            isListeningRef.current = false
            onCommand(stripWakeWord(completeText))
            rec.stop()
          }, 1200)
        }
      }
    }

    rec.onerror = (rawEvent: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = rawEvent as any
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(String(e.error))
      isListeningRef.current = false
      setState('idle')
    }

    rec.onend = () => {
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
      commandTimerRef.current = null
      const completeText = latestTranscriptRef.current.trim()
      const endedUnexpectedly = isListeningRef.current
      isListeningRef.current = false
      if (commandMode && endedUnexpectedly && completeText) {
        setState('processing')
        onCommand(stripWakeWord(completeText))
      } else {
        setState(prev => prev === 'processing' ? 'processing' : 'idle')
      }
      latestTranscriptRef.current = ''
      setTranscript('')
    }

    try { rec.start() } catch { isListeningRef.current = false }
  }, [wakeWord, onCommand])

  const stopListening = useCallback(() => {
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
    commandTimerRef.current = null
    const completeText = latestTranscriptRef.current.trim()
    const shouldSend = isListeningRef.current && Boolean(completeText)
    isListeningRef.current = false
    recognitionRef.current?.stop()
    if (shouldSend) {
      setState('processing')
      onCommand(stripWakeWord(completeText))
    } else {
      setState('idle')
    }
    latestTranscriptRef.current = ''
    setTranscript('')
  }, [onCommand])

  useEffect(() => { void enabled }, [enabled])

  return { state, transcript, error, startListening, stopListening }
}

export function useSpeechOutput() {
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const stripped = text.replace(/```[\s\S]*?```/g, 'code block').replace(/[*#`]/g, '').slice(0, 500)
    const u = new SpeechSynthesisUtterance(stripped)
    u.rate = 1.05
    u.pitch = 0.9
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => { window.speechSynthesis?.cancel() }, [])

  return { speak, stop }
}
