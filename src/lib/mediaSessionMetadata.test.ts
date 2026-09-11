import { describe, expect, it } from 'vitest'
import { localMediaSessionTitle, shouldPublishLocalMediaSession } from './mediaSessionMetadata'

describe('local Media Session metadata', () => {
  it('uses the local filename without its extension as the title', () => {
    expect(localMediaSessionTitle('C:\\Media\\episode.final.mp3')).toBe('episode.final')
    expect(localMediaSessionTitle('clip')).toBe('clip')
  })

  it('publishes only for an active local media source', () => {
    expect(shouldPublishLocalMediaSession('veil-media://clip', 'clip.mp4', false)).toBe(true)
    expect(shouldPublishLocalMediaSession(null, 'clip.mp4', false)).toBe(false)
    expect(shouldPublishLocalMediaSession('youtube://id', 'clip.mp4', true)).toBe(false)
  })
})
