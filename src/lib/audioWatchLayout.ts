/** Compact Audio Watch Mode window targets (presentation only). */

export const AUDIO_WATCH_WINDOW = {
  width: 780,
  height: 420,
  minWidth: 720,
  minHeight: 390
} as const

export const AUDIO_WATCH_ACCEPTABLE = {
  minWidth: 740,
  maxWidth: 800,
  minHeight: 390,
  maxHeight: 430
} as const

export const VIDEO_DEFAULT_WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 600
} as const

export type WindowLayoutPreset = 'audio-watch' | 'video-default'

export interface WindowBoundsLike {
  width: number
  height: number
}

export function isWithinAudioWatchAcceptable(bounds: WindowBoundsLike): boolean {
  return (
    bounds.width >= AUDIO_WATCH_ACCEPTABLE.minWidth &&
    bounds.width <= AUDIO_WATCH_ACCEPTABLE.maxWidth &&
    bounds.height >= AUDIO_WATCH_ACCEPTABLE.minHeight &&
    bounds.height <= AUDIO_WATCH_ACCEPTABLE.maxHeight
  )
}

export function isNearVideoDefault(bounds: WindowBoundsLike, tolerance = 48): boolean {
  return (
    Math.abs(bounds.width - VIDEO_DEFAULT_WINDOW.width) <= tolerance &&
    Math.abs(bounds.height - VIDEO_DEFAULT_WINDOW.height) <= tolerance
  )
}

/**
 * Decide whether to force the compact audio size.
 * Skip when the window already sits in the acceptable audio range
 * (treat as a user-chosen compact size) unless it still looks like video default.
 */
export function shouldApplyAudioWatchSize(bounds: WindowBoundsLike): boolean {
  if (isNearVideoDefault(bounds)) {
    return true
  }
  return !isWithinAudioWatchAcceptable(bounds)
}
