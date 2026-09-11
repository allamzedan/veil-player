import { createMaskId } from './id'
import { buildTrackSessionFingerprint } from './trackGroupSession'
import type { TrackAnchor } from '../types/track'

export interface SessionBookmark {
  id: string
  time: number
  label: string
}

export function createSessionBookmark(time: number, label?: string): SessionBookmark {
  return {
    id: createMaskId(),
    time,
    label: label?.trim() || `Bookmark ${time.toFixed(1)}s`
  }
}

export function readSessionBookmarks(storageKey: string): SessionBookmark[] {
  const raw = sessionStorage.getItem(storageKey)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as SessionBookmark[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.time === 'number' &&
        Number.isFinite(item.time) &&
        typeof item.label === 'string'
    )
  } catch {
    return []
  }
}

export function writeSessionBookmarks(storageKey: string, bookmarks: SessionBookmark[]): void {
  sessionStorage.setItem(storageKey, JSON.stringify(bookmarks))
}

export function bookmarkStorageKey(fileName: string | null, duration: number): string {
  return `veil:bookmarks:${buildTrackSessionFingerprint(fileName, duration)}`
}

export function readBookmarksForSave(
  fileName: string | null,
  duration: number
): SessionBookmark[] {
  return readSessionBookmarks(bookmarkStorageKey(fileName, duration))
}

export function sessionBookmarksToAnchors(bookmarks: readonly SessionBookmark[]): TrackAnchor[] {
  return bookmarks.map((bookmark) => ({
    id: bookmark.id,
    time: bookmark.time,
    kind: 'bookmark' as const,
    label: bookmark.label
  }))
}
