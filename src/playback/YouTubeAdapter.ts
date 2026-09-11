import type { YouTubeMediaSource } from '../types/mediaSource'
import {
  mapYouTubePlayerError,
  type PlaybackAdapter,
  YouTubeAdapterError
} from './PlaybackAdapter'

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

type YtPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  setPlaybackRate: (rate: number) => void
  getAvailablePlaybackRates: () => number[]
  destroy: () => void
  getPlayerState?: () => number
  getVideoData?: () => {
    video_id?: string
    title?: string
    author?: string
  }
}

export interface YouTubeIframeMetadata {
  videoId: string
  title?: string
  channelTitle?: string
  duration?: number
}

type YtNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string
      width?: string | number
      height?: string | number
      host?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YtPlayer }) => void
        onError?: (event: { data: number }) => void
        onStateChange?: (event: { data: number }) => void
      }
    }
  ) => YtPlayer
  PlayerState?: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

export type YouTubeAdapterOptions = {
  hostElement: HTMLElement
  source: YouTubeMediaSource
  /** Prefer youtube.com; nocookie can be tried if Error 153 appears. */
  host?: 'https://www.youtube.com' | 'https://www.youtube-nocookie.com'
  /**
   * Origin announced to the IFrame API.
   * Must match the page origin for postMessage. Packaged Electron serves the
   * renderer from http://127.0.0.1:<ephemeral-port>; Vite DEV uses its loopback URL.
   */
  apiOrigin?: string
  onError?: (error: YouTubeAdapterError) => void
  onReady?: () => void
}

function resolveDefaultApiOrigin(): string {
  if (typeof window === 'undefined' || !window.location) {
    return 'https://www.youtube.com'
  }
  const origin = window.location.origin
  if (typeof origin === 'string' && /^https?:\/\//i.test(origin) && origin !== 'null') {
    return origin
  }
  return 'https://www.youtube.com'
}

let iframeApiPromise: Promise<YtNamespace> | null = null

export function resetYouTubeIframeApiLoaderForTests(): void {
  iframeApiPromise = null
}

function loadYouTubeIframeApi(): Promise<YtNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new YouTubeAdapterError('api_load_failed', 'No window for IFrame API.'))
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (iframeApiPromise) {
    return iframeApiPromise
  }

  iframeApiPromise = new Promise<YtNamespace>((resolve, reject) => {
    const prior = window.onYouTubeIframeAPIReady
    const timeout = window.setTimeout(() => {
      reject(new YouTubeAdapterError('api_load_failed', 'Timed out loading YouTube IFrame API.'))
    }, 20000)

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout)
      if (typeof prior === 'function') {
        try {
          prior()
        } catch {
          // ignore prior listener failures
        }
      }
      if (window.YT?.Player) {
        resolve(window.YT)
      } else {
        reject(new YouTubeAdapterError('api_load_failed', 'YouTube IFrame API ready without YT.Player.'))
      }
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${IFRAME_API_SRC}"]`)
    if (!existing) {
      const script = document.createElement('script')
      script.src = IFRAME_API_SRC
      script.async = true
      script.onerror = () => {
        window.clearTimeout(timeout)
        iframeApiPromise = null
        reject(new YouTubeAdapterError('api_load_failed', 'Failed to download YouTube IFrame API script.'))
      }
      document.head.appendChild(script)
    }
  }).catch((error) => {
    iframeApiPromise = null
    throw error
  })

  return iframeApiPromise
}

/**
 * Official YouTube IFrame Player API adapter.
 * Controls stay outside the iframe; this class only drives the API surface.
 */
export class YouTubeAdapter implements PlaybackAdapter {
  private readonly hostElement: HTMLElement
  private readonly source: YouTubeMediaSource
  private readonly host: string
  private readonly apiOrigin: string
  private readonly onError?: (error: YouTubeAdapterError) => void
  private readonly onReadyCb?: () => void

  private player: YtPlayer | null = null
  private destroyed = false
  private ready = false
  private volume = 100
  private muted = false

  constructor(options: YouTubeAdapterOptions) {
    this.hostElement = options.hostElement
    this.source = options.source
    this.host = options.host ?? 'https://www.youtube.com'
    this.apiOrigin = options.apiOrigin ?? resolveDefaultApiOrigin()
    this.onError = options.onError
    this.onReadyCb = options.onReady
  }

