import { beforeEach, describe, expect, it } from 'vitest'
import type { YouTubeMediaSource } from '../types/mediaSource'
import { buildVeilTrackFromStore } from '../lib/trackSerialization'
import { useVeilStore } from './useVeilStore'

const sourceA: YouTubeMediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}

const sourceB: YouTubeMediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'aaaaaaaaaaa',
  canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
}

describe('youtubeLoadGeneration lifecycle', () => {
  beforeEach(() => {
    useVeilStore.getState().clearVideo()
  })

  it('bumps when opening a new YouTube identity', () => {
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(0)
    useVeilStore.getState().openYouTubeMedia(sourceA)
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(1)
    useVeilStore.getState().openYouTubeMedia(sourceB)
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(2)
    expect(useVeilStore.getState().mediaSource).toMatchObject({
      videoId: 'aaaaaaaaaaa'
    })
  })

  it('does not bump on same-identity reopen without reload (matching-source apply)', () => {
    useVeilStore.getState().openYouTubeMedia(sourceB)
    const gen = useVeilStore.getState().youtubeLoadGeneration
    useVeilStore.getState().openYouTubeMedia({ ...sourceB, duration: 99 })
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(gen)
  })

  it('bumps on same-identity force reload (mismatch Retry)', () => {
    useVeilStore.getState().openYouTubeMedia(sourceB)
    const gen = useVeilStore.getState().youtubeLoadGeneration
    useVeilStore.getState().openYouTubeMedia(sourceB, { reload: true })
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(gen + 1)
    expect(useVeilStore.getState().mediaSource).toMatchObject({
      videoId: 'aaaaaaaaaaa',
      canonicalUrl: sourceB.canonicalUrl
    })
  })

  it('does not bump when setMediaSource patches duration (normal playback)', () => {
    useVeilStore.getState().openYouTubeMedia(sourceA)
    const gen = useVeilStore.getState().youtubeLoadGeneration
    const current = useVeilStore.getState().mediaSource
    useVeilStore.getState().setMediaSource({
      ...(current as YouTubeMediaSource),
      duration: 212
    })
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(gen)
  })

  it('is lifecycle-only and never serialized into .veil media', () => {
    useVeilStore.getState().openYouTubeMedia(sourceA, { reload: true })
    useVeilStore.getState().openYouTubeMedia(sourceA, { reload: true })
    expect(useVeilStore.getState().youtubeLoadGeneration).toBeGreaterThan(1)
    const track = buildVeilTrackFromStore(useVeilStore.getState())
    expect(track?.media).toBeTruthy()
    expect(JSON.stringify(track)).not.toContain('youtubeLoadGeneration')
    expect(JSON.stringify(track)).not.toContain('loadGeneration')
    if (track?.media && track.media.kind === 'youtube') {
      expect(track.media.videoId).toBe('dQw4w9WgXcQ')
    }
  })

  it('resets on clearVideo and local setVideoSource', () => {
    useVeilStore.getState().openYouTubeMedia(sourceA)
    expect(useVeilStore.getState().youtubeLoadGeneration).toBeGreaterThan(0)
    useVeilStore.getState().clearVideo()
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(0)
    useVeilStore.getState().openYouTubeMedia(sourceB)
    useVeilStore
      .getState()
      .setVideoSource('veil-approved://1', 'clip.mp4', 'protocol', 10, 'C:\\a.mp4', 'video')
    expect(useVeilStore.getState().youtubeLoadGeneration).toBe(0)
  })
})
