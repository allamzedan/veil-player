import { describe, expect, it } from 'vitest'
import { deserializeVeilTrackToStorePayload } from './trackSerialization'
import { parseVeilTrackJson } from './trackSchema'

const baseTrack = {
  version: '1.4.0',
  app: 'VEIL',
  video: {
    name: 'test.mp4',
    duration: 60,
    fileSize: 1000,
    resolution: { width: 1280, height: 720 },
    fingerprint: { method: 'metadata-v1', value: 'fp' }
  },
  globalOffsetSeconds: 0,
  items: []
}

describe('parseVeilTrackJson', () => {
  it('rejects invalid JSON', () => {
    const result = parseVeilTrackJson('{ not json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('JSON')
    }
  })

  it('rejects unknown version', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({ ...baseTrack, version: '9.9.9' })
    )
    expect(result.ok).toBe(false)
  })

  it('accepts 1.4.0 with optional fade fields', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        items: [
          {
            id: 'm1',
            type: 'mask',
            start: 0,
            end: 5,
            rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
            style: { mode: 'solid', color: '#000', opacity: 1 },
            fadeInMs: 300,
            fadeOutMs: 0
          }
        ]
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const mask = result.track.items[0]
      expect(mask.type).toBe('mask')
      if (mask.type === 'mask') {
        expect(mask.fadeInMs).toBe(300)
      }
    }
  })

  it('accepts legacy 1.3.0 without fade fields', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({ ...baseTrack, version: '1.3.0' })
    )
    expect(result.ok).toBe(true)
  })

  it('accepts unbound manual tracks with empty video name', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        video: {
          binding: 'unbound',
          name: '',
          duration: 120,
          fileSize: null,
          resolution: { width: 0, height: 0 },
          fingerprint: { method: 'manual-unbound', value: 'manual-unbound' }
        }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('accepts community metadata and reserved fields', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        trackMetadata: {
          title: 'Family Safe',
          description: 'Masks subtitles and skips explicit scenes.',
          author: 'Username',
          tags: ['family', 'safe', 'movie'],
          rating: 4.8,
          downloads: 42,
          signature: 'future-proof'
        }
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.track.trackMetadata?.title).toBe('Family Safe')
      expect(result.track.trackMetadata?.author).toBe('Username')
      expect(result.track.trackMetadata?.tags).toEqual(['family', 'safe', 'movie'])
      expect(result.track.trackMetadata?.downloads).toBe(42)
    }
  })

  it('accepts tracks without trackMetadata', () => {
    const result = parseVeilTrackJson(JSON.stringify(baseTrack))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.track.trackMetadata).toBeUndefined()
    }
  })

  it('accepts VEIL Mobile appVersion and smartCover subtitleCover', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        ...baseTrack,
        appVersion: 'VEIL Mobile 0.1.0',
        subtitleCover: {
          mode: 'smartCover',
          regionRect: {
            xPercent: 10,
            yPercent: 78,
            widthPercent: 80,
            heightPercent: 18
          }
        },
        items: [
          {
            id: 's1',
            type: 'skip',
            start: 22.577,
            end: 25.577,
            enabled: true
          }
        ]
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.track.appVersion).toBe('VEIL Mobile 0.1.0')
      expect(result.track.subtitleCover?.mode).toBe('smartCover')
    }
  })

  it.each(['1.0.0', '1.1.0', '1.2.0'] as const)(
    'accepts legacy %s bookmark-less VEIL',
    (version) => {
      const result = parseVeilTrackJson(
        JSON.stringify({
          ...baseTrack,
          version,
          items: [
            {
              id: 'm1',
              type: 'mask',
              start: 1,
              end: 6,
              rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
              style: { mode: 'solid', color: '#000000', opacity: 1 }
            }
          ]
        })
      )
      expect(result.ok).toBe(true)
      if (!result.ok) {
        return
      }
      expect(result.track.version).toBe(version)
      expect(result.track.items.every((item) => item.type !== 'bookmark')).toBe(true)
      const payload = deserializeVeilTrackToStorePayload(result.track)
      expect(payload.masks).toHaveLength(1)
      expect(payload.bookmarks).toHaveLength(0)
    }
  )

  it('accepts YouTube-bound 1.6.0 tracks with summary and bookmarks', async () => {
    const fixture = await import('./__fixtures__/youtube-1.6.0-valid.veil.json')
    const result = parseVeilTrackJson(JSON.stringify(fixture.default ?? fixture))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.track.version).toBe('1.6.0')
    expect(result.track.media?.kind).toBe('youtube')
    expect(result.track.media?.videoId).toBe('dQw4w9WgXcQ')
    expect(result.track.trackMetadata?.summary).toContain('Whole-media summary')
    expect(result.track.video).toBeUndefined()
    const payload = deserializeVeilTrackToStorePayload(result.track)
    expect(payload.masks).toHaveLength(0)
    expect(payload.mutes).toHaveLength(0)
    expect(payload.skips).toHaveLength(0)
    expect(payload.bookmarks).toHaveLength(1)
    expect(payload.youtubeMedia?.videoId).toBe('dQw4w9WgXcQ')
  })

  it('rejects YouTube 1.6.0 tracks with invalid video id', async () => {
    const fixture = await import('./__fixtures__/youtube-1.6.0-invalid-id.veil.json')
    const result = parseVeilTrackJson(JSON.stringify(fixture.default ?? fixture))
    expect(result.ok).toBe(false)
  })

  it('rejects YouTube tracks that still require a video block when media is absent', () => {
    const result = parseVeilTrackJson(
      JSON.stringify({
        version: '1.6.0',
        app: 'VEIL',
        globalOffsetSeconds: 0,
        items: []
      })
    )
    expect(result.ok).toBe(false)
  })
})
