import type { SrtCue } from './srtParser'

export function findActiveCueIndex(cues: readonly SrtCue[], time: number): number {
  if (cues.length === 0 || !Number.isFinite(time)) {
    return -1
  }

  let low = 0
  let high = cues.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const cue = cues[mid]

    if (time < cue.start) {
      high = mid - 1
    } else if (time > cue.end) {
      low = mid + 1
    } else {
      return mid
    }
  }

  return -1
}
