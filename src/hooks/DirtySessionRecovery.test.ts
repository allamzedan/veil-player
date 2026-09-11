import { describe, expect, it } from 'vitest'
import type { SessionRecoverySnapshot } from '../../electron/lib/sessionRecoveryStore'
import { snapshotMatchesTrack } from './DirtySessionRecovery'

const localTrack = {
  version: '1.6.0',
  app: 'VEIL',
  video: {
    name: 'movie.mp4',
    duration: 60,
    fileSize: 1000,
    resolution: { width: 1280, height: 720 },
    fingerprint: { method: 'metadata-v1', value: 'movie-fingerprint' }
  },
  globalOffsetSeconds: 0,
  items: []
}

function snapshot(overrides: Partial<SessionRecoverySnapshot> = {}): SessionRecoverySnapshot {
  return {
    version: 1,
    savedAt: '2026-08-15T00:00:00.000Z',
    trackJson: JSON.stringify(localTrack),
    trackFilePath: 'C:\\tracks\\movie.veil',
    mediaIdentity: { kind: 'local', key: 'C:\\media\\movie.mp4' },
    ...overrides
  }
}

describe('dirty-session recovery identity', () => {
  it('accepts a local snapshot only for its named media context', () => {
    expect(snapshotMatchesTrack(snapshot())).toBe(true)
    expect(snapshotMatchesTrack(snapshot({
      mediaIdentity: { kind: 'local', key: 'C:\\media\\different.mp4' }
    }))).toBe(false)
  })

  it('accepts a YouTube snapshot only for the exact video id', () => {
    const trackJson = JSON.stringify({
      version: '1.6.0',
      app: 'VEIL',
      media: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      globalOffsetSeconds: 0,
      items: []
    })
    expect(snapshotMatchesTrack(snapshot({
      trackJson,
      mediaIdentity: { kind: 'youtube', key: 'dQw4w9WgXcQ' }
    }))).toBe(true)
    expect(snapshotMatchesTrack(snapshot({
      trackJson,
      mediaIdentity: { kind: 'youtube', key: 'aaaaaaaaaaa' }
    }))).toBe(false)
  })

  it('rejects malformed and future-schema recovery payloads', () => {
    expect(snapshotMatchesTrack(snapshot({ trackJson: '{ broken' }))).toBe(false)
    expect(snapshotMatchesTrack(snapshot({
      trackJson: JSON.stringify({ ...localTrack, version: '99.0.0' })
    }))).toBe(false)
  })
})
