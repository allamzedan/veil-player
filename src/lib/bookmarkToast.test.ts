import { describe, expect, it } from 'vitest'
import type { BookmarkTrackItem } from '../types/track'
import {
  BOOKMARK_TOAST_DURATION_MS,
  findCrossedBookmark,
  remainingBookmarkToastLifetime,
  resetBackwardCrossingEligibility,
  shouldDismissBookmarkToastForNavigation
} from './bookmarkToast'

const bookmark = (id: string, start: number, enabled = true): BookmarkTrackItem => ({
  id,
  type: 'bookmark',
  start,
  end: start,
  enabled,
  label: id,
  notes: ''
})

describe('bookmark activity lifecycle', () => {
  it('keeps the established four-second default lifetime', () => {
    expect(BOOKMARK_TOAST_DURATION_MS).toBe(4000)
    expect(remainingBookmarkToastLifetime(4000, 1000, 2500)).toBe(2500)
  })

  it('dismisses passive activity when manually navigating away', () => {
    expect(shouldDismissBookmarkToastForNavigation({
      visibleBookmarkId: 'bookmark-a',
      editing: false
    })).toBe(true)
  })

  it('preserves activity when navigation targets the same bookmark', () => {
    expect(shouldDismissBookmarkToastForNavigation({
      visibleBookmarkId: 'bookmark-a',
      editing: false,
      targetBookmarkId: 'bookmark-a'
    })).toBe(false)
  })

  it('does not dismiss an active editor during navigation', () => {
    expect(shouldDismissBookmarkToastForNavigation({
      visibleBookmarkId: 'bookmark-a',
      editing: true
    })).toBe(false)
  })

  it('shows natural playback crossings once within the normal forward step', () => {
    const result = findCrossedBookmark({
      bookmarks: [bookmark('a', 10), bookmark('b', 11)],
      previousTime: 9.5,
      currentTime: 10.2,
      alreadyTriggered: new Set()
    })
    expect(result?.id).toBe('a')
  })

  it('does not treat manual forward jumps as natural crossings', () => {
    expect(findCrossedBookmark({
      bookmarks: [bookmark('a', 10)],
      previousTime: 1,
      currentTime: 20,
      alreadyTriggered: new Set()
    })).toBeNull()
  })

  it('ignores disabled bookmarks and already-triggered events', () => {
    expect(findCrossedBookmark({
      bookmarks: [bookmark('disabled', 10, false), bookmark('seen', 10)],
      previousTime: 9,
      currentTime: 10,
      alreadyTriggered: new Set(['seen'])
    })).toBeNull()
  })

  it('re-arms a bookmark only after moving backwards before it', () => {
    const triggered = new Set(['a', 'b'])
    resetBackwardCrossingEligibility(triggered, [bookmark('a', 10), bookmark('b', 20)], 15)
    expect([...triggered]).toEqual(['a'])
  })
})
