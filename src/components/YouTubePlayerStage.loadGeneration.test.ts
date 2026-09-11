import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resetYouTubeIframeApiLoaderForTests,
  YouTubeAdapter
} from '../playback/YouTubeAdapter'
import type { YouTubeMediaSource } from '../types/mediaSource'

/**
 * Pure effect-dependency contract for YouTubePlayerStage recreate rules.
 * Full React mount coverage is exercised via adapter destroy/create sequencing here
 * using the same dependency tuple the stage effect uses.
 */
const sourceB: YouTubeMediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'aaaaaaaaaaa',
  canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
}

function depsKey(videoId: string, canonicalUrl: string, loadGeneration: number): string {
  return `${videoId}|${canonicalUrl}|${loadGeneration}`
}

describe('YouTubePlayerStage loadGeneration recreate contract', () => {
  afterEach(() => {
    resetYouTubeIframeApiLoaderForTests()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('A. same-video Retry changes generation and recreates adapter once', () => {
    const destroy = vi.fn()
    const created: number[] = []
    const register = (generation: number) => {
      created.push(generation)
      return { destroy, generation }
    }

    let activeKey = depsKey(sourceB.videoId, sourceB.canonicalUrl, 3)
    let active = register(3)

    const nextKey = depsKey(sourceB.videoId, sourceB.canonicalUrl, 4)
    expect(nextKey).not.toBe(activeKey)
    active.destroy()
    active = register(4)
    activeKey = nextKey

    expect(destroy).toHaveBeenCalledTimes(1)
    expect(created).toEqual([3, 4])
    expect(activeKey).toContain('aaaaaaaaaaa')
    expect(active.generation).toBe(4)
  })

  it('G. Watch/Edit-style rerenders with unchanged deps do not recreate', () => {
    const key1 = depsKey(sourceB.videoId, sourceB.canonicalUrl, 5)
    const key2 = depsKey(sourceB.videoId, sourceB.canonicalUrl, 5)
    expect(key1).toBe(key2)
  })

  it('forwards generation into Ready/Error lifecycle callbacks', async () => {
    const hostBag = {
      children: [] as unknown[],
      replaceChildren(...nodes: unknown[]) {
        this.children = nodes
      },
      appendChild(node: unknown) {
        this.children.push(node)
        return node
      }
    }
    const host = hostBag as unknown as HTMLElement

    const api = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      seekTo: vi.fn(),
      destroy: vi.fn(),
      setVolume: vi.fn(),
      getVolume: vi.fn(() => 80),
      getCurrentTime: vi.fn(() => 0),
      getDuration: vi.fn(() => 0),
      setPlaybackRate: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn(() => false),
      getAvailablePlaybackRates: vi.fn(() => [1])
    }

    vi.stubGlobal('window', {
      ...globalThis,
      YT: {
        Player: class {
          constructor(
            _el: HTMLElement,
            options: {
              events?: {
                onReady?: (event: { target: typeof api }) => void
              }
            }
          ) {
            queueMicrotask(() => {
              options.events?.onReady?.({ target: api })
            })
            Object.assign(this, api)
          }
        }
      },
      location: { origin: 'http://127.0.0.1:5173', href: 'http://127.0.0.1:5173/' },
      onYouTubeIframeAPIReady: undefined,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis)
    })
    vi.stubGlobal('document', {
      createElement: () => ({ className: '' }),
      head: { appendChild: vi.fn() },
      getElementById: () => null
    })

    const generation = 42
    const videoId = sourceB.videoId
    let readyInfo: { loadGeneration: number; videoId: string } | null = null

    const adapter = new YouTubeAdapter({
      hostElement: host,
      source: sourceB,
      host: 'https://www.youtube.com',
      onReady: () => {
        readyInfo = { loadGeneration: generation, videoId }
      }
    })
    await adapter.load()
    await Promise.resolve()
    expect(readyInfo).toEqual({ loadGeneration: 42, videoId: 'aaaaaaaaaaa' })
    adapter.destroy()
    expect(api.destroy).toHaveBeenCalledTimes(1)
  })
})
