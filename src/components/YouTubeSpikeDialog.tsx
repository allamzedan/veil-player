import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../lib/time'
import { parseYouTubeUrl } from '../lib/youtubeUrl'
import {
  YouTubeAdapterError,
  type YouTubeAdapterErrorCode
} from '../playback/PlaybackAdapter'
import { YouTubeAdapter } from '../playback/YouTubeAdapter'
import Modal from './Modal'

interface YouTubeSpikeDialogProps {
  open: boolean
  onClose: () => void
}

type SpikeStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; code: YouTubeAdapterErrorCode | 'invalid_url'; message: string }

function describeRuntimeOrigin(): string {
  try {
    return window.location.origin || window.location.href
  } catch {
    return '(unknown)'
  }
}

export default function YouTubeSpikeDialog({ open, onClose }: YouTubeSpikeDialogProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const adapterRef = useRef<YouTubeAdapter | null>(null)
  const [urlInput, setUrlInput] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [status, setStatus] = useState<SpikeStatus>({ kind: 'idle' })
  const [canonicalUrl, setCanonicalUrl] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [rates, setRates] = useState<number[]>([1])
  const [rate, setRate] = useState(1)
  const [runtimeOrigin] = useState(describeRuntimeOrigin)

  const destroyAdapter = (): void => {
    adapterRef.current?.destroy()
    adapterRef.current = null
  }

  useEffect(() => {
    if (!open) {
      destroyAdapter()
      setStatus({ kind: 'idle' })
      setCanonicalUrl(null)
      setVideoId(null)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [open])

  useEffect(() => {
    return () => {
      destroyAdapter()
    }
  }, [])

  useEffect(() => {
    if (status.kind !== 'ready') {
      return
    }
    const id = window.setInterval(() => {
      const adapter = adapterRef.current
      if (!adapter) {
        return
      }
      setCurrentTime(adapter.getCurrentTime())
      setDuration(adapter.getDuration())
    }, 250)
    return () => window.clearInterval(id)
  }, [status.kind])

  const loadVideo = async (): Promise<void> => {
    const parsed = parseYouTubeUrl(urlInput)
    if (!parsed.ok) {
      setStatus({ kind: 'error', code: 'invalid_url', message: parsed.message })
      destroyAdapter()
      return
    }

    const host = mountRef.current
    if (!host) {
      setStatus({
        kind: 'error',
        code: 'init_failed',
        message: 'Player host element is missing.'
      })
      return
    }

    destroyAdapter()
    setStatus({ kind: 'loading' })
    setCanonicalUrl(parsed.source.canonicalUrl)
    setVideoId(parsed.source.videoId)

    const adapter = new YouTubeAdapter({
      hostElement: host,
      source: parsed.source,
      host: 'https://www.youtube.com',
      onError: (error) => {
        setStatus({ kind: 'error', code: error.code, message: error.message })
      },
      onReady: () => {
        setRates(adapter.getAvailablePlaybackRates())
        setVolume(adapter.getVolume())
      }
    })
    adapterRef.current = adapter

    try {
      await adapter.load()
      adapter.setVolume(volume)
      setRates(adapter.getAvailablePlaybackRates())
      setDuration(adapter.getDuration())
      setStatus({ kind: 'ready' })
    } catch (error) {
      destroyAdapter()
      if (error instanceof YouTubeAdapterError) {
        setStatus({ kind: 'error', code: error.code, message: error.message })
      } else {
        setStatus({
          kind: 'error',
          code: 'init_failed',
          message: error instanceof Error ? error.message : 'Playback initialization failed.'
        })
      }
    }
  }

  const openOnYouTube = (): void => {
    const target = canonicalUrl
    if (!target) {
      return
    }
    void window.veil?.openExternalUrl?.(target)
  }

  const ready = status.kind === 'ready' && adapterRef.current !== null

  return (
    <Modal
      open={open}
      title="YouTube Spike (architecture proof)"
      onClose={onClose}
      panelClassName="modal__panel--youtube-spike"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="youtube-spike" data-spike="youtube-iframe-api">
        <p className="youtube-spike__banner">
          Temporary developer spike. Official YouTube IFrame Player API only — no download, no masks
          over the iframe, no VEIL track features. Packaged builds serve the renderer from
          <code>http://127.0.0.1:&lt;ephemeral-port&gt;</code> so YouTube postMessage can match the page
          origin.
        </p>

        <div className="youtube-spike__row">
          <label className="youtube-spike__label" htmlFor="youtube-spike-url">
            YouTube URL
          </label>
          <div className="youtube-spike__url-row">
            <input
              id="youtube-spike-url"
              className="youtube-spike__input"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              spellCheck={false}
            />
            <button type="button" className="btn btn-compact" onClick={() => void loadVideo()}>
              Load
            </button>
          </div>
        </div>

        <div
          className="youtube-spike__player"
          ref={mountRef}
          aria-label="YouTube iframe player host"
        />

        <div className="youtube-spike__controls" dir="ltr">
          <button
            type="button"
            className="btn btn-compact"
            disabled={!ready}
            onClick={() => adapterRef.current?.play()}
          >
            Play
          </button>
          <button
            type="button"
            className="btn btn-compact"
            disabled={!ready}
            onClick={() => adapterRef.current?.pause()}
          >
            Pause
          </button>
          <button
            type="button"
            className="btn btn-compact"
            disabled={!ready}
            onClick={() => {
              const adapter = adapterRef.current
              if (!adapter) return
              adapter.seekTo(Math.max(0, adapter.getCurrentTime() - 10))
            }}
          >
            Back 10s
          </button>
          <button
            type="button"
            className="btn btn-compact"
            disabled={!ready}
            onClick={() => {
              const adapter = adapterRef.current
              if (!adapter) return
              adapter.seekTo(adapter.getCurrentTime() + 10)
            }}
          >
            Forward 10s
          </button>
          <button
            type="button"
            className="btn btn-compact btn-secondary"
            disabled={!canonicalUrl}
            onClick={openOnYouTube}
          >
            Open on YouTube
          </button>
        </div>

        <div className="youtube-spike__sliders" dir="ltr">
          <label className="youtube-spike__slider">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={!ready}
              onChange={(event) => {
                const next = Number(event.target.value)
                setVolume(next)
                adapterRef.current?.setVolume(next)
              }}
            />
          </label>
          <label className="youtube-spike__slider">
            <span>Speed</span>
            <select
              value={rate}
              disabled={!ready}
              onChange={(event) => {
                const next = Number(event.target.value)
                setRate(next)
                adapterRef.current?.setPlaybackRate(next)
              }}
            >
              {rates.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
          <p className="youtube-spike__time ltr-digits" aria-live="polite">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>

        <div className="youtube-spike__status" role="status">
          <p>
            <strong>Status:</strong>{' '}
            {status.kind === 'idle' && 'Idle'}
            {status.kind === 'loading' && 'Loading IFrame API / player…'}
            {status.kind === 'ready' && 'Ready'}
            {status.kind === 'error' && `Error (${status.code}): ${status.message}`}
          </p>
          <p>
            <strong>videoId:</strong> {videoId ?? '—'}
          </p>
          <p>
            <strong>canonical:</strong> {canonicalUrl ?? '—'}
          </p>
          <p>
            <strong>packaged/runtime origin:</strong> <code>{runtimeOrigin}</code>
          </p>
          <p>
            <strong>apiOrigin playerVar:</strong>{' '}
            <code>
              {runtimeOrigin.startsWith('http')
                ? runtimeOrigin
                : '(fallback https://www.youtube.com — unexpected non-http origin)'}
            </code>
          </p>
        </div>
      </div>
    </Modal>
  )
}
