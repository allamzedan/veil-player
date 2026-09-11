import { BOOKMARK_TOAST_DURATION_MS } from './bookmarkToast'
import { DEFAULT_MASK_DURATION_SECONDS, MIN_MASK_DURATION_SECONDS } from './maskTiming'

const STORAGE_KEY = 'veil:playbackActivityPreferences:v1'
export const MAX_DEFAULT_LAYER_DURATION_SECONDS = 3600
export const MIN_BOOKMARK_ACTIVITY_DURATION_MS = 1000
export const MAX_BOOKMARK_ACTIVITY_DURATION_MS = 30000

export interface PlaybackActivityPreferences {
  showFullscreenVeilRail: boolean
  defaultMaskDurationSeconds: number
  defaultMuteDurationSeconds: number
  defaultSkipDurationSeconds: number
  bookmarkActivityDurationMs: number
}

export const DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES: PlaybackActivityPreferences = {
  showFullscreenVeilRail: true,
  defaultMaskDurationSeconds: DEFAULT_MASK_DURATION_SECONDS,
  defaultMuteDurationSeconds: DEFAULT_MASK_DURATION_SECONDS,
  defaultSkipDurationSeconds: DEFAULT_MASK_DURATION_SECONDS,
  bookmarkActivityDurationMs: BOOKMARK_TOAST_DURATION_MS
}

const listeners = new Set<() => void>()

function clamp(value: number, minimum: number, maximum: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizePlaybackActivityPreferences(
  value: Partial<PlaybackActivityPreferences> | null | undefined
): PlaybackActivityPreferences {
  return {
    showFullscreenVeilRail:
      typeof value?.showFullscreenVeilRail === 'boolean'
        ? value.showFullscreenVeilRail
        : DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.showFullscreenVeilRail,
    defaultMaskDurationSeconds: clamp(
      Number(value?.defaultMaskDurationSeconds),
      MIN_MASK_DURATION_SECONDS,
      MAX_DEFAULT_LAYER_DURATION_SECONDS,
      DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.defaultMaskDurationSeconds
    ),
    defaultMuteDurationSeconds: clamp(
      Number(value?.defaultMuteDurationSeconds),
      MIN_MASK_DURATION_SECONDS,
      MAX_DEFAULT_LAYER_DURATION_SECONDS,
      DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.defaultMuteDurationSeconds
    ),
    defaultSkipDurationSeconds: clamp(
      Number(value?.defaultSkipDurationSeconds),
      MIN_MASK_DURATION_SECONDS,
      MAX_DEFAULT_LAYER_DURATION_SECONDS,
      DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.defaultSkipDurationSeconds
    ),
    bookmarkActivityDurationMs: clamp(
      Number(value?.bookmarkActivityDurationMs),
      MIN_BOOKMARK_ACTIVITY_DURATION_MS,
      MAX_BOOKMARK_ACTIVITY_DURATION_MS,
      DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.bookmarkActivityDurationMs
    )
  }
}

export function readPlaybackActivityPreferences(): PlaybackActivityPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES }
    return normalizePlaybackActivityPreferences(JSON.parse(raw) as Partial<PlaybackActivityPreferences>)
  } catch {
    return { ...DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES }
  }
}

export function writePlaybackActivityPreferences(
  value: PlaybackActivityPreferences
): PlaybackActivityPreferences {
  const normalized = normalizePlaybackActivityPreferences(value)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Preferences remain usable for this interaction even when persistence is unavailable.
  }
  listeners.forEach((listener) => listener())
  return normalized
}

export function patchPlaybackActivityPreferences(
  patch: Partial<PlaybackActivityPreferences>
): PlaybackActivityPreferences {
  return writePlaybackActivityPreferences({ ...readPlaybackActivityPreferences(), ...patch })
}

export function subscribePlaybackActivityPreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetPlaybackActivityPreferencesForTests(): void {
  listeners.clear()
}
