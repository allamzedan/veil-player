import type { VeilTrackStorePayload } from './trackSerialization'
import type { TrackItem } from '../types/track'
import { compareTrackVideoToCurrent, type TrackVideoSnapshot } from './fingerprint'
import type { VideoMetadata } from '../state/useVeilStore'

export type SidecarItemType = 'mask' | 'mute' | 'skip' | 'bookmark'

export interface SidecarComparisonItem {
  item: TrackItem
  status: 'new' | 'duplicate' | 'conflict'
  relatedCurrentItem: TrackItem | null
}

export interface SidecarComparison {
  items: SidecarComparisonItem[]
  imported: VeilTrackStorePayload
}

const ITEM_ORDER: SidecarItemType[] = ['mask', 'mute', 'skip', 'bookmark']

function itemKey(item: TrackItem): string {
  const { id: _id, ...meaningful } = item
  return JSON.stringify(meaningful)
}

function overlaps(a: TrackItem, b: TrackItem): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'bookmark' || b.type === 'bookmark') return a.start === b.start
  return a.start < b.end && b.start < a.end
}

function sortItems(items: TrackItem[]): TrackItem[] {
  return [...items].sort((a, b) => {
    const typeDelta = ITEM_ORDER.indexOf(a.type) - ITEM_ORDER.indexOf(b.type)
    if (typeDelta !== 0) return typeDelta
    return a.start - b.start || a.end - b.end || a.id.localeCompare(b.id)
  })
}

export function sidecarItems(payload: VeilTrackStorePayload): TrackItem[] {
  return sortItems([...payload.masks, ...payload.mutes, ...payload.skips, ...payload.bookmarks])
}

export function compareSidecarItems(
  current: VeilTrackStorePayload,
  imported: VeilTrackStorePayload
): SidecarComparison {
  const currentItems = sidecarItems(current)
  const currentByKey = new Map(currentItems.map((item) => [itemKey(item), item]))
  const items = sidecarItems(imported).map((item): SidecarComparisonItem => {
    const duplicate = currentByKey.get(itemKey(item))
    if (duplicate) {
      return { item, status: 'duplicate', relatedCurrentItem: duplicate }
    }
    const relatedCurrentItem = currentItems.find((candidate) => overlaps(candidate, item)) ?? null
    return {
      item,
      status: relatedCurrentItem ? 'conflict' : 'new',
      relatedCurrentItem
    }
  })
  return { items, imported }
}

export function selectedSidecarPayload(
  comparison: SidecarComparison,
  selectedIds: ReadonlySet<string>
): Pick<VeilTrackStorePayload, 'masks' | 'mutes' | 'skips' | 'bookmarks'> {
  const selected = comparison.items
    .filter(({ item, status }) => status !== 'duplicate' && selectedIds.has(item.id))
    .map(({ item }) => item)
  return {
    masks: selected.filter((item): item is Extract<TrackItem, { type: 'mask' }> => item.type === 'mask'),
    mutes: selected.filter((item): item is Extract<TrackItem, { type: 'mute' }> => item.type === 'mute'),
    skips: selected.filter((item): item is Extract<TrackItem, { type: 'skip' }> => item.type === 'skip'),
    bookmarks: selected.filter((item): item is Extract<TrackItem, { type: 'bookmark' }> => item.type === 'bookmark')
  }
}

export function formatSidecarItem(item: TrackItem): string {
  const label = item.label || item.notes
  if (item.type === 'bookmark') return `${item.start.toFixed(3)}s${label ? ` — ${label}` : ''}`
  return `${item.start.toFixed(3)}–${item.end.toFixed(3)}s${label ? ` — ${label}` : ''}`
}


export function sidecarMediaWarning(importedVideo: TrackVideoSnapshot | null | undefined, currentFileName: string | null, currentMetadata: VideoMetadata | null): string | null {
  if (!currentFileName || !currentMetadata) {
    return 'No media is currently loaded. VEIL will not bind or replace media during import.'
  }
  if (!importedVideo) return null
  return compareTrackVideoToCurrent(importedVideo, currentFileName, currentMetadata).length > 0
    ? 'The imported sidecar targets different media. Review selections carefully; VEIL will not bind or replace the current media.'
    : null
}