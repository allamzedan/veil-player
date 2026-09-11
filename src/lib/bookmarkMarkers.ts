import { sortBookmarksByStart } from './bookmarks'
import { playbackRatio } from '../playback/authoritativeTime'
import type { BookmarkTrackItem } from '../types/track'

export type BookmarkMarkerEdge = 'start' | 'middle' | 'end'

export interface BookmarkMarkerPosition {
  bookmark: BookmarkTrackItem
  normalized: number
  leftPercent: number
  edge: BookmarkMarkerEdge
  stackOrder: number
}

export function bookmarkPositionPercent(time: number, duration: number): number | null {
  const normalized = playbackRatio(time, duration)
  return normalized === null ? null : normalized * 100
}

export function buildBookmarkMarkerPositions(
  bookmarks: readonly BookmarkTrackItem[],
  duration: number
): BookmarkMarkerPosition[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return []
  }

  const visible = sortBookmarksByStart(bookmarks).filter(
    (bookmark) => Number.isFinite(bookmark.start) && bookmark.start >= 0 && bookmark.start <= duration
  )

  return visible.map((bookmark, index) => {
    const normalized = playbackRatio(bookmark.start, duration) ?? 0
    const leftPercent = normalized * 100
    return {
      bookmark,
      normalized,
      leftPercent,
      edge: leftPercent <= 0 ? 'start' : leftPercent >= 100 ? 'end' : 'middle',
      stackOrder: index + 1
    }
  })
}
