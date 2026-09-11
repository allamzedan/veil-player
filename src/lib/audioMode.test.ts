import { describe, expect, it } from 'vitest'
import {
  canCreateMasks,
  canRenderMaskOverlays,
  canUseRegionSubtitleCover,
  hasPlayableMediaLoaded,
  isAudioOnlySession
} from './audioMode'

describe('audioMode', () => {
  it('identifies audio-only sessions', () => {
    expect(isAudioOnlySession('audio')).toBe(true)
    expect(isAudioOnlySession('video')).toBe(false)
    expect(isAudioOnlySession(null)).toBe(false)
  })

  it('disables mask and region-cover features for audio', () => {
    expect(canCreateMasks('audio')).toBe(false)
    expect(canRenderMaskOverlays('audio')).toBe(false)
    expect(canUseRegionSubtitleCover('audio')).toBe(false)
    expect(canCreateMasks('video')).toBe(true)
  })

  it('treats loaded audio like playable media', () => {
    expect(hasPlayableMediaLoaded('veil-media://local/abc', 'audio')).toBe(true)
    expect(hasPlayableMediaLoaded('veil-media://local/abc', 'video')).toBe(true)
    expect(hasPlayableMediaLoaded(null, 'audio')).toBe(false)
    expect(hasPlayableMediaLoaded('blob:audio', null)).toBe(false)
    expect(
      hasPlayableMediaLoaded(null, null, {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      })
    ).toBe(true)
  })
})
