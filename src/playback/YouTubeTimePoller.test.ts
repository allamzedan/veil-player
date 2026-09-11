import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YouTubeTimePoller, YOUTUBE_TIME_POLL_MS } from './YouTubeTimePoller'

function reader(state: { time: number; duration: number; playing: boolean | null }) {
  return {
    getCurrentTime: () => state.time,
    getDuration: () => state.duration,
    getPlaying: () => state.playing
  }
}

describe('YouTubeTimePoller lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('B/D. publishes immediately, advances, freezes while paused, and sees iframe seeks', () => {
    const state = { time: 73, duration: 120, playing: true as boolean | null }
    const samples: number[] = []
    const poller = new YouTubeTimePoller((sample) => samples.push(sample.currentTime))
    poller.start(reader(state) as never)
    expect(samples).toEqual([73])

    state.time = 74
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    expect(samples.at(-1)).toBe(74)

    state.playing = false
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    expect(samples.at(-1)).toBe(74)

    state.time = 95
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    expect(samples.at(-1)).toBe(95)
  })

  it('G. owns exactly one interval and clears it on stop/destroy/close', () => {
    const state = { time: 0, duration: 120, playing: false as boolean | null }
    const poller = new YouTubeTimePoller(() => {})
    poller.start(reader(state) as never)
    expect(vi.getTimerCount()).toBe(1)
    poller.start(reader(state) as never)
    expect(vi.getTimerCount()).toBe(1)
    poller.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('G. ignores stale ticks after source replacement and remount', () => {
    const first = { time: 10, duration: 100, playing: true as boolean | null }
    const second = { time: 80, duration: 100, playing: true as boolean | null }
    const samples: number[] = []
    const poller = new YouTubeTimePoller((sample) => samples.push(sample.currentTime))
    poller.start(reader(first) as never)
    poller.start(reader(second) as never)
    first.time = 11
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    expect(samples).toEqual([10, 80, 80])
  })

  it('H. emits no sample for unavailable or invalid live timing', () => {
    const samples: number[] = []
    const poller = new YouTubeTimePoller((sample) => samples.push(sample.currentTime))
    poller.start(reader({ time: Number.NaN, duration: 0, playing: null }) as never)
    vi.advanceTimersByTime(YOUTUBE_TIME_POLL_MS)
    expect(samples).toEqual([])
  })
})
