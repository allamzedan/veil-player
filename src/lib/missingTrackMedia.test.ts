import { describe, expect, it } from 'vitest'
import { activateVerifiedLocatedTrackMedia, isValidLocatedTrackMedia } from './missingTrackMedia'

const expected = {
  name: 'movie.mp4',
  duration: 60,
  fileSize: 12345,
  resolution: { width: 1280, height: 720 },
  fingerprint: { method: 'metadata-v1' as const, value: 'fp' }
}

describe('missing track media recovery', () => {
  it('accepts a moved or renamed candidate only when its persisted size verifies', () => {
    expect(isValidLocatedTrackMedia(expected, {
      canceled: false,
      mediaUrl: 'veil-media://approved/1',
      name: 'renamed.mp4',
      size: 12345,
      filePath: 'D:\\Moved\\renamed.mp4'
    })).toBe(true)
  })

  it('rejects a candidate before activation when persisted identity does not verify', () => {
    expect(isValidLocatedTrackMedia(expected, {
      canceled: false,
      mediaUrl: 'veil-media://approved/2',
      name: 'different.mp4',
      size: 999,
      filePath: 'D:\\different.mp4'
    })).toBe(false)
  })

  it('uses the persisted filename when file size was unavailable', () => {
    const withoutSize = { ...expected, fileSize: null }
    expect(isValidLocatedTrackMedia(withoutSize, {
      canceled: false,
      mediaUrl: 'veil-media://approved/3',
      name: 'movie.mp4',
      size: 999,
      filePath: 'D:\\movie.mp4'
    })).toBe(true)
    expect(isValidLocatedTrackMedia(withoutSize, {
      canceled: false,
      mediaUrl: 'veil-media://approved/4',
      name: 'other.mp4',
      size: 999,
      filePath: 'D:\\other.mp4'
    })).toBe(false)
  })

  it('preserves annotations and activates media only after validation succeeds', () => {
    const session = { annotations: ['mask-1', 'bookmark-1'], activePath: null as string | null }
    const candidate = {
      canceled: false,
      mediaUrl: 'veil-media://approved/5',
      name: 'renamed.mp4',
      size: 12345,
      filePath: 'D:\\Moved\\renamed.mp4'
    }
    const activated = activateVerifiedLocatedTrackMedia(expected, candidate, (verified) => {
      session.activePath = verified.filePath ?? null
    })
    expect(activated).toBe(true)
    expect(session).toEqual({
      annotations: ['mask-1', 'bookmark-1'],
      activePath: 'D:\\Moved\\renamed.mp4'
    })

    const rejected = activateVerifiedLocatedTrackMedia(
      expected,
      { ...candidate, size: 999 },
      () => {
        session.annotations = []
      }
    )
    expect(rejected).toBe(false)
    expect(session.annotations).toEqual(['mask-1', 'bookmark-1'])
  })})
