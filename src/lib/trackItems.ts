import { createMaskId } from './id'
import { DEFAULT_MASK_DURATION_SECONDS, enforceMaskTiming } from './maskTiming'
import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem,
  TrackItem
} from '../types/track'

export const PLAYBACK_EPSILON = 0.001

export type SelectableItemType = 'mask' | 'mute' | 'skip' | 'bookmark'

export function buildReconcileItems(
  masks: MaskTrackItem[],
  mutes: MuteTrackItem[],
  skips: SkipTrackItem[]
): TrackItem[] {
  return [...masks, ...mutes, ...skips]
}

export function enforceItemTiming(start: number, end: number): { start: number; end: number } {
  return enforceMaskTiming(start, end)
}

export function createMuteItem(startSeconds?: number, endSeconds?: number): MuteTrackItem {
  const start = startSeconds ?? 0
  const end = endSeconds ?? start + DEFAULT_MASK_DURATION_SECONDS
  const timing = enforceItemTiming(start, end)

  return {
    id: createMaskId(),
    type: 'mute',
    enabled: true,
    start: timing.start,
    end: timing.end
  }
}

export function createSkipItem(startSeconds?: number, endSeconds?: number): SkipTrackItem {
  const start = startSeconds ?? 0
  const end = endSeconds ?? start + DEFAULT_MASK_DURATION_SECONDS
  const timing = enforceItemTiming(start, end)

  return {
    id: createMaskId(),
    type: 'skip',
    enabled: true,
    start: timing.start,
    end: timing.end
  }
}

export function isTrackItemEnabled(item: { enabled?: boolean }): boolean {
  return item.enabled !== false
}

export type SortMode = 'time' | 'type' | 'created'
export type FilterMode = 'all' | 'mask' | 'mute' | 'skip' | 'bookmark' | 'active'

export interface LayerListRow {
  type: SelectableItemType
  item: MaskTrackItem | MuteTrackItem | SkipTrackItem | BookmarkTrackItem
  label: string
  storeIndex: number
}

export interface LayerListActiveSets {
  mask: ReadonlySet<string>
  mute: ReadonlySet<string>
  skip: ReadonlySet<string>
}

const TYPE_RANK: Record<SelectableItemType, number> = {
  mask: 0,
  mute: 1,
  skip: 2,
  bookmark: 3
}

export function buildLayerListRows(
  masks: MaskTrackItem[],
  mutes: MuteTrackItem[],
  skips: SkipTrackItem[],
  bookmarks: BookmarkTrackItem[] = []
): LayerListRow[] {
  const rows: LayerListRow[] = []

  let manualMaskIndex = 0
  let subtitleMaskIndex = 0

  masks.forEach((item, index) => {
    const isSubtitleMask = item.source?.kind === 'srt'
    const fallbackLabel = isSubtitleMask
      ? formatSubtitleMaskLabel(subtitleMaskIndex++)
      : formatTypeLabel('mask', manualMaskIndex++)

    rows.push({
      type: 'mask',
      item,
      label: item.label?.trim() || fallbackLabel,
      storeIndex: index
    })
  })

  mutes.forEach((item, index) => {
    rows.push({
      type: 'mute',
      item,
      label: item.label?.trim() || formatTypeLabel('mute', index),
      storeIndex: index
    })
  })

  skips.forEach((item, index) => {
    rows.push({
      type: 'skip',
      item,
      label: item.label?.trim() || formatTypeLabel('skip', index),
      storeIndex: index
    })
  })

  bookmarks.forEach((item, index) => {
    rows.push({
      type: 'bookmark',
      item,
      label: item.label?.trim() || formatTypeLabel('bookmark', index),
      storeIndex: index
    })
  })

  return rows
}

