import { describe, expect, it } from 'vitest'
import { YouTubeRangePlaybackGuard, resolveChainedSkipEnd } from './youtubeRangePlayback'
import type { MuteTrackItem, SkipTrackItem } from '../types/track'

const mute = (id: string, start: number, end: number): MuteTrackItem =>
  ({ id, type: 'mute', enabled: true, start, end })
const skip = (id: string, start: number, end: number): SkipTrackItem =>
  ({ id, type: 'skip', enabled: true, start, end })

function input(overrides: Partial<Parameters<YouTubeRangePlaybackGuard['reconcile']>[0]> = {}) {
  return {
    sourceKey: 'video-a',
    loadGeneration: 1,
    ready: true,
    currentTime: 0,
    duration: 120,
    playing: true,
    userMuted: false,
    volume: 0.5,
    globalOffsetSeconds: 0,
    mutes: [] as MuteTrackItem[],
    skips: [] as SkipTrackItem[],
    ...overrides
  }
}

describe('YouTube range playback reconciliation', () => {
  it('keeps range mute distinct from explicit mute and zero volume', () => {
    const guard = new YouTubeRangePlaybackGuard()
    const ranges = [mute('a', 10, 20), mute('b', 18, 30)]

    expect(guard.reconcile(input({ currentTime: 12, mutes: ranges }))).toMatchObject({
      rangeMuted: true,
      effectiveMuted: true
    })
    expect(guard.reconcile(input({ currentTime: 22, mutes: ranges })).rangeMuted).toBe(true)
    expect(guard.reconcile(input({ currentTime: 31, mutes: ranges }))).toMatchObject({
      rangeMuted: false,
      effectiveMuted: false
    })
    expect(guard.reconcile(input({ currentTime: 31, mutes: ranges, userMuted: true })).effectiveMuted).toBe(true)
    expect(guard.reconcile(input({ currentTime: 31, mutes: ranges, volume: 0 })).effectiveMuted).toBe(true)
  })

  it('reconciles seeking into and out of mute ranges only after Ready', () => {
    const guard = new YouTubeRangePlaybackGuard()
    const ranges = [mute('a', 10, 20)]
    expect(guard.reconcile(input({ ready: false, currentTime: 12, mutes: ranges })).rangeMuted).toBe(false)
    expect(guard.reconcile(input({ currentTime: 12, mutes: ranges })).activeMutes).toHaveLength(1)
    expect(guard.reconcile(input({ currentTime: 5, mutes: ranges })).activeMutes).toHaveLength(0)
  })

  it('resolves overlapping and adjacent skip ranges to one final target', () => {
    const ranges = [skip('a', 10, 20), skip('b', 18, 30), skip('c', 30, 40)]
    expect(resolveChainedSkipEnd([ranges[0]], ranges)).toBe(40)

    const guard = new YouTubeRangePlaybackGuard()
    expect(guard.reconcile(input({ currentTime: 10, skips: ranges })).skipTarget).toBe(40)
    expect(guard.reconcile(input({ currentTime: 10.25, skips: ranges })).skipTarget).toBeNull()
  })

  it('applies seek-into once, preserves paused semantics, and resets for explicit navigation', () => {
    const guard = new YouTubeRangePlaybackGuard()
    const ranges = [skip('a', 10, 20)]
    expect(guard.reconcile(input({ currentTime: 15, skips: ranges, playing: false })).skipTarget).toBeNull()
    expect(guard.reconcile(input({ currentTime: 15, skips: ranges })).skipTarget).toBe(20)
    expect(guard.reconcile(input({ currentTime: 15, skips: ranges })).skipTarget).toBeNull()
    guard.resetSkipLatch()
    expect(guard.reconcile(input({ currentTime: 15, skips: ranges })).skipTarget).toBe(20)
  })

  it('clears pending execution state on source or adapter-generation replacement', () => {
    const guard = new YouTubeRangePlaybackGuard()
    const ranges = [skip('a', 10, 20)]
    expect(guard.reconcile(input({ currentTime: 12, skips: ranges })).skipTarget).toBe(20)
    expect(guard.reconcile(input({ currentTime: 12, skips: ranges })).skipTarget).toBeNull()
    expect(guard.reconcile(input({ currentTime: 12, skips: ranges, loadGeneration: 2 })).skipTarget).toBe(20)
    expect(guard.reconcile(input({ sourceKey: 'video-b', currentTime: 12, skips: ranges })).skipTarget).toBe(20)
  })
})
