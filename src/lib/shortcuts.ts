export type ShortcutCategory = 'playback' | 'track' | 'timeline' | 'ui'

export interface ShortcutEntry {
  keys: string
  description: string
  category: ShortcutCategory
}

export const SHORTCUT_ENTRIES: ShortcutEntry[] = [
  { keys: 'Ctrl+Z', description: 'Undo', category: 'track' },
  { keys: 'Ctrl+Y / Ctrl+Shift+Z', description: 'Redo', category: 'track' },
  { keys: 'Space', description: 'Play / pause', category: 'playback' },
  { keys: '↑ / ↓', description: 'Raise / lower volume', category: 'playback' },
  { keys: 'Ctrl+Shift+M', description: 'Mute / unmute', category: 'playback' },
  { keys: 'F', description: 'Toggle fullscreen', category: 'playback' },
  { keys: 'Shift (hold)', description: 'Peek at covered subtitles / hide masks', category: 'playback' },
  { keys: 'V', description: 'Brief subtitle reveal (~1.5s)', category: 'playback' },
  { keys: 'R', description: 'Replay cue (or −2.5s if no cue)', category: 'playback' },
  { keys: 'Shift+R', description: 'Replay previous 2.5s', category: 'playback' },
  { keys: '[ / ]', description: 'Decrease / increase playback speed', category: 'playback' },
  { keys: 'Esc', description: 'Hide fullscreen controls, then exit fullscreen', category: 'playback' },
  { keys: 'M', description: 'Add mask at playhead', category: 'track' },
  { keys: 'U', description: 'Add mute at playhead', category: 'track' },
  { keys: 'K', description: 'Add skip at playhead', category: 'track' },
  { keys: 'A', description: 'Add timing anchor at playhead', category: 'track' },
  { keys: 'I', description: 'Set selected item start to playhead', category: 'track' },
  { keys: 'O', description: 'Set selected item end to playhead', category: 'track' },
  { keys: 'Ctrl+Shift+L', description: 'Lock / unlock selected item', category: 'track' },
  { keys: 'Delete', description: 'Delete selected item', category: 'track' },
  { keys: 'Wheel on timeline', description: 'Zoom timeline viewport', category: 'timeline' },
  {
    keys: 'Ctrl+Alt+← / Ctrl+Alt+→',
    description: 'Nudge selected interval ±0.1s (±1s with Shift)',
    category: 'timeline'
  },
  { keys: 'Click / drag timeline lane', description: 'Scrub playhead', category: 'timeline' },
  { keys: '?', description: 'Open keyboard shortcuts', category: 'ui' }
]

export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  playback: 'Playback',
  track: 'Track',
  timeline: 'Timeline',
  ui: 'Interface'
}

export const KEY_TOGGLE_FULLSCREEN = 'f'
export const KEY_TOGGLE_PLAYBACK = 'Space'
export const KEY_HELP = '?'
export const KEY_QUICK_REPLAY = 'r'
export const KEY_HOLD_REVEAL = 'Shift'
export const KEY_MOMENTARY_REVEAL = 'v'
export const KEY_SPEED_DOWN = '['
export const KEY_SPEED_UP = ']'

export function matchesUndoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  if (key !== 'z' || event.altKey) {
    return false
  }
  if (event.metaKey) {
    return !event.shiftKey
  }
  return event.ctrlKey && !event.shiftKey
}

export function matchesRedoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase()
  if (event.altKey) {
    return false
  }
  if (event.metaKey) {
    return key === 'z' && event.shiftKey
  }
  if (key === 'y' && event.ctrlKey) {
    return true
  }
  return key === 'z' && event.ctrlKey && event.shiftKey
}
