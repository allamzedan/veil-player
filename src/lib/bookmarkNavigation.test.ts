import { describe, expect, it } from 'vitest'
import {
  buildBookmarkNavigationItems,
  findAdjacentBookmark,
  findSelectionAfterBookmarkDeletion
} from './bookmarkNavigation'
import type { BookmarkTrackItem } from '../types/track'

function bookmark(id: string, start: number, notes = ''): BookmarkTrackItem {
  return { id, type: 'bookmark', start, end: start, enabled: true, label: id, notes }
}

describe('bookmark navigation model', () => {
  const items = buildBookmarkNavigationItems([
    bookmark('third', 30),
    bookmark('second', 20, 'preview'),
    bookmark('first', 10)
  ])

  it('orders bookmarks chronologically and exposes note previews', () => {
    expect(items.map((item) => item.id)).toEqual(['first', 'second', 'third'])
    expect(items[1].note).toBe('preview')
    expect(items.every((item) => item.kind === 'bookmark')).toBe(true)
  })

  it('navigates relative to selection or playback time', () => {
    expect(findAdjacentBookmark(items, 'second', 0, 'previous')?.id).toBe('first')
    expect(findAdjacentBookmark(items, 'second', 0, 'next')?.id).toBe('third')
    expect(findAdjacentBookmark(items, null, 25, 'previous')?.id).toBe('second')
    expect(findAdjacentBookmark(items, null, 25, 'next')?.id).toBe('third')
  })

  it('selects the next item, then the previous item, after deletion', () => {
    expect(findSelectionAfterBookmarkDeletion(items, 'second')?.id).toBe('third')
    expect(findSelectionAfterBookmarkDeletion(items, 'third')?.id).toBe('second')
    expect(findSelectionAfterBookmarkDeletion([items[0]], 'first')).toBeNull()
  })
})
