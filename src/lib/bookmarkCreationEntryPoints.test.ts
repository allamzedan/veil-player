import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveBookmarkTimestamp } from '../playback/authoritativeTime'
import { useVeilStore } from '../state/useVeilStore'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

afterEach(() => {
  useVeilStore.setState({
    bookmarks: [],
    selectedItemId: null,
    selectedItemType: null,
    isTrackDirty: false
  })
})

describe('authoritative bookmark creation entry points', () => {
  it('creates exactly one selected bookmark at the authoritative playback time', () => {
    const timestamp = resolveBookmarkTimestamp(122, 366)
    expect(timestamp).toBe(122)
    useVeilStore.getState().addBookmark({ start: timestamp! })
    const state = useVeilStore.getState()
    expect(state.bookmarks).toHaveLength(1)
    expect(state.bookmarks[0].start).toBe(122)
    expect(state.bookmarks[0].end).toBe(122)
    expect(state.selectedItemId).toBe(state.bookmarks[0].id)
    expect(state.selectedItemType).toBe('bookmark')
  })

  it('routes B, Overview, Navigate, and timeline creation through one handler', () => {
    const video = read('../components/VideoPlayer.tsx')
    const inspector = read('../components/InspectorPanel.tsx')
    const timeline = read('../components/TimelineControls.tsx')
    const handler = video.slice(
      video.indexOf('const addBookmarkAtCurrentTime = useCallback'),
      video.indexOf('const retryYouTubePlayback')
    )
    expect(video).toContain("if (matchesBinding(event, 'addBookmark'))")
    expect(video).toContain('addBookmarkAtCurrentTime()')
    expect(video).toContain('onAddBookmark={addBookmarkAtCurrentTime}')
    expect(inspector).toContain('onClick={onAddBookmark}')
    expect(inspector).toContain("emptyStateAction === 'bookmark') onAddBookmark()")
    expect(timeline).toContain('onClick={onAddBookmark}')
    expect(handler.match(/addBookmark\(\{ start: timestamp \}\)/g)).toHaveLength(1)
    expect(handler).toContain('resolveBookmarkTimestamp(getCurrentVideoTime(), duration)')
  })

  it('selects the created bookmark and opens the applicable bookmark editor', () => {
    const video = read('../components/VideoPlayer.tsx')
    expect(video).toContain("const createdBookmarkId = state.selectedItemType === 'bookmark'")
    expect(video).toContain('createdBookmarkId && !isAudioMode && (videoSrc || isYouTube)')
    expect(video).toContain('showBookmarkToast(createdBookmarkId, true)')
    expect(video).toContain('initiallyEditing={bookmarkToastTrigger?.initiallyEditing}')
    expect(video).toContain('!isFullscreen && bookmarkToast')
    expect(video).toContain('<BookmarkActivitySurface')
    expect(video).toContain("requestOpenSidebarPanel('selected')")
  })

  it('keeps synchronization, persistence fields, and schema unchanged', () => {
    expect(read('./bookmarkMarkerGeometry.ts')).toContain('return usableLeft + normalized * usableWidth - scrollLeft')
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
    expect(read('../components/BookmarkActivitySurface.tsx')).not.toContain('requestOpenSidebarPanel')
  })
})
