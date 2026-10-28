export type CommandType =
  | 'NEW_CHAT' | 'DELETE_CHAT' | 'RENAME_CHAT' | 'NEXT_CHAT' | 'PREVIOUS_CHAT' | 'SWITCH_CHAT'
  | 'PLAY_MUSIC' | 'PAUSE_MUSIC' | 'RESUME_MUSIC' | 'NEXT_TRACK' | 'PREVIOUS_TRACK' | 'STOP_MUSIC'
  | 'WEATHER' | 'NAVIGATION' | 'CAMERA' | 'DEVICE_STATUS' | 'SETTINGS' | 'GENERAL_AI'
  | 'TAB_SWITCH'

export interface ParsedCommand {
  type: CommandType
  payload?: string
  raw: string
}

export function stripWakeWord(text: string, wakeWord = 'Vision'): string {
  const normalizedText = text.trim().split(' ').filter(Boolean).join(' ')
  const phrase = wakeWord.trim().split(' ').filter(Boolean).join(' ')
  if (!phrase) return normalizedText
  const lowerText = normalizedText.toLowerCase()
  const lowerPhrase = phrase.toLowerCase()
  if (lowerText.startsWith(`${lowerPhrase} `) || lowerText === lowerPhrase) return normalizedText.slice(phrase.length).trim()
  const heyPhrase = `hey ${lowerPhrase}`
  if (lowerText.startsWith(`${heyPhrase} `) || lowerText === heyPhrase) return normalizedText.slice(heyPhrase.length).trim()
  return normalizedText
}

export function parseCommand(raw: string): ParsedCommand {
  const t = raw.toLowerCase().trim()

  // Chat management
  if (/^new (chat|conversation|tab)$/.test(t)) return { type: 'NEW_CHAT', raw }
  if (/^(delete|close|remove) (chat|tab|conversation)$/.test(t)) return { type: 'DELETE_CHAT', raw }
  if (/^next (chat|tab|conversation)$/.test(t)) return { type: 'NEXT_CHAT', raw }
  if (/^(previous|prev|back) (chat|tab|conversation)$/.test(t)) return { type: 'PREVIOUS_CHAT', raw }

  const switchNum = t.match(/^(switch to |go to |open )?(chat|tab|conversation) ?(\d+)$/)
  if (switchNum) return { type: 'SWITCH_CHAT', payload: switchNum[3], raw }

  const switchTitle = t.match(/^switch to (.+)$/)
  if (switchTitle) return { type: 'SWITCH_CHAT', payload: switchTitle[1], raw }

  // Tab navigation
  if (/\b(dashboard|home)\b/.test(t)) return { type: 'TAB_SWITCH', payload: 'dashboard', raw }
  if (/\b(ai assistant|assistant|chat)\b/.test(t)) return { type: 'TAB_SWITCH', payload: 'ai', raw }
  if (/\b(vision|camera view)\b/.test(t)) return { type: 'TAB_SWITCH', payload: 'vision', raw }
  if (/\b(audio|microphone|mic)\b/.test(t) && !t.includes('music')) return { type: 'TAB_SWITCH', payload: 'audio', raw }
  if (/\b(device|hardware)\b/.test(t)) return { type: 'DEVICE_STATUS', raw }
  if (/\b(settings|preferences|config)\b/.test(t)) return { type: 'SETTINGS', raw }

  // Music
  if (/^(pause|stop playing)/.test(t)) return { type: 'PAUSE_MUSIC', raw }
  if (/^(resume|continue|unpause)/.test(t)) return { type: 'RESUME_MUSIC', raw }
  if (/^(next|next track|next song)$/.test(t)) return { type: 'NEXT_TRACK', raw }
  if (/^(previous|prev|last) (track|song)$/.test(t)) return { type: 'PREVIOUS_TRACK', raw }
  if (/^stop( music| playing)?$/.test(t)) return { type: 'STOP_MUSIC', raw }

  const playMatch = t.match(/^play (.+)$/)
  if (playMatch) return { type: 'PLAY_MUSIC', payload: playMatch[1], raw }
  if (/\bmusic\b/.test(t)) return { type: 'TAB_SWITCH', payload: 'music', raw }

  // Weather
  const weatherMatch = t.match(/(?:weather|temperature|forecast|weather in|temp in)\s*(.*)/)
  if (weatherMatch) return { type: 'WEATHER', payload: weatherMatch[1].trim() || 'current location', raw }

  // Navigation
  const navMatch = t.match(/(?:navigate|directions|how do i get|take me|go) (?:to )(.+)/)
  if (navMatch) return { type: 'NAVIGATION', payload: navMatch[1].trim(), raw }
  if (/\bnavigat/.test(t) || /\bdirection/.test(t)) return { type: 'NAVIGATION', raw }

  // Camera
  if (/\bcamera\b/.test(t) || /\bscan\b/.test(t) || /\btake (a |photo|picture|photo)/.test(t)) return { type: 'CAMERA', raw }

  return { type: 'GENERAL_AI', raw }
}
