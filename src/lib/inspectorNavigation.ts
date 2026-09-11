import { isTrackItemEnabled, type SelectableItemType } from './trackItems'
import type { PlaybackCapabilities } from './playbackCapabilities'
import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem
} from '../types/track'

export type InspectorNavigationItem =
  | { type: 'mask'; item: MaskTrackItem; active: boolean; label: string }
  | { type: 'mute'; item: MuteTrackItem; active: boolean; label: string }
  | { type: 'skip'; item: SkipTrackItem; active: boolean; label: string }
  | { type: 'bookmark'; item: BookmarkTrackItem; active: false; label: string }

export type InspectorStatusFilter = 'all' | 'active'
export type InspectorTypeFilter = SelectableItemType | null
export type InspectorEmptyStateKind = 'all' | 'active' | SelectableItemType
export type InspectorEmptyStateAction = 'overview' | SelectableItemType | null

export function supportedInspectorTypeFilters(capabilities: PlaybackCapabilities): SelectableItemType[] {
  const filters: SelectableItemType[] = []
  if (capabilities.canCreateMask) filters.push('mask')
  if (capabilities.canCreateMuteRange) filters.push('mute')
  if (capabilities.canCreateSkipRange) filters.push('skip')
  if (capabilities.canEditBookmark) filters.push('bookmark')
  return filters
}

export function resolveInspectorEmptyStateKind({
  statusFilter,
  typeFilter,
  supportedTypes
}: {
  statusFilter: InspectorStatusFilter
  typeFilter: InspectorTypeFilter
  supportedTypes: SelectableItemType[]
}): InspectorEmptyStateKind {
  if (supportedTypes.length === 1 && supportedTypes[0] === 'bookmark') return 'bookmark'
  if (statusFilter === 'active') return 'active'
  return typeFilter ?? 'all'
}

export function resolveInspectorEmptyStateAction(
  kind: InspectorEmptyStateKind,
  capabilities: PlaybackCapabilities
): InspectorEmptyStateAction {
  if (kind === 'active') return null
  if (kind === 'all') return 'overview'
  if (kind === 'mask') return capabilities.canCreateMask ? 'mask' : null
  if (kind === 'mute') return capabilities.canCreateMuteRange ? 'mute' : null
  if (kind === 'skip') return capabilities.canCreateSkipRange ? 'skip' : null
  return capabilities.canCreateBookmark ? 'bookmark' : null
}

export function isRangeItemActive(
  item: MaskTrackItem | MuteTrackItem | SkipTrackItem,
  currentTime: number
): boolean {
  return isTrackItemEnabled(item) && currentTime >= item.start && currentTime <= item.end
}

export function buildInspectorNavigationItems({
  masks,
  mutes,
  skips,
  bookmarks,
  capabilities,
  currentTime,
  statusFilter,
  typeFilter
}: {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  capabilities: PlaybackCapabilities
  currentTime: number
  statusFilter: InspectorStatusFilter
  typeFilter: InspectorTypeFilter
}): InspectorNavigationItem[] {
  const rows: InspectorNavigationItem[] = []

  if (capabilities.canCreateMask) {
    masks.forEach((item, index) => rows.push({
      type: 'mask',
      item,
      active: isRangeItemActive(item, currentTime),
      label: item.label?.trim() || `Mask ${index + 1}`
    }))
  }
  if (capabilities.canCreateMuteRange) {
    mutes.forEach((item, index) => rows.push({
      type: 'mute',
      item,
      active: isRangeItemActive(item, currentTime),
      label: item.label?.trim() || `Mute ${index + 1}`
    }))
  }
  if (capabilities.canCreateSkipRange) {
    skips.forEach((item, index) => rows.push({
      type: 'skip',
      item,
      active: isRangeItemActive(item, currentTime),
      label: item.label?.trim() || `Skip ${index + 1}`
    }))
  }
  if (capabilities.canEditBookmark) {
    bookmarks.forEach((item, index) => rows.push({
      type: 'bookmark',
      item,
      active: false,
      label: item.label?.trim() || `Bookmark ${index + 1}`
    }))
  }

  const filtered = rows.filter((row) => {
    if (typeFilter !== null && row.type !== typeFilter) return false
    if (statusFilter === 'active') return row.type !== 'bookmark' && row.active
    return true
  })

  return filtered.sort((a, b) => {
    if (a.item.start !== b.item.start) return a.item.start - b.item.start
    const rank: Record<SelectableItemType, number> = { mask: 0, mute: 1, skip: 2, bookmark: 3 }
    return rank[a.type] - rank[b.type]
  })
}
