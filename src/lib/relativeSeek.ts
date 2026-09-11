export const AUDIO_SEEK_STEP_SECONDS = 10

export function resolveRelativeSeekTime(args: {
  currentTime: number
  duration: number
  offsetSeconds: number
}): number {
  const currentTime = Number.isFinite(args.currentTime) ? args.currentTime : 0
  const duration = Number.isFinite(args.duration) && args.duration > 0 ? args.duration : 0
  const offsetSeconds = Number.isFinite(args.offsetSeconds) ? args.offsetSeconds : 0
  return Math.min(duration, Math.max(0, currentTime + offsetSeconds))
}

/**
 * Applies a relative seek without touching play/pause state. The callback is used by
 * the player so its normal seek path updates display time and resets skip latches.
 */
export function seekRelative(args: {
  currentTime: number
  duration: number
  offsetSeconds: number
  seek: (time: number) => void
}): number {
  const target = resolveRelativeSeekTime(args)
  args.seek(target)
  return target
}
