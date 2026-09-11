import type { SrtCue } from './srtParser'
import { findActiveCueIndex } from './subtitleRuntime'
import { setCurrentTimeDebug } from './debugState'

export const QUICK_REPLAY_SECONDS = 2.5

export const PLAYBACK_SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export type PlaybackSpeedPreset = (typeof PLAYBACK_SPEED_PRESETS)[number]

export function quickReplay(video: HTMLVideoElement): void {
  setCurrentTimeDebug(video, 'replay', Math.max(0, video.currentTime - QUICK_REPLAY_SECONDS))
  void video.play()
}

export function smartReplay(video: HTMLVideoElement, cues: readonly SrtCue[]): void {
  const index = findActiveCueIndex(cues, video.currentTime)
  if (index >= 0 && index < cues.length) {
    setCurrentTimeDebug(video, 'replay', cues[index].start)
  } else {
    setCurrentTimeDebug(video, 'replay', Math.max(0, video.currentTime - QUICK_REPLAY_SECONDS))
  }
  void video.play()
}

export function stepPlaybackSpeed(current: number, direction: -1 | 1): number {
  const presets = PLAYBACK_SPEED_PRESETS
  const index = presets.findIndex((rate) => Math.abs(rate - current) < 0.001)
  const startIndex = index >= 0 ? index : presets.findIndex((rate) => rate >= current) || 0
  const nextIndex = Math.min(presets.length - 1, Math.max(0, startIndex + direction))
  return presets[nextIndex]
}
