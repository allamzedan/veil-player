import type { MaskTrackItem, PercentRect } from '../types/track'
import { createMaskId } from './id'
import { DEFAULT_MASK_STYLE } from './maskDefaults'
import { enforceMaskTiming } from './maskTiming'
import type { SrtCue } from './srtParser'

const DEFAULT_SUBTITLE_RECT: PercentRect = {
  xPercent: 10,
  yPercent: 78,
  widthPercent: 80,
  heightPercent: 18
}

export function createSubtitleMasksFromCues(cues: SrtCue[]): MaskTrackItem[] {
  return cues.map((cue) => {
    const timing = enforceMaskTiming(cue.start, cue.end)

    return {
      id: createMaskId(),
      type: 'mask',
      enabled: true,
      start: timing.start,
      end: timing.end,
      rect: { ...DEFAULT_SUBTITLE_RECT },
      style: { mode: 'solid', ...DEFAULT_MASK_STYLE },
      source: { kind: 'srt' }
    }
  })
}
