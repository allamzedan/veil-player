import { describe, expect, it } from 'vitest'
import { DISPLAY_RECENT_COUNT, recentLocalMediaKind, splitFilename, shouldRevealFilename } from './launcherRecentPresentation'

describe('launcher recent presentation', () => {
  it('allows exactly one additional visible recent media row', () => {
    expect(DISPLAY_RECENT_COUNT).toBe(4)
  })

  it('splits RTL stems from stable LTR extensions without changing text', () => {
    expect(splitFilename('ويلي - رحمة رياض.mp3')).toEqual({ stem: 'ويلي - رحمة رياض', extension: '.mp3' })
    expect(splitFilename('lesson.en.mp4')).toEqual({ stem: 'lesson.en', extension: '.mp4' })
    expect(splitFilename('نسخة.veil')).toEqual({ stem: 'نسخة', extension: '.veil' })
  })

  it('classifies local video/audio and leaves unsupported YouTube metadata alone', () => {
    expect(recentLocalMediaKind('clip.mp4')).toBe('video')
    expect(recentLocalMediaKind('lesson.mp3')).toBe('audio')
    expect(recentLocalMediaKind('remote')).toBeNull()
  })

  it('reveals only overflowing names and respects reduced motion', () => {
    expect(shouldRevealFilename(false, false)).toBe(false)
    expect(shouldRevealFilename(true, false)).toBe(true)
    expect(shouldRevealFilename(true, true)).toBe(false)
  })
})
