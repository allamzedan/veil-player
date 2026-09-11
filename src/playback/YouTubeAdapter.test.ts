import { afterEach, describe, expect, it, vi } from 'vitest'
import { mapYouTubePlayerError, YouTubeAdapterError } from '../playback/PlaybackAdapter'
import {
  resetYouTubeIframeApiLoaderForTests,
  YouTubeAdapter
} from '../playback/YouTubeAdapter'

type FakeNode = {
  className: string
}

function createHost(): HTMLElement {
  const host = {
    children: [] as FakeNode[],
    replaceChildren(...nodes: FakeNode[]) {
      this.children = nodes
    },
    appendChild(node: FakeNode) {
      this.children.push(node)
      return node
    }
  }
  return host as unknown as HTMLElement
}

function installMockYtApi(): {
  playVideo: ReturnType<typeof vi.fn>
  pauseVideo: ReturnType<typeof vi.fn>
  seekTo: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  setVolume: ReturnType<typeof vi.fn>
  mute: ReturnType<typeof vi.fn>
  unMute: ReturnType<typeof vi.fn>
  getVolume: ReturnType<typeof vi.fn>
  getCurrentTime: ReturnType<typeof vi.fn>
  getDuration: ReturnType<typeof vi.fn>
  setPlaybackRate: ReturnType<typeof vi.fn>
  getAvailablePlaybackRates: ReturnType<typeof vi.fn>
  emitError: (code: number) => void
} {
  let errorHandler: ((event: { data: number }) => void) | undefined
  const api = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    destroy: vi.fn(),
    setVolume: vi.fn(),
    mute: vi.fn(),
    unMute: vi.fn(),
    isMuted: vi.fn(() => false),
    getVolume: vi.fn(() => 80),
    getCurrentTime: vi.fn(() => 12),
    getDuration: vi.fn(() => 120),
    setPlaybackRate: vi.fn(),
    getAvailablePlaybackRates: vi.fn(() => [0.5, 1, 1.5, 2])
  }

  const YT = {
    Player: class {
      constructor(
        _el: HTMLElement,
        options: {
          events?: {
            onReady?: (event: { target: typeof api }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) {
        errorHandler = options.events?.onError
        queueMicrotask(() => {
          options.events?.onReady?.({ target: api })
        })
        Object.assign(this, api)
      }
    }
  }

  vi.stubGlobal('window', {
    ...globalThis,
    YT,
    location: { origin: 'http://127.0.0.1:5173', href: 'http://127.0.0.1:5173/' },
    onYouTubeIframeAPIReady: undefined,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis)
  })

  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'div') {
        return { className: '' }
      }
      if (tag === 'script') {
        return { src: '', async: false, onerror: null }
      }
      return {}
    },
    querySelector: () => null,
    head: { appendChild: vi.fn() }
  })

  return { ...api, emitError: (code: number) => errorHandler?.({ data: code }) }
}

afterEach(() => {
  resetYouTubeIframeApiLoaderForTests()
  vi.unstubAllGlobals()
})

describe('mapYouTubePlayerError', () => {
  it('maps embedding and identity errors', () => {
    expect(mapYouTubePlayerError(101).code).toBe('embedding_disabled')
    expect(mapYouTubePlayerError(150).code).toBe('embedding_disabled')
    expect(mapYouTubePlayerError(153).code).toBe('error_153')
    expect(mapYouTubePlayerError(100).code).toBe('unavailable')
    expect(mapYouTubePlayerError(5).code).toBe('player_failure')
  })
})

