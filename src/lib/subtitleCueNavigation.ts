import type { SrtCue } from './srtParser'
import { findActiveCueIndex } from './subtitleRuntime'
import type { MaskTrackItem } from '../types/track'
import { setCurrentTimeDebug } from './debugState'

export function getPreviousCueIndex(cues: readonly SrtCue[], time: number): number {
  const active = findActiveCueIndex(cues, time)
  if (cues.length === 0) {
    return -1
  }
  if (active > 0) {
    return active - 1
  }
  if (active === 0) {
    return 0
  }
  for (let i = cues.length - 1; i >= 0; i -= 1) {
    if (cues[i].start < time - 0.001) {
      return i
    }
  }
  return 0
}

export function getNextCueIndex(cues: readonly SrtCue[], time: number): number {
  const active = findActiveCueIndex(cues, time)
  if (cues.length === 0) {
    return -1
  }
  if (active >= 0 && active < cues.length - 1) {
    return active + 1
  }
  if (active === cues.length - 1) {
    return active
  }
  for (let i = 0; i < cues.length; i += 1) {
    if (cues[i].start > time + 0.001) {
      return i
    }
  }
  return cues.length - 1
}

export function findActiveSubtitleMaskId(
  masks: readonly MaskTrackItem[],
  cues: readonly SrtCue[],
  time: number
): string | null {
  const cueIndex = findActiveCueIndex(cues, time)
  if (cueIndex < 0) {
    return null
  }

  const srtMasks = masks.filter((mask) => mask.source?.kind === 'srt')
  if (cueIndex >= srtMasks.length) {
    return null
  }

  return srtMasks[cueIndex]?.id ?? null
}

export function seekVideoToCue(
  video: HTMLVideoElement,
  cues: readonly SrtCue[],
  index: number
): void {
  if (index < 0 || index >= cues.length) {
    return
  }
  setCurrentTimeDebug(video, 'other', cues[index].start)
}

export function seekToActiveCueStart(
  video: HTMLVideoElement,
  cues: readonly SrtCue[],
  time: number
): boolean {
  const index = findActiveCueIndex(cues, time)
  if (index < 0) {
    return false
  }
  seekVideoToCue(video, cues, index)
  return true
}

export function repeatCurrentCue(
  video: HTMLVideoElement,
  cues: readonly SrtCue[],
  time: number
): boolean {
  const index = findActiveCueIndex(cues, time)
  if (index < 0) {
    return false
  }
  setCurrentTimeDebug(video, 'replay', cues[index].start)
  void video.play()
  return true
}
