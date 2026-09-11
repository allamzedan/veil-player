import type { MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'

export const MIN_VIRTUAL_TIMELINE_DURATION_SECONDS = 5 * 60
export const VIRTUAL_TIMELINE_ITEM_MARGIN_SECONDS = 30

type TimedTrackItem = Pick<MaskTrackItem | MuteTrackItem | SkipTrackItem, 'start' | 'end'>

export function getMaxTrackItemTime(items: TimedTrackItem[]): number {
  return items.reduce((max, item) => {
    const itemMax = Math.max(
      Number.isFinite(item.start) ? item.start : 0,
      Number.isFinite(item.end) ? item.end : 0
    )
    return Math.max(max, itemMax)
  }, 0)
}

export function computeVirtualTimelineDuration(options: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  metadataDuration?: number | null
}): number {
  const itemMax = getMaxTrackItemTime([
    ...options.masks,
    ...options.mutes,
    ...options.skips
  ])
  const itemDuration =
    itemMax > 0 ? itemMax + VIRTUAL_TIMELINE_ITEM_MARGIN_SECONDS : 0
  const metadataDuration =
    Number.isFinite(options.metadataDuration) && (options.metadataDuration ?? 0) > 0
      ? options.metadataDuration ?? 0
      : 0

  return Math.max(
    MIN_VIRTUAL_TIMELINE_DURATION_SECONDS,
    metadataDuration,
    itemDuration
  )
}
