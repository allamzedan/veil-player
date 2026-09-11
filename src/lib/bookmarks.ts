import { createMaskId } from './id'
import { normalizeTrackItemEnabled } from './trackItems'
import type { BookmarkTrackItem } from '../types/track'

export const DEFAULT_BOOKMARK_LABEL = 'Bookmark'

export function normalizeBookmarkPoint(start: number): { start: number; end: number } {
  const normalizedStart = Math.max(0, start)
  return { start: normalizedStart, end: normalizedStart }
}

export function createBookmarkItem(
  startSeconds: number,
  label?: string,
  notes?: string
): BookmarkTrackItem {
  const { start, end } = normalizeBookmarkPoint(startSeconds)
  return {
    id: createMaskId(),
    type: 'bookmark',
    enabled: true,
    start,
    end,
    label: label?.trim() || DEFAULT_BOOKMARK_LABEL,
    notes: notes?.trim() ?? ''
  }
}

export function normalizeBookmarkItem(
  item: Partial<BookmarkTrackItem> & Pick<BookmarkTrackItem, 'start'>
): BookmarkTrackItem {
  const { start, end } = normalizeBookmarkPoint(item.start)
  const normalized = normalizeTrackItemEnabled({
    id: item.id?.trim() || createMaskId(),
    type: 'bookmark' as const,
    start,
    end,
    enabled: item.enabled !== false,
    label: item.label?.trim() || DEFAULT_BOOKMARK_LABEL,
    notes: item.notes?.trim() ?? '',
    ...(item.locked === true ? { locked: true } : {})
  })
  return normalized
}

export function sortBookmarksByStart(bookmarks: readonly BookmarkTrackItem[]): BookmarkTrackItem[] {
  return [...bookmarks].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }
    return a.id.localeCompare(b.id)
  })
}

export function shiftBookmarkItems(
  items: BookmarkTrackItem[],
  deltaSeconds: number
): BookmarkTrackItem[] {
  return items.map((item) => {
    const { start, end } = normalizeBookmarkPoint(item.start + deltaSeconds)
    return { ...item, start, end }
  })
}

export function patchBookmarkFields(
  item: BookmarkTrackItem,
  patch: Partial<Pick<BookmarkTrackItem, 'start' | 'label' | 'notes' | 'enabled'>>
): BookmarkTrackItem {
  const nextStart = patch.start !== undefined ? patch.start : item.start
  const { start, end } = normalizeBookmarkPoint(nextStart)
  return {
    ...item,
    start,
    end,
    ...(patch.label !== undefined ? { label: patch.label.trim() || DEFAULT_BOOKMARK_LABEL } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {})
  }
}
