import { describe, expect, it, vi } from 'vitest'
import { LocalMediaOwnership, type LocalMediaOwnershipCallbacks } from './localMediaOwnership'
import { useVeilStore } from '../state/useVeilStore'

class FakeMedia extends EventTarget {
  currentTime = 0
  duration = 120
  paused = true
  ended = false
  pause = vi.fn(() => { this.paused = true })
  play = vi.fn(async () => { this.paused = false })
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

function createHarness() {
  const mediaRef = { current: null as FakeMedia | null }
  const ownership = new LocalMediaOwnership(
    mediaRef as unknown as { current: HTMLMediaElement | null }
  )
  let playhead = -1
  let playing = false
  const callbacks: LocalMediaOwnershipCallbacks = {
    onActivate: (media) => { playhead = media.currentTime },
    onPlay: () => { playing = true },
    onPause: () => { playing = false },
    onSeeked: () => { playhead = mediaRef.current?.currentTime ?? playhead },
    onTimeUpdate: () => { playhead = mediaRef.current?.currentTime ?? playhead },
    onDurationChange: vi.fn(),
    onEnded: () => { playing = false }
  }
  const activate = (media: FakeMedia | null) => ownership.setActiveLocalMediaElement(
    media as unknown as HTMLMediaElement | null,
    callbacks
  )
  const toggle = async () => {
    const media = mediaRef.current
    if (!media) return
    if (media.paused) await media.play()
    else media.pause()
  }
  const seek = (time: number) => {
    if (mediaRef.current) mediaRef.current.currentTime = time
  }
  return {
    mediaRef,
    activate,
    toggle,
    seek,
    get playhead() { return playhead },
    get playing() { return playing }
  }
}

describe('single authoritative local media ownership', () => {
  it.each(['video', 'audio'])('opens %s directly and synchronizes its time immediately', () => {
    const app = createHarness()
    const media = new FakeMedia()
    media.currentTime = 4.5
    app.activate(media)
    expect(app.mediaRef.current).toBe(media)
    expect(app.playhead).toBe(4.5)
    expect(media.listenerCount('timeupdate')).toBe(1)
  })

  it('does not duplicate subscriptions when React repeats the same callback ref', () => {
    const app = createHarness()
    const media = new FakeMedia()
    app.activate(media)
    app.activate(media)
    expect(media.listenerCount('timeupdate')).toBe(1)
    expect(media.pause).not.toHaveBeenCalled()
  })

  it('keeps selection actions from changing active local media ownership', () => {
    const app = createHarness()
    const media = new FakeMedia()
    app.activate(media)

    useVeilStore.getState().addMask(0, 1)
    const selectedId = useVeilStore.getState().selectedItemId
    expect(selectedId).not.toBeNull()
    useVeilStore.getState().toggleSelectedItem(selectedId!, 'mask')

    expect(app.mediaRef.current).toBe(media)
    expect(media.pause).not.toHaveBeenCalled()
    expect(media.listenerCount('timeupdate')).toBe(1)
  })

  it.each([['video', 'audio'], ['audio', 'video']])(
    'switches %s to %s and revokes the outgoing clock',
    (_from, _to) => {
      const app = createHarness()
      const outgoing = new FakeMedia()
      const incoming = new FakeMedia()
      outgoing.currentTime = 18
      incoming.currentTime = 3
      app.activate(outgoing)
      outgoing.dispatchEvent(new Event('timeupdate'))
      app.activate(incoming)

      expect(outgoing.pause).toHaveBeenCalledOnce()
      expect(outgoing.listenerCount('timeupdate')).toBe(0)
      expect(incoming.listenerCount('timeupdate')).toBe(1)
      expect(app.mediaRef.current).toBe(incoming)
      expect(app.playhead).toBe(3)

      outgoing.currentTime = 91
      outgoing.dispatchEvent(new Event('timeupdate'))
      expect(app.playhead).toBe(3)
      incoming.currentTime = 7
      incoming.dispatchEvent(new Event('timeupdate'))
      expect(app.playhead).toBe(7)
    }
  )

  it.each([false, true])('targets incoming transport after a playing=%s switch', async (wasPlaying) => {
    const app = createHarness()
    const outgoing = new FakeMedia()
    const incoming = new FakeMedia()
    outgoing.paused = !wasPlaying
    app.activate(outgoing)
    app.activate(incoming)

    await app.toggle()
    app.seek(44)
    await app.toggle()

    expect(incoming.play).toHaveBeenCalledOnce()
    expect(incoming.pause).toHaveBeenCalledOnce()
    expect(incoming.currentTime).toBe(44)
    expect(outgoing.play).not.toHaveBeenCalled()
    expect(outgoing.pause).toHaveBeenCalledOnce()
  })

  it('does not accumulate active elements or clocks over 20 alternating transitions', () => {
    const app = createHarness()
    const elements = Array.from({ length: 21 }, () => new FakeMedia())
    for (const [index, media] of elements.entries()) {
      media.currentTime = index
      app.activate(media)
      media.dispatchEvent(new Event('timeupdate'))
      expect(app.mediaRef.current).toBe(media)
      expect(app.playhead).toBe(index)
      expect(elements.filter((candidate) => candidate.listenerCount('timeupdate') === 1)).toEqual([media])
    }
    for (const outgoing of elements.slice(0, -1)) {
      expect(outgoing.pause).toHaveBeenCalledOnce()
      outgoing.currentTime = 999
      outgoing.dispatchEvent(new Event('timeupdate'))
    }
    expect(app.playhead).toBe(20)
    expect(elements.at(-1)?.pause).not.toHaveBeenCalled()
  })
})
