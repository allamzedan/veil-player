import { sortBookmarksByStart } from './bookmarks'
import type { BookmarkTrackItem } from '../types/track'

export interface ChapterNavigationItem {
  kind: 'chapter'
  id: string
  start: number
  end?: number
  title: string
  source: 'youtube' | 'veil'
  readOnly: boolean
  description?: string
}

export interface BookmarkNavigationItem {
  kind: 'bookmark'
  id: string
  start: number
  end: number
  label: string
  note: string
  enabled: boolean
  bookmark: BookmarkTrackItem
}

export type NavigateItem = ChapterNavigationItem | BookmarkNavigationItem

export function sortNavigationItems<T extends NavigateItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
}

export function buildNavigateGroups(
  chapters: readonly ChapterNavigationItem[],
  bookmarks: readonly BookmarkTrackItem[]
): { chapters: ChapterNavigationItem[]; bookmarks: BookmarkNavigationItem[] } {
  return {
    chapters: sortNavigationItems(chapters),
    bookmarks: buildBookmarkNavigationItems(bookmarks)
  }
}

export function buildBookmarkNavigationItems(
  bookmarks: readonly BookmarkTrackItem[]
): BookmarkNavigationItem[] {
  return sortBookmarksByStart(bookmarks).map((bookmark) => ({
    kind: 'bookmark',
    id: bookmark.id,
    start: bookmark.start,
    end: bookmark.end,
    label: bookmark.label?.trim() || 'Bookmark',
    note: bookmark.notes?.trim() || '',
    enabled: bookmark.enabled !== false,
    bookmark
  }))
}

export function findAdjacentBookmark(
  items: readonly BookmarkNavigationItem[],
  selectedId: string | null,
  currentTime: number,
  direction: 'previous' | 'next'
): BookmarkNavigationItem | null {
  if (items.length === 0) {
    return null
  }
  const selectedIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1
  if (selectedIndex >= 0) {
    const nextIndex = direction === 'previous' ? selectedIndex - 1 : selectedIndex + 1
    return items[nextIndex] ?? null
  }
  if (direction === 'previous') {
    return [...items].reverse().find((item) => item.start < currentTime) ?? null
  }
  return items.find((item) => item.start > currentTime) ?? null
}

export function findSelectionAfterBookmarkDeletion(
  items: readonly BookmarkNavigationItem[],
  deletedId: string
): BookmarkNavigationItem | null {
  const index = items.findIndex((item) => item.id === deletedId)
  if (index < 0) {
    return null
  }
  return items[index + 1] ?? items[index - 1] ?? null
}
