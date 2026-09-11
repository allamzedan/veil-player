import { describe, expect, it } from 'vitest'
import { buildVeilTrackFromStore, deserializeVeilTrackToStorePayload } from './trackSerialization'
import type { VeilTrack } from '../types/track'
import {
  formatTagsForInput,
  parseTagsInput,
  sanitizeTrackMetadata,
  TRACK_METADATA_LIMITS
} from './trackMetadataValidation'

describe('trackMetadataValidation', () => {
  it('parses comma-separated tags', () => {
    expect(parseTagsInput('family, safe, movie')).toEqual(['family', 'safe', 'movie'])
    expect(parseTagsInput('family; safe')).toEqual(['family', 'safe'])
  })

  it('clamps field lengths and dedupes tags', () => {
    const longTitle = 'a'.repeat(TRACK_METADATA_LIMITS.titleMax + 10)
    const result = sanitizeTrackMetadata({
      title: longTitle,
      author: '  Alice  ',
      tags: ['Family', 'family', 'safe', ...Array.from({ length: 25 }, (_, i) => `tag${i}`)]
    })

    expect(result.title).toHaveLength(TRACK_METADATA_LIMITS.titleMax)
    expect(result.author).toBe('Alice')
    expect(result.tags).toHaveLength(TRACK_METADATA_LIMITS.tagsMax)
    expect(result.tags?.[0]).toBe('Family')
    expect(result.tags?.includes('family')).toBe(false)
  })

  it('preserves reserved community fields without editing them', () => {
    const result = sanitizeTrackMetadata({
      title: 'Shared',
      rating: 4.5,
      downloads: 120,
      signature: 'abc123'
    })

    expect(result.rating).toBe(4.5)
    expect(result.downloads).toBe(120)
    expect(result.signature).toBe('abc123')
  })

  it('formats tags for text input', () => {
    expect(formatTagsForInput(['family', 'safe'])).toBe('family, safe')
    expect(formatTagsForInput(undefined)).toBe('')
  })

  it('round-trips community metadata through export', () => {
    const track: VeilTrack = {
      version: '1.4.0',
      app: 'VEIL',
      video: {
        name: 'movie.mp4',
        duration: 120,
        fileSize: 1000,
        resolution: { width: 1920, height: 1080 },
        fingerprint: { method: 'metadata-v1', value: 'fp' }
      },
      globalOffsetSeconds: 0,
      trackMetadata: {
        title: 'Family Safe',
        description: 'Masks subtitles.',
        author: 'Username',
        tags: ['family', 'safe']
      },
      items: []
    }

    const payload = deserializeVeilTrackToStorePayload(track)
    const exported = buildVeilTrackFromStore({
      ...payload,
      videoFileName: 'movie.mp4',
      videoMetadata: {
        name: 'movie.mp4',
        duration: 120,
        fileSize: 1000,
        width: 1920,
        height: 1080
      }
    })

    expect(exported).not.toBeNull()
    if (!exported) {
      return
    }
    const metadata = exported.trackMetadata
    expect(metadata?.title).toBe('Family Safe')
    expect(metadata?.author).toBe('Username')
    expect(metadata?.tags).toEqual(['family', 'safe'])
  })
})
