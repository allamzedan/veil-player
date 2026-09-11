export type PlaybackHudKind = 'neutral' | 'accent'

export interface PlaybackHudState {
  message: string
  kind: PlaybackHudKind
  visible: boolean
  /** When true, skip fade-in (same message refresh). */
  extendOnly: boolean
}

type Listener = (state: PlaybackHudState | null) => void

const HIDE_MS = 1200
const COOLDOWN_MS = 120

let listeners: Listener[] = []
let hideTimer: ReturnType<typeof setTimeout> | null = null
let cooldownUntil = 0
let lastMessage = ''
let currentState: PlaybackHudState | null = null
let pending: { message: string; kind: PlaybackHudKind } | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function notify(): void {
  for (const listener of listeners) {
    listener(currentState)
  }
}

function clearHideTimer(): void {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function scheduleHide(): void {
  clearHideTimer()
  hideTimer = setTimeout(() => {
    currentState = null
    hideTimer = null
    notify()
  }, HIDE_MS)
}

function showNow(message: string, kind: PlaybackHudKind, extendOnly: boolean): void {
  lastMessage = message
  currentState = { message, kind, visible: true, extendOnly }
  notify()
  scheduleHide()
}

export function subscribePlaybackHud(listener: Listener): () => void {
  listeners.push(listener)
  listener(currentState)
  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
  }
}

export function showPlaybackHud(message: string, kind: PlaybackHudKind = 'neutral'): void {
  const now = Date.now()

  if (currentState?.visible && message === lastMessage) {
    currentState = { ...currentState, extendOnly: true }
    notify()
    scheduleHide()
    return
  }

  if (now < cooldownUntil) {
    pending = { message, kind }
    if (pendingTimer === null) {
      pendingTimer = setTimeout(() => {
        pendingTimer = null
        const next = pending
        pending = null
        if (next) {
          showPlaybackHud(next.message, next.kind)
        }
      }, cooldownUntil - now)
    }
    return
  }

  cooldownUntil = now + COOLDOWN_MS
  const extendOnly = false
  showNow(message, kind, extendOnly)
}

export function dismissPlaybackHud(): void {
  clearHideTimer()
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
  pending = null
  cooldownUntil = 0
  lastMessage = ''
  currentState = null
  notify()
}
