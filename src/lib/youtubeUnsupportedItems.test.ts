import { describe, expect, it } from 'vitest'
import {
  buildVeilTrackFromStore,
  deserializeVeilTrackToStorePayload,
  youtubeMediaSourceFromTrack
} from './trackSerialization'
import type { VeilTrack } from '../types/track'
import { formatTrackExportSummary } from './trackExport'

const youtubeTrackWithRanges: VeilTrack = {
  version: '1.6.0',
  app: 'VEIL',
  media: {
    kind: 'youtube',
    provider: 'youtube',
    videoId: 'abc123def45',
    canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45',
    duration: 120
  },
  globalOffsetSeconds: 0,
  trackMetadata: { summary: 'Whole-video note' },
  items: [
    {
      id: 'legacy-mask',
      type: 'mask',
      start: 2,
      end: 5,
      rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
      style: { mode: 'solid', color: '#000000', opacity: 1 }
    },
    { id: 'mute-1', type: 'mute', start: 6, end: 9 },
    { id: 'legacy-skip', type: 'skip', start: 10, end: 15, label: 'Preserve me' },
    { id: 'bookmark-1', type: 'bookmark', start: 20, end: 20, notes: 'Keep this too' }
  ]
}

describe('YouTube range serialization', () => {
  it('loads Mute and Skip as executable while preserving visual masks', () => {
    const payload = deserializeVeilTrackToStorePayload(youtubeTrackWithRanges)
    expect(payload.skips).toEqual([expect.objectContaining({ id: 'legacy-skip', type: 'skip' })])
    expect(payload.masks).toEqual([])
    expect(payload.mutes).toEqual([expect.objectContaining({ id: 'mute-1', type: 'mute' })])
    expect(payload.preservedUnsupportedItems).toEqual([
      expect.objectContaining({ id: 'legacy-mask', type: 'mask', start: 2, end: 5 })
    ])
    expect(payload.bookmarks).toHaveLength(1)
  })

  it('round-trips executable ranges and the unsupported mask without schema changes', () => {
    const payload = deserializeVeilTrackToStorePayload(youtubeTrackWithRanges)
    const mediaSource = youtubeMediaSourceFromTrack(youtubeTrackWithRanges)
    expect(mediaSource).not.toBeNull()

    const saved = buildVeilTrackFromStore({
      ...payload,
      videoMetadata: {
        name: 'abc123def45',
        duration: 120,
        fileSize: null,
        width: 0,
        height: 0
      },
      videoFileName: 'abc123def45',
      mediaSource
    })

    expect(saved?.version).toBe('1.6.0')
    expect(saved?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'legacy-skip', type: 'skip', label: 'Preserve me' }),
        expect.objectContaining({ id: 'mute-1', type: 'mute' }),
        expect.objectContaining({ id: 'legacy-mask', type: 'mask' }),
        expect.objectContaining({ id: 'bookmark-1', type: 'bookmark', notes: 'Keep this too' })
      ])
    )
    expect(formatTrackExportSummary(saved!, 'YouTube VEIL')).not.toContain('Actions:')

    const reopened = deserializeVeilTrackToStorePayload(saved!)
    expect(reopened.skips).toEqual([expect.objectContaining({ id: 'legacy-skip', type: 'skip' })])
    expect(reopened.mutes).toEqual([expect.objectContaining({ id: 'mute-1', type: 'mute' })])
    expect(reopened.preservedUnsupportedItems?.[0]).toEqual(
      expect.objectContaining({ id: 'legacy-mask', type: 'mask' })
    )
    expect(reopened.bookmarks).toHaveLength(1)
  })
})
