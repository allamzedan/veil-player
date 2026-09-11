import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { YouTubeMediaSource } from '../types/mediaSource'
import {
  YouTubeAdapterError,
  type YouTubeAdapterErrorCode
} from '../playback/PlaybackAdapter'
import { YouTubeAdapter } from '../playback/YouTubeAdapter'
import type { YouTubeIframeMetadata } from '../playback/YouTubeAdapter'
import {
  YouTubeTimePoller,
  type YouTubeTimingSample
} from '../playback/YouTubeTimePoller'

export interface YouTubePlayerStageHandle {
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
  setPlaybackRate: (rate: number) => void
  getAvailablePlaybackRates: () => number[]
  destroy: () => void
}

export interface YouTubePlayerStageProps {
  source: YouTubeMediaSource
  /**
   * Lifecycle-only player instance key. Changing this destroys the current adapter/iframe
   * and creates a fresh YouTubeAdapter even when videoId/canonicalUrl are unchanged.
   */
  loadGeneration: number
  onReady?: (info: { loadGeneration: number; videoId: string; metadata: YouTubeIframeMetadata | null }) => void
  onError?: (
    error: { code: YouTubeAdapterErrorCode | 'unknown'; message: string },
    info: { loadGeneration: number; videoId: string }
  ) => void
  onTimeUpdate?: (sample: YouTubeTimingSample) => void
  onPlayingChange?: (playing: boolean) => void
  volume?: number
  muted?: boolean
  playbackRate?: number
}

function syncControlled(
  adapter: YouTubeAdapter,
  volume: number | undefined,
  muted: boolean | undefined,
  playbackRate: number | undefined
): void {
  if (typeof volume === 'number' && Number.isFinite(volume)) {
    adapter.setVolume(volume)
  }
  if (typeof muted === 'boolean') {
    adapter.setMuted(muted)
  }
  if (typeof playbackRate === 'number' && Number.isFinite(playbackRate)) {
    adapter.setPlaybackRate(playbackRate)
  }
}

const YouTubePlayerStage = forwardRef<YouTubePlayerStageHandle, YouTubePlayerStageProps>(
  function YouTubePlayerStage(
    {
      source,
      loadGeneration,
      onReady,
      onError,
      onTimeUpdate,
      onPlayingChange,
      volume,
      muted,
      playbackRate
    },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement>(null)
    const adapterRef = useRef<YouTubeAdapter | null>(null)
    const pollerRef = useRef<YouTubeTimePoller | null>(null)
    const readyRef = useRef(false)
    const onReadyRef = useRef(onReady)
    const onErrorRef = useRef(onError)
    const onTimeUpdateRef = useRef(onTimeUpdate)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const volumeRef = useRef(volume)
    const mutedRef = useRef(muted)
    const playbackRateRef = useRef(playbackRate)

    onReadyRef.current = onReady
    onErrorRef.current = onError
    onTimeUpdateRef.current = onTimeUpdate
    onPlayingChangeRef.current = onPlayingChange
    volumeRef.current = volume
    mutedRef.current = muted
    playbackRateRef.current = playbackRate

    if (pollerRef.current === null) {
      pollerRef.current = new YouTubeTimePoller((sample) => {
        onTimeUpdateRef.current?.(sample)
        if (sample.playing !== null) {
          onPlayingChangeRef.current?.(sample.playing)
        }
      })
    }

    const clearPoll = (): void => {
      pollerRef.current?.stop()
    }

    const destroyAdapter = (): void => {
      clearPoll()
      readyRef.current = false
      adapterRef.current?.destroy()
      adapterRef.current = null
    }

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          adapterRef.current?.play()
          onPlayingChangeRef.current?.(true)
          pollerRef.current?.publishNow(false)
        },
        pause: () => {
          adapterRef.current?.pause()
          onPlayingChangeRef.current?.(false)
          pollerRef.current?.publishNow(false)
        },
        seekTo: (seconds: number) => {
          adapterRef.current?.seekTo(seconds)
        },
        getCurrentTime: () => adapterRef.current?.getCurrentTime() ?? 0,
        getDuration: () => adapterRef.current?.getDuration() ?? 0,
        setVolume: (next: number) => {
          adapterRef.current?.setVolume(next)
        },
        getVolume: () => adapterRef.current?.getVolume() ?? 1,
        setMuted: (next: boolean) => {
          adapterRef.current?.setMuted(next)
        },
        isMuted: () => adapterRef.current?.isMuted() ?? false,
        setPlaybackRate: (rate: number) => {
          adapterRef.current?.setPlaybackRate(rate)
        },
        getAvailablePlaybackRates: () => adapterRef.current?.getAvailablePlaybackRates() ?? [1],
        destroy: destroyAdapter
      }),
      []
    )

    useEffect(() => {
      const host = hostRef.current
      if (!host) {
        return
      }

      const generation = loadGeneration
      const videoId = source.videoId
      let cancelled = false
      // Destroy-before-recreate: at most one adapter/iframe for this host.
      destroyAdapter()

      const adapter = new YouTubeAdapter({
        hostElement: host,
        source,
        host: 'https://www.youtube.com',
        onError: (error) => {
          if (cancelled) {
            return
          }
          clearPoll()
          readyRef.current = false
          onErrorRef.current?.(
            { code: error.code, message: error.message },
            { loadGeneration: generation, videoId }
          )
        },
        onReady: () => {
          if (cancelled) {
            return
          }
          readyRef.current = true
          pollerRef.current?.start(adapter)
          onReadyRef.current?.({ loadGeneration: generation, videoId, metadata: adapter.getMetadata() })
        }
      })
      adapterRef.current = adapter
      syncControlled(
        adapter,
        volumeRef.current,
        mutedRef.current,
        undefined
      )

      void adapter
        .load()
        .then(() => {
          if (cancelled) {
            return
          }
          if (typeof playbackRateRef.current === 'number' && Number.isFinite(playbackRateRef.current)) {
            adapter.setPlaybackRate(playbackRateRef.current)
          }
        })
        .catch((error) => {
          if (cancelled) {
            return
          }
          if (error instanceof YouTubeAdapterError) {
            onErrorRef.current?.(
              { code: error.code, message: error.message },
              { loadGeneration: generation, videoId }
            )
          } else {
            onErrorRef.current?.(
              {
                code: 'unknown',
                message: error instanceof Error ? error.message : 'YouTube playback failed.'
              },
              { loadGeneration: generation, videoId }
            )
          }
        })

      return () => {
        cancelled = true
        destroyAdapter()
      }
      // Identity + explicit reload generation (mismatch Retry bumps generation only).
    }, [source.videoId, source.canonicalUrl, loadGeneration])

    useEffect(() => {
      const adapter = adapterRef.current
      if (!adapter) {
        return
      }
      syncControlled(adapter, volume, muted, undefined)
    }, [volume, muted])

    useEffect(() => {
      const adapter = adapterRef.current
      if (!adapter || !readyRef.current || typeof playbackRate !== 'number') {
        return
      }
      adapter.setPlaybackRate(playbackRate)
    }, [playbackRate])

    return (
      <div
        className="youtube-player-stage"
        ref={hostRef}
        data-youtube-video-id={source.videoId}
        aria-label="YouTube player"
      />
    )
  }
)

export default YouTubePlayerStage
