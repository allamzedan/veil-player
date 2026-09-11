import { describe, expect, it } from 'vitest'
import {
  isLocalMediaSource,
  isYouTubeMediaSource,
  youtubeIdentityKey,
  youtubeSourcesMatch,
  type MediaSource
} from '../types/mediaSource'

describe('mediaSource', () => {
  const youtube: MediaSource = {
    kind: 'youtube',
    provider: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }

  const local: MediaSource = {
    kind: 'local',
    path: 'C:\\media\\a.mp4',
    mediaType: 'video'
  }

  it('narrows youtube vs local sources', () => {
    expect(isYouTubeMediaSource(youtube)).toBe(true)
    expect(isLocalMediaSource(youtube)).toBe(false)
    expect(isLocalMediaSource(local)).toBe(true)
    expect(isYouTubeMediaSource(local)).toBe(false)
  })

  it('matches YouTube identity by provider + videoId', () => {
    expect(youtubeIdentityKey(youtube)).toBe('youtube:dQw4w9WgXcQ')
    expect(
      youtubeSourcesMatch(youtube, {
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ'
      })
    ).toBe(true)
    expect(
      youtubeSourcesMatch(youtube, {
        provider: 'youtube',
        videoId: 'aaaaaaaaaaa'
      })
    ).toBe(false)
  })
})
