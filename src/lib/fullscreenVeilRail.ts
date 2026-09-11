export type FullscreenVeilRailItemType = 'mask' | 'mute' | 'skip' | 'bookmark'

export interface FullscreenVeilRailSourceItem {
  id: string
  type: FullscreenVeilRailItemType
  start: number
  end: number
  enabled?: boolean
}

export interface FullscreenVeilRailMark {
  id: string
  type: FullscreenVeilRailItemType
  kind: 'range' | 'point'
  leftPercent: number
  widthPercent?: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function buildFullscreenVeilRailMarks(
  items: readonly FullscreenVeilRailSourceItem[],
  duration: number
): FullscreenVeilRailMark[] {
  if (!Number.isFinite(duration) || duration <= 0) return []

  return items.flatMap((item): FullscreenVeilRailMark[] => {
    if (item.enabled === false || !Number.isFinite(item.start)) return []

    const start = clamp(item.start, 0, duration)
    if (item.type === 'bookmark') {
      return [{
        id: item.id,
        type: item.type,
        kind: 'point',
        leftPercent: (start / duration) * 100
      }]
    }

    if (!Number.isFinite(item.end)) return []
    const end = clamp(item.end, 0, duration)
    if (end <= start) return []

    return [{
      id: item.id,
      type: item.type,
      kind: 'range',
      leftPercent: (start / duration) * 100,
      widthPercent: ((end - start) / duration) * 100
    }]
  })
}
