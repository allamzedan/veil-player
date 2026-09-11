/** Minimal playback surface for the YouTube spike (local player stays on its own path). */

export interface PlaybackAdapter {
  load(): Promise<void>
  play(): Promise<void> | void
  pause(): Promise<void> | void
  seekTo(seconds: number): Promise<void> | void
  getCurrentTime(): number
  getDuration(): number
  setVolume(volume: number): void
  getVolume(): number
  setMuted(muted: boolean): void
  isMuted(): boolean
  setPlaybackRate(rate: number): void
  getAvailablePlaybackRates(): number[]
  destroy(): void
}

export type YouTubeAdapterErrorCode =
  | 'api_load_failed'
  | 'init_failed'
  | 'embedding_disabled'
  | 'unavailable'
  | 'private'
  | 'error_153'
  | 'network'
  | 'player_failure'
  | 'destroyed'
  | 'unknown'

export class YouTubeAdapterError extends Error {
  readonly code: YouTubeAdapterErrorCode

  constructor(code: YouTubeAdapterErrorCode, message: string) {
    super(message)
    this.name = 'YouTubeAdapterError'
    this.code = code
  }
}

export function mapYouTubePlayerError(errorCode: number): YouTubeAdapterError {
  switch (errorCode) {
    case 2:
      return new YouTubeAdapterError('init_failed', 'Invalid YouTube video id or player request.')
    case 5:
      return new YouTubeAdapterError('player_failure', 'YouTube HTML5 player error.')
    case 100:
      return new YouTubeAdapterError('unavailable', 'Video is unavailable or has been removed.')
    case 101:
    case 150:
      return new YouTubeAdapterError(
        'embedding_disabled',
        'Embedding is disabled for this video by the uploader.'
      )
    case 153:
      return new YouTubeAdapterError(
        'error_153',
        'YouTube Error 153 (player configuration / identity). Packaged origin may be unsupported.'
      )
    default:
      return new YouTubeAdapterError('unknown', `YouTube player error ${errorCode}.`)
  }
}
