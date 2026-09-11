import type { MaskStyle, MaskTrackItem } from '../types/track'
import { createMaskId } from './id'
import { resolveNewMaskTiming } from './maskTiming'
import { getDefaultMaskColor } from './recentColors'

/** Legacy placeholder for masks created before timed defaults (Phase 3 edit-all mode). */
export const PHASE3_PLACEHOLDER_END_SECONDS = 999_999

export const DEFAULT_MASK_STYLE: Pick<MaskStyle, 'color' | 'opacity'> = {
  color: '#000000',
  opacity: 1
}

const DEFAULT_WIDTH_PERCENT = 30
const DEFAULT_HEIGHT_PERCENT = 12

export const DEFAULT_MASK_RECT = {
  xPercent: (100 - DEFAULT_WIDTH_PERCENT) / 2,
  yPercent: (100 - DEFAULT_HEIGHT_PERCENT) / 2,
  widthPercent: DEFAULT_WIDTH_PERCENT,
  heightPercent: DEFAULT_HEIGHT_PERCENT
} as const

export function createDefaultMask(
  startSeconds?: number,
  endSeconds?: number
): MaskTrackItem {
  const { start, end } = resolveNewMaskTiming(startSeconds, endSeconds)

  return {
    id: createMaskId(),
    type: 'mask',
    enabled: true,
    start,
    end,
    rect: { ...DEFAULT_MASK_RECT },
    style: {
      mode: 'solid',
      color: getDefaultMaskColor(),
      opacity: DEFAULT_MASK_STYLE.opacity
    },
    source: { kind: 'manual' }
  }
}
