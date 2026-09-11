export type ShortcutActionId =
  | 'playPause'
  | 'addMask'
  | 'addMute'
  | 'addSkip'
  | 'addBookmark'
  | 'addAnchor'
  | 'undo'
  | 'redo'
  | 'quickReplay'
  | 'smartReplay'
  | 'speedDown'
  | 'speedUp'
  | 'toggleFullscreen'
  | 'openHelp'
  | 'deleteSelected'
  | 'momentaryReveal'
  | 'prevSubtitleCue'
  | 'nextSubtitleCue'
  | 'repeatSubtitleCue'
  | 'toggleLoop'
  | 'setLoopStart'
  | 'setLoopEnd'
  | 'toggleItemLocked'

export const DEFAULT_SHORTCUT_BINDINGS: Record<ShortcutActionId, string> = {
  playPause: ' ',
  addMask: 'm',
  addMute: 'u',
  addSkip: 'k',
  addBookmark: 'b',
  addAnchor: 'a',
  undo: 'ctrl+z',
  redo: 'ctrl+y',
  quickReplay: 'shift+r',
  smartReplay: 'r',
  speedDown: '[',
  speedUp: ']',
  toggleFullscreen: 'f',
  openHelp: '?',
  deleteSelected: 'Delete',
  momentaryReveal: 'v',
  prevSubtitleCue: 'alt+arrowleft',
  nextSubtitleCue: 'alt+arrowright',
  repeatSubtitleCue: 'alt+r',
  toggleLoop: 'l',
  setLoopStart: ';',
  setLoopEnd: "'",
  toggleItemLocked: 'ctrl+shift+l'
}

const CURATED_ACTIONS = new Set<ShortcutActionId>(Object.keys(DEFAULT_SHORTCUT_BINDINGS) as ShortcutActionId[])

const STORAGE_KEY = 'veil:shortcutOverrides'

function normalizeBinding(binding: string): string {
  return binding.trim().toLowerCase()
}

function readOverrides(): Partial<Record<ShortcutActionId, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const overrides: Partial<Record<ShortcutActionId, string>> = {}
    for (const actionId of CURATED_ACTIONS) {
      const value = (parsed as Record<string, unknown>)[actionId]
      if (typeof value === 'string' && normalizeBinding(value).length > 0) {
        overrides[actionId] = normalizeBinding(value)
      }
    }
    return overrides
  } catch {
    return {}
  }
}

export function getBinding(actionId: ShortcutActionId): string {
  const overrides = readOverrides()
  const override = overrides[actionId]
  if (override) {
    return normalizeBinding(override)
  }
  return normalizeBinding(DEFAULT_SHORTCUT_BINDINGS[actionId])
}

export function setBindingOverride(actionId: ShortcutActionId, binding: string): void {
  if (!CURATED_ACTIONS.has(actionId)) {
    return
  }
  const overrides = readOverrides()
  overrides[actionId] = normalizeBinding(binding)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Keep defaults usable when preference persistence is unavailable.
  }
}

export function matchesBinding(event: KeyboardEvent, actionId: ShortcutActionId): boolean {
  const binding = getBinding(actionId)
  const parts = binding.split('+').map((part) => part.trim())
  const targetKey = parts[parts.length - 1]
  const needsCtrl = parts.includes('ctrl')
  const needsMeta = parts.includes('meta')
  const needsShift = parts.includes('shift')
  const needsAlt = parts.includes('alt')

  if (targetKey === ' ') {
    if (event.code !== 'Space' && event.key !== ' ') {
      return false
    }
  } else if (targetKey === 'delete') {
    if (event.key !== 'Delete' && event.code !== 'Delete') {
      return false
    }
  } else if (targetKey === 'arrowleft') {
    if (event.key !== 'ArrowLeft' && event.code !== 'ArrowLeft') {
      return false
    }
  } else if (targetKey === 'arrowright') {
    if (event.key !== 'ArrowRight' && event.code !== 'ArrowRight') {
      return false
    }
  } else {
    const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase()
    if (eventKey !== targetKey && event.code !== `Key${targetKey.toUpperCase()}`) {
      return false
    }
  }

  if (Boolean(event.ctrlKey) !== needsCtrl) {
    return false
  }
  if (Boolean(event.metaKey) !== needsMeta) {
    return false
  }
  if (Boolean(event.shiftKey) !== needsShift) {
    return false
  }
  if (Boolean(event.altKey) !== needsAlt) {
    return false
  }

  return true
}
