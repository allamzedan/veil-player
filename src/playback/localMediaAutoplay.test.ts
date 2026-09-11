import { describe, expect, it, vi } from 'vitest'
import { armAuthoritativeMediaAutoplay } from './localMediaAutoplay'

class FakeMedia extends EventTarget {
  readyState = 0
  play = vi.fn<() => Promise<void>>(() => Promise.resolve())
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0
  }

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (callback) {
      const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
      listeners.add(callback)
      this.listeners.set(type, listeners)
    }
    super.addEventListener(type, callback, options)
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void {
    if (callback) this.listeners.get(type)?.delete(callback)
    super.removeEventListener(type, callback, options)
  }
}

function arm(element: FakeMedia, authoritativeRef: { current: FakeMedia | null }, callbacks: {
  onResolved?: () => void
  onRejected?: () => void
} = {}) {
  let attempted = false
  return armAuthoritativeMediaAutoplay({
    element: element as unknown as HTMLMediaElement,
    isAuthoritative: () => authoritativeRef.current === element,
    hasAttempted: () => attempted,
    markAttempted: () => { attempted = true },
    requestPlay: () => element.play(),
    ...callbacks
  })
}

describe('authoritative local media autoplay', () => {
  it('ignores stale canplay after M3 loses authority to M4', () => {
    const m3 = new FakeMedia()
    const m4 = new FakeMedia()
    const authoritativeRef = { current: m3 as FakeMedia | null }
    arm(m3, authoritativeRef)

    expect(m3.listenerCount('canplay')).toBe(1)
    authoritativeRef.current = m4
    m3.dispatchEvent(new Event('canplay'))

    expect(m3.play).not.toHaveBeenCalled()
    expect(authoritativeRef.current).toBe(m4)
    expect(m3.listenerCount('canplay')).toBe(0)
  })

  it('ignores stale play settlement after authority moves to M4', async () => {
    let resolvePlay!: () => void
    const pendingPlay = new Promise<void>((resolve) => { resolvePlay = resolve })
    const m3 = new FakeMedia()
    const m4 = new FakeMedia()
    m3.readyState = 3
    m3.play.mockReturnValueOnce(pendingPlay)
    const authoritativeRef = { current: m3 as FakeMedia | null }
    const onResolved = vi.fn()
    arm(m3, authoritativeRef, { onResolved })

    expect(m3.play).toHaveBeenCalledOnce()
    authoritativeRef.current = m4
    resolvePlay()
    await pendingPlay
    await Promise.resolve()

    expect(onResolved).not.toHaveBeenCalled()
    expect(authoritativeRef.current).toBe(m4)
  })

  it('autoplays the current authoritative element normally', async () => {
    const media = new FakeMedia()
    media.readyState = 3
    const authoritativeRef = { current: media as FakeMedia | null }
    const onResolved = vi.fn()
    arm(media, authoritativeRef, { onResolved })
    await Promise.resolve()

    expect(media.play).toHaveBeenCalledOnce()
    expect(onResolved).toHaveBeenCalledOnce()
  })

  it('prevents a temporary full-tree element from autoplaying after compact remount', () => {
    const temporaryFullTreeMedia = new FakeMedia()
    const compactMedia = new FakeMedia()
    const authoritativeRef = { current: temporaryFullTreeMedia as FakeMedia | null }
    const cleanup = arm(temporaryFullTreeMedia, authoritativeRef)

    authoritativeRef.current = compactMedia
    temporaryFullTreeMedia.dispatchEvent(new Event('canplay'))
    compactMedia.readyState = 3
    arm(compactMedia, authoritativeRef)
    cleanup()

    expect(temporaryFullTreeMedia.play).not.toHaveBeenCalled()
    expect(compactMedia.play).toHaveBeenCalledOnce()
    expect(temporaryFullTreeMedia.listenerCount('canplay')).toBe(0)
    expect(authoritativeRef.current).toBe(compactMedia)
  })
})
