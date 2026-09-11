import { describe, expect, it } from 'vitest'
import {
  acceptsBrowserMediaMime,
  APPROVED_MEDIA_EXTENSIONS,
  AUDIO_EXTENSIONS,
  inferMediaKindFromFileName,
  inferMediaKindFromMime,
  isApprovedMediaExtension,
  isZeroResolution,
  VIDEO_EXTENSIONS,
  visualMaskFeaturesEnabled
} from './mediaKind'

describe('mediaKind', () => {
  it('accepts supported audio extensions', () => {
    for (const ext of AUDIO_EXTENSIONS) {
      expect(isApprovedMediaExtension(ext)).toBe(true)
      expect(inferMediaKindFromFileName(`sample.${ext}`)).toBe('audio')
    }
  })

  it('accepts supported video extensions', () => {
    for (const ext of VIDEO_EXTENSIONS) {
      expect(isApprovedMediaExtension(ext)).toBe(true)
      expect(inferMediaKindFromFileName(`sample.${ext}`)).toBe('video')
    }
  })

  it('rejects unknown extensions', () => {
    expect(inferMediaKindFromFileName('notes.txt')).toBeNull()
    expect(isApprovedMediaExtension('txt')).toBe(false)
  })

  it('detects media kind from MIME', () => {
    expect(inferMediaKindFromMime('audio/mpeg')).toBe('audio')
    expect(inferMediaKindFromMime('audio/wav')).toBe('audio')
    expect(inferMediaKindFromMime('video/mp4')).toBe('video')
    expect(acceptsBrowserMediaMime('audio/flac')).toBe(true)
    expect(acceptsBrowserMediaMime('application/pdf')).toBe(false)
  })

  it('exports combined approved media extensions', () => {
    expect(APPROVED_MEDIA_EXTENSIONS).toEqual([...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS])
  })

  it('disables visual mask features for audio', () => {
    expect(visualMaskFeaturesEnabled('video')).toBe(true)
    expect(visualMaskFeaturesEnabled('audio')).toBe(false)
    expect(visualMaskFeaturesEnabled(null)).toBe(true)
  })

  it('recognizes zero resolution for audio metadata', () => {
    expect(isZeroResolution(0, 0)).toBe(true)
    expect(isZeroResolution(1280, 720)).toBe(false)
  })
})