export function sortLayerRows(rows: LayerListRow[], mode: SortMode): LayerListRow[] {
  const sorted = [...rows]

  if (mode === 'created') {
    return sorted.sort((a, b) => {
      const typeDiff = TYPE_RANK[a.type] - TYPE_RANK[b.type]
      if (typeDiff !== 0) {
        return typeDiff
      }
      return a.storeIndex - b.storeIndex
    })
  }

  if (mode === 'type') {
    return sorted.sort((a, b) => {
      const typeDiff = TYPE_RANK[a.type] - TYPE_RANK[b.type]
      if (typeDiff !== 0) {
        return typeDiff
      }
      if (a.item.start !== b.item.start) {
        return a.item.start - b.item.start
      }
      return a.storeIndex - b.storeIndex
    })
  }

  return sorted.sort((a, b) => {
    if (a.item.start !== b.item.start) {
      return a.item.start - b.item.start
    }
    const typeDiff = TYPE_RANK[a.type] - TYPE_RANK[b.type]
    if (typeDiff !== 0) {
      return typeDiff
    }
    return a.storeIndex - b.storeIndex
  })
}

export function filterLayerRows(
  rows: LayerListRow[],
  mode: FilterMode,
  activeSets: LayerListActiveSets
): LayerListRow[] {
  if (mode === 'all') {
    return rows
  }

  if (mode === 'mask') {
    return rows.filter((row) => row.type === 'mask')
  }

  if (mode === 'mute') {
    return rows.filter((row) => row.type === 'mute')
  }

  if (mode === 'skip') {
    return rows.filter((row) => row.type === 'skip')
  }

  if (mode === 'bookmark') {
    return rows.filter((row) => row.type === 'bookmark')
  }

  return rows.filter((row) => {
    if (row.type === 'bookmark') {
      return false
    }

    if (!isTrackItemEnabled(row.item)) {
      return false
    }

    if (row.type === 'mask') {
      return activeSets.mask.has(row.item.id)
    }

    if (row.type === 'mute') {
      return activeSets.mute.has(row.item.id)
    }

    return activeSets.skip.has(row.item.id)
  })
}

export function normalizeTrackItemEnabled<T extends { enabled?: boolean }>(item: T): T {
  return {
    ...item,
    enabled: item.enabled !== false
  }
}

export function getRuntimeTrackItemCount(state: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
}): number {
  return state.masks.length + state.mutes.length + state.skips.length
}

export function getTotalTrackItemCount(state: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks?: BookmarkTrackItem[]
}): number {
  return getRuntimeTrackItemCount(state) + (state.bookmarks?.length ?? 0)
}

export function trackItemExists(
  state: {
    masks: MaskTrackItem[]
    mutes: MuteTrackItem[]
    skips: SkipTrackItem[]
    bookmarks: BookmarkTrackItem[]
  },
  id: string,
  type: SelectableItemType
): boolean {
  if (type === 'mask') {
    return state.masks.some((item) => item.id === id)
  }
  if (type === 'mute') {
    return state.mutes.some((item) => item.id === id)
  }
  if (type === 'skip') {
    return state.skips.some((item) => item.id === id)
  }
  return state.bookmarks.some((item) => item.id === id)
}

export function validateSelection(state: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  selectedItemId: string | null
  selectedItemType: SelectableItemType | null
}): { selectedItemId: string | null; selectedItemType: SelectableItemType | null } {
  const { selectedItemId, selectedItemType } = state

  if (selectedItemId === null || selectedItemType === null) {
    return { selectedItemId: null, selectedItemType: null }
  }

  if (!trackItemExists(state, selectedItemId, selectedItemType)) {
    return { selectedItemId: null, selectedItemType: null }
  }

  return { selectedItemId, selectedItemType }
}

export const LARGE_TRACK_ITEM_WARNING = 2000

export function pickInitialSelection(payload: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
}): { id: string; type: SelectableItemType } | null {
  const firstMask = payload.masks[0]
  if (firstMask) {
    return { id: firstMask.id, type: 'mask' }
  }

  const firstMute = payload.mutes[0]
  if (firstMute) {
    return { id: firstMute.id, type: 'mute' }
  }

  const firstSkip = payload.skips[0]
  if (firstSkip) {
    return { id: firstSkip.id, type: 'skip' }
  }

  return null
}

export function formatTypeLabel(type: SelectableItemType, index: number): string {
  const prefix =
    type === 'mask'
      ? 'Mask'
      : type === 'mute'
        ? 'Mute'
        : type === 'skip'
          ? 'Skip'
          : 'Bookmark'
  return `${prefix} ${String(index + 1).padStart(3, '0')}`
}

export function formatSubtitleMaskLabel(index: number): string {
  return `Subtitle Mask ${String(index + 1).padStart(3, '0')}`
}
