import { beforeEach, describe, expect, it } from 'vitest'
import { useVeilStore } from './useVeilStore'

const sourceA = { kind: 'youtube' as const, provider: 'youtube' as const, videoId: 'dQw4w9WgXcQ', canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
const sourceB = { kind: 'youtube' as const, provider: 'youtube' as const, videoId: 'aaaaaaaaaaa', canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', title: 'Saved B' }

describe('YouTube metadata stale response protection', () => {
  beforeEach(() => useVeilStore.getState().clearVideo())

  it('ignores A after switching to B and retains B', () => {
    useVeilStore.getState().openYouTubeMedia(sourceA)
    useVeilStore.getState().setYouTubeMetadataLoading(sourceA.videoId)
    useVeilStore.getState().openYouTubeMedia(sourceB)
    useVeilStore.getState().mergeYouTubeMetadata({ videoId: sourceA.videoId, source: 'youtube-data-api', title: 'Late A' })
    expect(useVeilStore.getState().youtubeMetadata).toMatchObject({ videoId: sourceB.videoId, title: 'Saved B' })
  })
})
