import { describe, expect, it } from 'vitest'
import { shouldDefaultInspectorToVeilTools } from './inspectorDefault'

describe('local Edit VEIL Inspector default', () => {
  it('defaults local video to the existing VEIL Tools view', () => {
    expect(shouldDefaultInspectorToVeilTools(
      { kind: 'local', path: 'movie.mp4', mediaType: 'video' },
      'video'
    )).toBe(true)
  })

  it('keeps YouTube on Navigate', () => {
    expect(shouldDefaultInspectorToVeilTools({
      kind: 'youtube', provider: 'youtube', videoId: 'abcdefghijk',
      canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk'
    }, 'video')).toBe(false)
  })

  it('preserves the local audio default', () => {
    expect(shouldDefaultInspectorToVeilTools(
      { kind: 'local', path: 'audio.mp3', mediaType: 'audio' },
      'audio'
    )).toBe(false)
  })
})
