import { describe, expect, it } from 'vitest'
import { mergeYouTubeMetadata, savedYouTubeMetadata } from './youtubeMetadata'

const source = {
  kind: 'youtube' as const,
  provider: 'youtube' as const,
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Saved title',
  duration: 100
}

describe('YouTube metadata priority', () => {
  it('uses saved fallback offline and iframe fills missing fields', () => {
    const saved = savedYouTubeMetadata(source)
    const iframe = mergeYouTubeMetadata(saved, {
      videoId: source.videoId,
      source: 'iframe',
      title: 'Iframe title',
      channelTitle: 'Iframe author',
      duration: 101
    })
    expect(iframe).toMatchObject({ title: 'Iframe title', channelTitle: 'Iframe author', duration: 101, source: 'iframe' })
  })

  it('lets Data API override saved/iframe while iframe fills missing API fields', () => {
    const iframe = mergeYouTubeMetadata(savedYouTubeMetadata(source), {
      videoId: source.videoId, source: 'iframe', title: 'Iframe title', duration: 101
    })
    const api = mergeYouTubeMetadata(iframe, {
      videoId: source.videoId, source: 'youtube-data-api', title: 'API title',
      channelTitle: 'Channel', description: 'Description'
    })
    const lateIframe = mergeYouTubeMetadata(api, {
      videoId: source.videoId, source: 'iframe', title: 'Stale iframe', duration: 102
    })
    expect(lateIframe.title).toBe('API title')
    expect(lateIframe.duration).toBe(102)
    expect(lateIframe.source).toBe('youtube-data-api')
  })

  it('never changes video identity', () => {
    const saved = savedYouTubeMetadata(source)
    expect(mergeYouTubeMetadata(saved, { videoId: 'aaaaaaaaaaa', source: 'youtube-data-api', title: 'Wrong' })).toBe(saved)
  })
})
