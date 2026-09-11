import { createMaskId } from './id'
import type { TrackAnchor } from '../types/track'
import type { SrtCue } from './srtParser'

export const MAX_CUE_ANCHORS_ON_SAVE = 10

export function createManualAnchor(time: number, label?: string): TrackAnchor {
  return {
    id: createMaskId(),
    time,
    kind: 'manual',
    ...(label?.trim() ? { label: label.trim() } : {})
  }
}

export function captureCueAnchorsFromSubtitles(cues: SrtCue[]): TrackAnchor[] {
  if (cues.length === 0) {
    return []
  }

  const indices = new Set<number>()
  indices.add(0)
  indices.add(cues.length - 1)

  if (cues.length >= 4) {
    indices.add(Math.floor(cues.length * 0.25))
    indices.add(Math.floor(cues.length * 0.5))
    indices.add(Math.floor(cues.length * 0.75))
  } else {
    for (let index = 1; index < cues.length - 1; index += 1) {
      indices.add(index)
    }
  }

  const sortedIndices = [...indices].sort((a, b) => a - b).slice(0, MAX_CUE_ANCHORS_ON_SAVE)

  return sortedIndices.map((index) => {
    const cue = cues[index]
    return {
      id: createMaskId(),
      time: cue?.start ?? 0,
      kind: 'cue' as const
    }
  })
}

export function mergeAnchorsForSave(
  manualAnchors: TrackAnchor[],
  cues: SrtCue[]
): TrackAnchor[] {
  const cueAnchors = captureCueAnchorsFromSubtitles(cues)
  const manualOnly = manualAnchors.filter((anchor) => anchor.kind !== 'cue')
  return [...manualOnly, ...cueAnchors]
}

export function sortAnchorsByTime(anchors: TrackAnchor[]): TrackAnchor[] {
  return [...anchors].sort((a, b) => a.time - b.time)
}
