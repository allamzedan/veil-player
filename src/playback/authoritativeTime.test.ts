import { describe, expect, it } from 'vitest'
import { createBookmarkItem } from '../lib/bookmarks'
import { resolveRelativeSeekTime } from '../lib/relativeSeek'
import { formatTime } from '../lib/time'
import {
  normalizePlaybackDuration,
  normalizePlaybackTime,
  playbackRatio,
  reconcileYouTubeSeekSample,
  resolveBookmarkTimestamp
} from './authoritativeTime'

describe('authoritative playback time', () => {
  it('A. propagates a YouTube sample to transport, timeline, and bookmark creation', () => {
    const centralTime = normalizePlaybackTime(73, 120)
    expect(centralTime).toBe(73)
    expect(formatTime(centralTime ?? 0)).toBe('1:13')
    expect(playbackRatio(centralTime ?? Number.NaN, 120)).toBeCloseTo(73 / 120)
    const bookmark = createBookmarkItem(resolveBookmarkTimestamp(centralTime ?? Number.NaN, 120)!)
    expect(bookmark.start).toBe(73)
    expect(bookmark.end).toBe(73)
  })

  it('C/E. makes immediate seek time authoritative and rejects the stale pre-seek poll', () => {
    const pendingSeek = { target: 73.25, requestedAt: 1000 }
    const stale = reconcileYouTubeSeekSample({
      sampleTime: 12,
      duration: 120,
      pendingSeek,
      now: 1100
    })
    expect(stale.time).toBeNull()
    expect(stale.pendingSeek).toEqual(pendingSeek)

    const confirmed = reconcileYouTubeSeekSample({
      sampleTime: 73.2,
      duration: 120,
      pendingSeek,
      now: 1250
    })
    expect(confirmed.time).toBe(73.2)
    expect(confirmed.pendingSeek).toBeNull()
  })

  it('C. eventually accepts the actual player time if YouTube resolves a seek elsewhere', () => {
    const result = reconcileYouTubeSeekSample({
      sampleTime: 70,
      duration: 120,
      pendingSeek: { target: 73, requestedAt: 1000 },
      now: 3000
    })
    expect(result).toEqual({ time: 70, pendingSeek: null })
  })

  it('E. preserves sub-second bookmark precision and clamps near the end', () => {
    expect(resolveBookmarkTimestamp(73.456, 120)).toBe(73.456)
    expect(resolveBookmarkTimestamp(120.4, 120)).toBe(120)
  })

  it('E. relative +10 uses the same current time and clamps to duration', () => {
    expect(resolveRelativeSeekTime({ currentTime: 73, duration: 120, offsetSeconds: 10 })).toBe(83)
    expect(resolveRelativeSeekTime({ currentTime: 116, duration: 120, offsetSeconds: 10 })).toBe(120)
  })

  it('F. unrelated Watch/Edit and Inspector state changes do not mutate playback time', () => {
    const playback = { currentTime: 73, mode: 'watch', inspectorCollapsed: false, summary: '' }
    const edited = { ...playback, mode: 'edit', inspectorCollapsed: true, summary: 'note' }
    expect(edited.currentTime).toBe(73)
  })

  it('H. rejects invalid clocks and never calculates a misleading ratio', () => {
    expect(normalizePlaybackTime(Number.NaN)).toBeNull()
    expect(normalizePlaybackTime(Number.POSITIVE_INFINITY)).toBeNull()
    expect(normalizePlaybackDuration(0)).toBeNull()
    expect(normalizePlaybackDuration(Number.NaN)).toBeNull()
    expect(playbackRatio(10, 0)).toBeNull()
    expect(playbackRatio(Number.NaN, 100)).toBeNull()
    expect(resolveBookmarkTimestamp(Number.NaN, 100)).toBeNull()
  })

  it('I. accepts native event time without introducing polling or rounding', () => {
    const nativeTimeUpdateEventValue = 42.875
    expect(normalizePlaybackTime(nativeTimeUpdateEventValue, 90)).toBe(42.875)
    expect(resolveBookmarkTimestamp(nativeTimeUpdateEventValue, 90)).toBe(42.875)
  })
})
