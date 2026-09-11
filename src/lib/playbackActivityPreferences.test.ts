import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES,
  patchPlaybackActivityPreferences,
  readPlaybackActivityPreferences,
  resetPlaybackActivityPreferencesForTests
} from './playbackActivityPreferences'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
    key: vi.fn(),
    get length() { return values.size }
  }
}

beforeEach(() => vi.stubGlobal('localStorage', createStorage()))
afterEach(() => {
  resetPlaybackActivityPreferencesForTests()
  vi.unstubAllGlobals()
})

describe('playback activity preferences', () => {
  it('defaults fullscreen rail ON, range durations to 5s, and activity to 4s', () => {
    expect(readPlaybackActivityPreferences()).toEqual({
      showFullscreenVeilRail: true,
      defaultMaskDurationSeconds: 5,
      defaultMuteDurationSeconds: 5,
      defaultSkipDurationSeconds: 5,
      bookmarkActivityDurationMs: 4000
    })
  })

  it('persists rail visibility and validated authoring/activity values', () => {
    patchPlaybackActivityPreferences({
      showFullscreenVeilRail: false,
      defaultMaskDurationSeconds: 2.5,
      defaultMuteDurationSeconds: 3,
      defaultSkipDurationSeconds: 7,
      bookmarkActivityDurationMs: 8000
    })
    expect(readPlaybackActivityPreferences()).toEqual({
      showFullscreenVeilRail: false,
      defaultMaskDurationSeconds: 2.5,
      defaultMuteDurationSeconds: 3,
      defaultSkipDurationSeconds: 7,
      bookmarkActivityDurationMs: 8000
    })
  })

  it('clamps invalid values without changing product defaults', () => {
    patchPlaybackActivityPreferences({
      defaultMaskDurationSeconds: 0,
      defaultMuteDurationSeconds: Number.NaN,
      defaultSkipDurationSeconds: 99999,
      bookmarkActivityDurationMs: 50
    })
    const value = readPlaybackActivityPreferences()
    expect(value.defaultMaskDurationSeconds).toBe(0.1)
    expect(value.defaultMuteDurationSeconds).toBe(DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES.defaultMuteDurationSeconds)
    expect(value.defaultSkipDurationSeconds).toBe(3600)
    expect(value.bookmarkActivityDurationMs).toBe(1000)
  })
})
