import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissPlaybackHud,
  showPlaybackHud,
  subscribePlaybackHud
} from './playbackHud'

describe('playbackHud', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    dismissPlaybackHud()
  })

  afterEach(() => {
    dismissPlaybackHud()
    vi.useRealTimers()
  })

  it('shows message to subscribers', () => {
    let last: string | null = null
    subscribePlaybackHud((state) => {
      last = state?.message ?? null
    })
    showPlaybackHud('Peek')
    expect(last).toBe('Peek')
  })

  it('extends timer for same message without re-fade', () => {
    const extendFlags: boolean[] = []
    subscribePlaybackHud((state) => {
      if (state) {
        extendFlags.push(state.extendOnly)
      }
    })
    showPlaybackHud('Replay')
    showPlaybackHud('Replay')
    expect(extendFlags).toEqual([false, true])
  })

  it('coalesces different messages within cooldown', () => {
    const messages: string[] = []
    subscribePlaybackHud((state) => {
      if (state?.message) {
        messages.push(state.message)
      }
    })
    showPlaybackHud('Peek')
    showPlaybackHud('Reveal')
    vi.advanceTimersByTime(150)
    expect(messages).toContain('Reveal')
  })
})