describe('YouTubeAdapter lifecycle', () => {
  it('loads, plays, pauses, seeks, then destroys', async () => {
    const api = installMockYtApi()
    const host = createHost()
    const adapter = new YouTubeAdapter({
      hostElement: host,
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })

    await adapter.load()
    adapter.play()
    adapter.pause()
    adapter.seekTo(42)
    expect(api.playVideo).toHaveBeenCalledOnce()
    expect(api.pauseVideo).toHaveBeenCalledOnce()
    expect(api.seekTo).toHaveBeenCalledWith(42, true)
    expect(adapter.getCurrentTime()).toBe(12)
    expect(adapter.getDuration()).toBe(120)
    expect(adapter.getAvailablePlaybackRates()).toEqual([0.5, 1, 1.5, 2])
    adapter.setPlaybackRate(1.5)
    expect(api.setPlaybackRate).toHaveBeenCalledWith(1.5)
    adapter.setMuted(true)
    adapter.setMuted(false)
    expect(api.mute).toHaveBeenCalledOnce()
    expect(api.unMute).toHaveBeenCalledTimes(2)

    adapter.destroy()
    expect(api.destroy).toHaveBeenCalledOnce()
    expect(() => adapter.play()).toThrow(YouTubeAdapterError)
  })

  it('retains requested volume and mute before Ready and converts only at the iframe boundary', async () => {
    const api = installMockYtApi()
    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })

    adapter.setVolume(0.37)
    adapter.setMuted(true)
    await adapter.load()

    expect(api.setVolume).toHaveBeenCalledOnce()
    expect(api.setVolume).toHaveBeenCalledWith(0)
    expect(api.mute).toHaveBeenCalledOnce()
    expect(api.unMute).not.toHaveBeenCalled()
    expect(adapter.getVolume()).toBe(0.37)

    adapter.setMuted(false)
    adapter.setVolume(2)
    adapter.setVolume(-1)
    expect(api.setVolume).toHaveBeenNthCalledWith(2, 37)
    expect(api.setVolume).toHaveBeenNthCalledWith(3, 100)
    expect(api.setVolume).toHaveBeenNthCalledWith(4, 0)
    expect(api.mute).toHaveBeenCalledTimes(2)
  })

  it('mutes at exact zero and restores the newly requested non-zero volume', async () => {
    const api = installMockYtApi()
    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })
    await adapter.load()
    api.setVolume.mockClear()
    api.mute.mockClear()
    api.unMute.mockClear()

    adapter.setVolume(0)
    expect(api.setVolume).toHaveBeenLastCalledWith(0)
    expect(api.mute).toHaveBeenCalledOnce()

    adapter.setMuted(false)
    adapter.setVolume(0.25)
    expect(api.unMute).toHaveBeenCalledOnce()
    expect(api.setVolume).toHaveBeenLastCalledWith(25)
  })

  it('retains a non-zero volume across explicit mute and unmute', async () => {
    const api = installMockYtApi()
    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })
    adapter.setVolume(0.42)
    adapter.setMuted(true)
    await adapter.load()

    expect(api.setVolume).toHaveBeenLastCalledWith(0)
    expect(api.mute).toHaveBeenCalledOnce()
    adapter.setMuted(false)
    expect(api.unMute).toHaveBeenCalledOnce()
    expect(api.setVolume).toHaveBeenLastCalledWith(42)
  })

  it('surfaces API construction failure', async () => {
    vi.stubGlobal('window', {
      ...globalThis,
      location: { origin: 'http://127.0.0.1:5173', href: 'http://127.0.0.1:5173/' },
      YT: {
        Player: class {
          constructor() {
            throw new Error('boom')
          }
        }
      },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis)
    })
    vi.stubGlobal('document', {
      createElement: () => ({ className: '' }),
      querySelector: () => null,
      head: { appendChild: vi.fn() }
    })

    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })

    await expect(adapter.load()).rejects.toBeInstanceOf(YouTubeAdapterError)
  })

  it('reports a post-Ready iframe failure exactly once', async () => {
    const api = installMockYtApi()
    const onError = vi.fn()
    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      onError
    })
    await adapter.load()
    api.emitError(100)
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'unavailable' })
  })

  it('rejects when destroyed before ready settles', async () => {
    installMockYtApi()
    const adapter = new YouTubeAdapter({
      hostElement: createHost(),
      source: {
        kind: 'youtube',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    })
    const pending = adapter.load()
    adapter.destroy()
    await expect(pending).rejects.toBeInstanceOf(YouTubeAdapterError)
  })
})
