import { describe, expect, it } from 'vitest'
import {
  createBookmarkItem,
  normalizeBookmarkItem,
  sortBookmarksByStart
} from './bookmarks'
import { reconcilePlayback } from './reconciler'
import {
  buildVeilTrackFromStore,
  deserializeVeilTrackToStorePayload,
  parseAndDeserializeTrackJson
} from './trackSerialization'
import { parseVeilTrackJson } from './trackSchema'
import type { BookmarkTrackItem, VeilTrack } from '../types/track'

const baseTrack = {
  version: '1.5.0',
  app: 'VEIL' as const,
  video: {
    name: 'test.mp4',
    duration: 120,
    fileSize: 1000,
    resolution: { width: 1280, height: 720 },
    fingerprint: { method: 'metadata-v1' as const, value: 'fp' }
  },
  globalOffsetSeconds: 0,
  items: [] as VeilTrack['items']
}

describe('bookmark track items', () => {
  it('imports bookmark item', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        items: [
          {
            id: 'b1',
            type: 'bookmark',
            start: 84.25,
            end: 84.25,
            label: 'Important vocabulary',
            notes: 'Review this sentence later.'
          }
        ]
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const bookmark = result.track.items[0]
      expect(bookmark.type).toBe('bookmark')
    }
  })

  it('exports bookmark item', () => {
    const bookmark = createBookmarkItem(12.5, 'Scene change', 'Review')
    const track = buildVeilTrackFromStore({
      masks: [],
      mutes: [],
      skips: [],
      bookmarks: [bookmark],
      globalOffsetSeconds: 0,
      trackMetadata: {},
      groups: [],
      anchors: [],
      subtitleCoverMode: 'show',
      regionCoverRect: { xPercent: 0, yPercent: 80, widthPercent: 100, heightPercent: 20 },
      videoMetadata: {
        name: 'clip.mp4',
        duration: 60,
        fileSize: 1,
        width: 1280,
        height: 720
      },
      videoFileName: 'clip.mp4'
    })
    expect(track).not.toBeNull()
    const exported = track!.items.find((item) => item.type === 'bookmark')
    expect(exported).toMatchObject({
      type: 'bookmark',
      start: 12.5,
      end: 12.5,
      label: 'Scene change',
      notes: 'Review'
    })
  })

  it('normalizes missing end to start', () => {
    const normalized = normalizeBookmarkItem({ start: 42 })
    expect(normalized.end).toBe(42)
    expect(normalized.start).toBe(42)
  })

  it('normalizes different end to start', () => {
    const normalized = normalizeBookmarkItem({ start: 10, end: 20 })
    expect(normalized.end).toBe(10)
  })

  it('imports bookmark without label safely', () => {
    const parsed = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        items: [{ type: 'bookmark', start: 5 }]
      })
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const payload = deserializeVeilTrackToStorePayload(parsed.track)
      expect(payload.bookmarks[0]?.label).toBe('Bookmark')
    }
  })

  it('runtime evaluator ignores bookmark', () => {
    const bookmark: BookmarkTrackItem = createBookmarkItem(0, 'Start')
    const result = reconcilePlayback(
      {
        globalOffsetSeconds: 0,
        items: [bookmark]
      },
      0
    )
    expect(result.activeMasks).toHaveLength(0)
    expect(result.activeMutes).toHaveLength(0)
    expect(result.activeSkips).toHaveLength(0)
  })

  it('sorts bookmarks by timestamp', () => {
    const sorted = sortBookmarksByStart([
      createBookmarkItem(30, 'Late'),
      createBookmarkItem(5, 'Early'),
      createBookmarkItem(15, 'Mid')
    ])
    expect(sorted.map((item) => item.start)).toEqual([5, 15, 30])
  })

  it('preserves bookmarks across save/load round trip', () => {
    const bookmark = createBookmarkItem(22.2, 'Checkpoint')
    const json = JSON.stringify(
      buildVeilTrackFromStore({
        masks: [],
        mutes: [],
        skips: [],
        bookmarks: [bookmark],
        globalOffsetSeconds: 0,
        trackMetadata: {},
        groups: [],
        anchors: [],
        subtitleCoverMode: 'show',
        regionCoverRect: { xPercent: 0, yPercent: 80, widthPercent: 100, heightPercent: 20 },
        videoMetadata: {
          name: 'clip.mp4',
          duration: 60,
          fileSize: 1,
          width: 1280,
          height: 720
        },
        videoFileName: 'clip.mp4'
      })
    )
    const loaded = parseAndDeserializeTrackJson(json!)
    expect(loaded.ok).toBe(true)
    if (loaded.ok && loaded.payload) {
      expect(loaded.payload.bookmarks).toHaveLength(1)
      expect(loaded.payload.bookmarks[0]?.start).toBe(22.2)
    }
  })

  it('does not change mask/mute/skip reconciliation', () => {
    const result = reconcilePlayback(
      {
        globalOffsetSeconds: 0,
        items: [
          {
            id: 'm1',
            type: 'mask',
            start: 0,
            end: 5,
            rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
            style: { mode: 'solid', color: '#000', opacity: 1 }
          },
          {
            id: 'u1',
            type: 'mute',
            start: 1,
            end: 3
          },
          {
            id: 's1',
            type: 'skip',
            start: 10,
            end: 12
          },
          createBookmarkItem(2, 'Note')
        ]
      },
      2
    )
    expect(result.activeMasks).toHaveLength(1)
    expect(result.activeMutes).toHaveLength(1)
    expect(result.activeSkips).toHaveLength(0)
  })
})
