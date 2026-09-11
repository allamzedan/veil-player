/**
 * Preserves playhead / pause state across compact Audio Watch ↔ full edit layout remounts.
 * The presentation swaps HTMLMediaElement instances; this bridge restores currentTime after mount.
 */

export interface PreservedAudioPlayback {
  time: number
  wasPlaying: boolean
  playbackRate: number
  mediaSrc: string | null
}

let pending: PreservedAudioPlayback | null = null

export function captureAudioPlaybackTransition(input: {
  currentTime: number
  paused: boolean
  playbackRate: number
  mediaSrc: string | null
}): void {
  if (!Number.isFinite(input.currentTime)) {
    return
  }
  pending = {
    time: Math.max(0, input.currentTime),
    wasPlaying: !input.paused,
    playbackRate: Number.isFinite(input.playbackRate) ? input.playbackRate : 1,
    mediaSrc: input.mediaSrc
  }
}

export function captureAudioPlaybackTransitionFromVideo(
  video: HTMLVideoElement | null,
  mediaSrc: string | null,
  fallbackTime = 0
): void {
  if (video && Number.isFinite(video.currentTime)) {
    captureAudioPlaybackTransition({
      currentTime: video.currentTime,
      paused: video.paused,
      playbackRate: video.playbackRate,
      mediaSrc
    })
    return
  }
  if (Number.isFinite(fallbackTime) && fallbackTime > 0) {
    captureAudioPlaybackTransition({
      currentTime: fallbackTime,
      paused: true,
      playbackRate: 1,
      mediaSrc
    })
  }
}

export function peekAudioPlaybackTransition(): PreservedAudioPlayback | null {
  return pending
}

export function readAudioPlaybackTransition(
  mediaSrc: string | null
): PreservedAudioPlayback | null {
  if (!pending) {
    return null
  }
  if (pending.mediaSrc && mediaSrc && pending.mediaSrc !== mediaSrc) {
    pending = null
    return null
  }
  return pending
}

export function takeAudioPlaybackTransition(
  mediaSrc: string | null
): PreservedAudioPlayback | null {
  const value = readAudioPlaybackTransition(mediaSrc)
  pending = null
  return value
}

export function clearAudioPlaybackTransition(): void {
  pending = null
}

/** Heuristic: same media remounted at 0 while UI still held a later playhead. */
export function shouldRestorePlayheadAfterRemount(args: {
  mediaSrcChanged: boolean
  elementTime: number
  preservedTime: number
  epsilon?: number
}): boolean {
  if (args.mediaSrcChanged) {
    return false
  }
  const epsilon = args.epsilon ?? 0.05
  return args.preservedTime > epsilon && args.elementTime < epsilon
}

export function clampPlaybackRestoreTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || time < 0) {
    return 0
  }
  if (Number.isFinite(duration) && duration > 0) {
    return Math.min(time, Math.max(0, duration - 0.05))
  }
  return time
}
