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
  sensitivity?: string
  onCommand: (text: string) => void
  enabled?: boolean
}

const normalizeSpeech = (value: string) => value.toLowerCase().replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim()

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    edits++
    if (edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  if (i < a.length || j < b.length) edits++
  return edits <= 1
}

function locateWakePhrase(transcript: string, wakeWord: string, sensitivity: string): number {
  const text = normalizeSpeech(transcript)
  const phrase = normalizeSpeech(wakeWord || 'Vision')
  if (!phrase) return -1
  // Require whole-word phrase boundaries; don't trigger on substrings like "vision" in "television".
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const exact = new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`).exec(text)
  if (exact) return exact.index + (exact[0].startsWith(' ') ? 1 : 0)
  if (sensitivity !== 'high') return -1

  const words = text.split(' ')
  const target = phrase.split(' ')
  for (let i = 0; i <= words.length - target.length; i++) {
    const candidate = words.slice(i, i + target.length)
    const matches = candidate.every((word, index) =>
      word === target[index] || (target[index].length >= 5 && editDistanceAtMostOne(word, target[index])),
    )
    if (matches) return words.slice(0, i).join(' ').length + (i ? 1 : 0)
  }
  return -1
}

function commandAfterWake(transcript: string, wakeWord: string, sensitivity: string): string {
  const normalized = normalizeSpeech(transcript)
  const at = locateWakePhrase(normalized, wakeWord, sensitivity)
  if (at < 0) return ''
  const phraseLength = normalizeSpeech(wakeWord).length
  // For fuzzy matches the recognized word can differ slightly in length, so
  // use the configured phrase length only for exact matches and a word boundary otherwise.
  const exactAt = normalized.indexOf(normalizeSpeech(wakeWord), at)
  if (exactAt >= 0 && exactAt === at) return normalized.slice(at + phraseLength).trim()
  const tokens = normalized.slice(at).split(' ')
  return tokens.slice(normalizeSpeech(wakeWord).split(' ').length).join(' ').trim()
}

export function useVoice({ wakeWord = 'Vision', sensitivity = 'high', onCommand, enabled = true }: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Rec | null>(null)
  const isListeningRef = useRef(false)
  const wakeModeActiveRef = useRef(false)
  const wakeTriggeredRef = useRef(false)
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestTranscriptRef = useRef('')
  const restartWakeRef = useRef<(() => void) | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAPI = (): (new () => Rec) | undefined => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  const startListening = useCallback((commandMode = false) => {
    const API = getAPI()
    if (!API) { setError('Speech recognition not supported in this browser'); return }
    if (!enabled) { setError('Enable voice input in Settings first'); return }
    if (isListeningRef.current) return

    if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    latestTranscriptRef.current = ''
    wakeTriggeredRef.current = false
    if (!commandMode) wakeModeActiveRef.current = true

    const rec = new API() as Rec
    rec.continuous = !commandMode
    rec.interimResults = true
    rec.lang = 'en-IN'
    recognitionRef.current = rec
    isListeningRef.current = true
    setError(null)
    setState(commandMode ? 'listening' : 'wake_word')

    rec.onresult = (rawEvent: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = rawEvent as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text: string = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').trim()
      const lastFinal = e.results[e.results.length - 1]?.isFinal
      setTranscript(text)

      if (!commandMode) {
        const wakeAt = locateWakePhrase(text, wakeWord, sensitivity)
        if (wakeAt >= 0) {
          wakeTriggeredRef.current = true
          setState('listening')
          const after = commandAfterWake(text, wakeWord, sensitivity)
          if (after.length > 1 && lastFinal) {
            setState('processing')
            isListeningRef.current = false
            wakeTriggeredRef.current = false
            onCommand(after)
            rec.stop()
          }
        } else if (wakeTriggeredRef.current) {
          const after = latestTranscriptRef.current
          if (after.length > 1 && lastFinal) {
            setState('processing')
            isListeningRef.current = false
            wakeTriggeredRef.current = false
            onCommand(after)
            rec.stop()
          }
        }
      } else {
        latestTranscriptRef.current = text.trim()
        if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
        if (text.trim()) {
          commandTimerRef.current = setTimeout(() => {
            const completeText = latestTranscriptRef.current.trim()
            if (!completeText || !isListeningRef.current) return
            setState('processing')
            isListeningRef.current = false
            onCommand(stripWakeWord(completeText, wakeWord))
            rec.stop()
          }, 1200)
        }
      }

      if (!commandMode && wakeTriggeredRef.current) {
        latestTranscriptRef.current = commandAfterWake(text, wakeWord, sensitivity)
      }
    }

    rec.onerror = (rawEvent: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = rawEvent as any
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(String(e.error))
      isListeningRef.current = false
      // onend owns wake-listener restarts; restarting here as well can create two recognizers.
      if (!wakeModeActiveRef.current || !enabled) setState('idle')
    }

    rec.onend = () => {
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
      commandTimerRef.current = null
      const completeText = latestTranscriptRef.current.trim()
      const wasListening = isListeningRef.current
      isListeningRef.current = false
      if (commandMode && wasListening && completeText) {
        setState('processing')
        onCommand(stripWakeWord(completeText, wakeWord))
      } else if (!commandMode && wakeModeActiveRef.current && enabled) {
        setState('wake_word')
        restartTimerRef.current = setTimeout(() => restartWakeRef.current?.(), 450)
      } else {
        setState(prev => prev === 'processing' ? 'processing' : 'idle')
      }
      latestTranscriptRef.current = ''
      setTranscript('')
    }

    try { rec.start() } catch {
      isListeningRef.current = false
      setState('idle')
      if (!commandMode) wakeModeActiveRef.current = false
    }
  }, [wakeWord, sensitivity, onCommand, enabled])

  restartWakeRef.current = () => startListening(false)

  const stopListening = useCallback(() => {
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current)
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    commandTimerRef.current = null
    restartTimerRef.current = null
    const completeText = latestTranscriptRef.current.trim()
    const shouldSend = isListeningRef.current && Boolean(completeText)
    const wasWakeMode = wakeModeActiveRef.current
    wakeModeActiveRef.current = false
    isListeningRef.current = false
    recognitionRef.current?.stop()
    if (!wasWakeMode && shouldSend) {
      setState('processing')
      onCommand(stripWakeWord(completeText, wakeWord))
    } else {
      setState('idle')
    }
    latestTranscriptRef.current = ''
    wakeTriggeredRef.current = false
    setTranscript('')
  }, [onCommand, wakeWord])

  useEffect(() => {
    if (!enabled && wakeModeActiveRef.current) stopListening()
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    }
  }, [enabled, stopListening])

  return { state, transcript, error, startListening, stopListening }
}

export function useSpeechOutput() {
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const stripped = text.replace(/\`\`\`[\s\S]*?\`\`\`/g, 'code block').replace(/[*#`]/g, '').slice(0, 500)
    const u = new SpeechSynthesisUtterance(stripped)
    u.rate = 1.05
    u.pitch = 0.9
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => { window.speechSynthesis?.cancel() }, [])

  return { speak, stop }
}