  async load(): Promise<void> {
    if (this.destroyed) {
      throw new YouTubeAdapterError('destroyed', 'Adapter was destroyed.')
    }

    const YT = await loadYouTubeIframeApi()
    if (this.destroyed) {
      throw new YouTubeAdapterError('destroyed', 'Adapter was destroyed during API load.')
    }

    this.hostElement.replaceChildren()
    const mount = document.createElement('div')
    mount.className = 'youtube-adapter__mount'
    this.hostElement.appendChild(mount)

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const fail = (error: YouTubeAdapterError): void => {
        if (settled) {
          return
        }
        settled = true
        reject(error)
      }

      try {
        this.player = new YT.Player(mount, {
          videoId: this.source.videoId,
          width: '100%',
          height: '100%',
          host: this.host,
          playerVars: {
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
            modestbranding: 0,
            rel: 0,
            playsinline: 1,
            origin: this.apiOrigin
          },
          events: {
            onReady: () => {
              if (this.destroyed) {
                fail(new YouTubeAdapterError('destroyed', 'Adapter destroyed before ready.'))
                return
              }
              this.ready = true
              this.applyVolumeState()
              this.onReadyCb?.()
              if (!settled) {
                settled = true
                resolve()
              }
            },
            onError: (event) => {
              const mapped = mapYouTubePlayerError(event.data)
              if (settled) {
                this.onError?.(mapped)
              } else {
                fail(mapped)
              }
            }
          }
        })
      } catch (error) {
        fail(
          new YouTubeAdapterError(
            'init_failed',
            error instanceof Error ? error.message : 'Failed to construct YT.Player.'
          )
        )
      }
    })
  }

  play(): void {
    this.ensureLive().playVideo()
  }

  pause(): void {
    this.ensureLive().pauseVideo()
  }

  seekTo(seconds: number): void {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
    this.ensureLive().seekTo(safe, true)
  }

  getCurrentTime(): number {
    if (!this.player || !this.ready) {
      return Number.NaN
    }
    try {
      const value = this.player.getCurrentTime()
      return Number.isFinite(value) ? value : Number.NaN
    } catch {
      return Number.NaN
    }
  }

  getDuration(): number {
    if (!this.player || !this.ready) {
      return Number.NaN
    }
    try {
      const value = this.player.getDuration()
      return Number.isFinite(value) ? value : Number.NaN
    } catch {
      return Number.NaN
    }
  }

  getMetadata(): YouTubeIframeMetadata | null {
    if (!this.player || !this.ready) return null
    try {
      const data = this.player.getVideoData?.()
      const videoId = data?.video_id || this.source.videoId
      if (videoId !== this.source.videoId) return null
      const duration = this.getDuration()
      return {
        videoId,
        ...(data?.title?.trim() ? { title: data.title.trim() } : {}),
        ...(data?.author?.trim() ? { channelTitle: data.author.trim() } : {}),
        ...(Number.isFinite(duration) && duration > 0 ? { duration } : {})
      }
    } catch {
      return null
    }
  }

  getPlaying(): boolean | null {
    if (!this.player || !this.ready || typeof this.player.getPlayerState !== 'function') {
      return null
    }
    try {
      const state = this.player.getPlayerState()
      return state === 1 ? true : state === 2 || state === 0 || state === 5 ? false : null
    } catch {
      return null
    }
  }

  setVolume(volume: number): void {
    const next = Math.round(Math.min(1, Math.max(0, volume)) * 100)
    this.volume = next
    this.applyVolumeState()
  }

  getVolume(): number {
    if (this.muted || this.volume === 0) {
      return this.volume / 100
    }
    if (this.player && this.ready) {
      try {
        const value = this.player.getVolume()
        if (Number.isFinite(value)) {
          this.volume = value
          return value / 100
        }
      } catch {
        // fall through
      }
    }
    return this.volume / 100
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyVolumeState()
  }

  isMuted(): boolean {
    if (this.player && this.ready) {
      try {
        this.muted = Boolean(this.player.isMuted())
      } catch {
        // fall through
      }
    }
    return this.muted
  }

  setPlaybackRate(rate: number): void {
    if (!this.player || !this.ready) {
      return
    }
    const available = this.getAvailablePlaybackRates()
    if (!available.includes(rate)) {
      return
    }
    try {
      this.player.setPlaybackRate(rate)
    } catch {
      // ignore unsupported rates
    }
  }

  getAvailablePlaybackRates(): number[] {
    if (!this.player || !this.ready) {
      return [1]
    }
    try {
      const rates = this.player.getAvailablePlaybackRates()
      return Array.isArray(rates) && rates.length > 0 ? rates : [1]
    } catch {
      return [1]
    }
  }

  destroy(): void {
    this.destroyed = true
    this.ready = false
    try {
      this.player?.destroy()
    } catch {
      // ignore
    }
    this.player = null
    this.hostElement.replaceChildren()
  }

  private ensureLive(): YtPlayer {
    if (this.destroyed || !this.player || !this.ready) {
      throw new YouTubeAdapterError('destroyed', 'YouTube player is not ready.')
    }
    return this.player
  }

  private applyVolumeState(): void {
    if (!this.player || !this.ready) {
      return
    }
    try {
      if (this.muted || this.volume === 0) {
        this.player.setVolume(0)
        this.player.mute()
      } else {
        this.player.unMute()
        this.player.setVolume(this.volume)
      }
    } catch {
      // ignore transient iframe API failures
    }
  }
}
