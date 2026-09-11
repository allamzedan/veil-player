export const YOUTUBE_SEEK_CONFIRM_TIMEOUT_MS = 2000
export const YOUTUBE_SEEK_CONFIRM_TOLERANCE_SECONDS = 1

export interface PendingPlaybackSeek {
  target: number
  requestedAt: number
}

export function normalizePlaybackTime(time: number, duration?: number | null): number | null {
  if (!Number.isFinite(time) || time < 0) {
    return null
  }
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return Math.min(time, duration)
  }
  return time
}

export function normalizePlaybackDuration(duration: number): number | null {
  return Number.isFinite(duration) && duration > 0 ? duration : null
}

export function resolveBookmarkTimestamp(
  currentTime: number,
  duration?: number | null
): number | null {
  return normalizePlaybackTime(currentTime, duration)
}

export function reconcileYouTubeSeekSample(args: {
  sampleTime: number
  duration?: number | null
  pendingSeek: PendingPlaybackSeek | null
  now: number
}): { time: number | null; pendingSeek: PendingPlaybackSeek | null } {
  const time = normalizePlaybackTime(args.sampleTime, args.duration)
  if (time === null || args.pendingSeek === null) {
    return { time, pendingSeek: args.pendingSeek }
  }

  if (Math.abs(time - args.pendingSeek.target) <= YOUTUBE_SEEK_CONFIRM_TOLERANCE_SECONDS) {
    return { time, pendingSeek: null }
  }

  if (args.now - args.pendingSeek.requestedAt < YOUTUBE_SEEK_CONFIRM_TIMEOUT_MS) {
    return { time: null, pendingSeek: args.pendingSeek }
  }

  return { time, pendingSeek: null }
}

export function playbackRatio(currentTime: number, duration: number): number | null {
  if (
    !Number.isFinite(currentTime) ||
    currentTime < 0 ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null
  }
  return Math.min(1, Math.max(0, currentTime / duration))
}
