import { describe, expect, it } from 'vitest'
import { buildBookmarkCsv } from './bookmarkCsv'
import { filterNavigationItemsByQuery } from './bookmarkSearch'
import { parseVeilTrackJson } from './trackSchema'
import { computeVirtualTimelineDuration } from './virtualTimeline'
import type { BookmarkTrackItem, MuteTrackItem, VeilTrack } from '../types/track'

const LAYER_COUNT = 12_000
const BOOKMARK_COUNT = 3_000

function largeMuteSet(): MuteTrackItem[] {
  return Array.from({ length: LAYER_COUNT }, (_, index) => ({
    id: 'mute-' + index,
    type: 'mute' as const,
    start: index * 0.25,
    end: index * 0.25 + 0.5,
    enabled: true
  }))
}

function largeBookmarkSet(): BookmarkTrackItem[] {
  return Array.from({ length: BOOKMARK_COUNT }, (_, index) => ({
    id: 'bookmark-' + index,
    type: 'bookmark' as const,
    start: index * 0.5,
    end: index * 0.5,
    enabled: true,
    label: index === BOOKMARK_COUNT - 1 ? 'needle-' + index : 'chapter-' + index,
    notes: 'note-' + index
  }))
}

describe('deterministic durability scale sanity', () => {
  it('derives large timeline geometry in one exact pass-equivalent result', () => {
    const mutes = largeMuteSet()
    const duration = computeVirtualTimelineDuration({
      masks: [],
      mutes,
      skips: [],
      metadataDuration: 600
    })

    expect(mutes).toHaveLength(LAYER_COUNT)
    expect(duration).toBeCloseTo((LAYER_COUNT - 1) * 0.25 + 0.5 + 30, 8)
  })

  it('searches and exports a large bookmark set without losing or duplicating rows', () => {
    const bookmarks = largeBookmarkSet()
    const rows = bookmarks.map((item) => ({ type: item.type, item }))
    const matches = filterNavigationItemsByQuery(rows, 'needle-' + (BOOKMARK_COUNT - 1))
    const csv = buildBookmarkCsv(bookmarks)

    expect(matches.map((row) => row.item.id)).toEqual(['bookmark-' + (BOOKMARK_COUNT - 1)])
    expect(csv).not.toBeNull()
    expect(csv!.split('\r\n')).toHaveLength(BOOKMARK_COUNT + 1)
    expect(csv!.match(/bookmark-/g)).toBeNull()
  })

  it('round-trips a large supported layer set with deterministic item count and order', () => {
    const items = largeMuteSet()
    const track: VeilTrack = {
      version: '1.6.0',
      app: 'VEIL',
      video: {
        name: 'large.mp4',
        duration: 3600,
        fileSize: 1_000_000,
        resolution: { width: 1920, height: 1080 },
        fingerprint: { method: 'metadata-v1', value: 'large-fingerprint' }
      },
      globalOffsetSeconds: 0,
      items
    }

    const parsed = parseVeilTrackJson(JSON.stringify(track))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.track.items).toHaveLength(LAYER_COUNT)
    expect(parsed.track.items[0]?.id).toBe('mute-0')
    expect(parsed.track.items.at(-1)?.id).toBe('mute-' + (LAYER_COUNT - 1))
  })
})
