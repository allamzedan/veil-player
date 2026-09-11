import type { MediaSource, YouTubeMediaSource } from '../types/mediaSource'
import type { YouTubeAdapterErrorCode } from './PlaybackAdapter'

export type PlaybackFailureSource = 'local' | 'youtube'

export type PlaybackFailureReason =
  | 'unsupported-local-format'
  | 'local-decode-failure'
  | 'local-read-failure'
  | 'youtube-unavailable'
  | 'youtube-private'
  | 'youtube-embed-restricted'
  | 'youtube-region-restricted'
  | 'youtube-playback-failed'
  | 'youtube-network'
  | 'unknown'

export interface PlaybackFailure {
  source: PlaybackFailureSource
  reason: PlaybackFailureReason
  recoverable: boolean
  youtubeVideoId?: string
  canonicalUrl?: string
  technicalCode?: string | number
}

export function localPlaybackFailure(mediaErrorCode?: number | null): PlaybackFailure {
  const reason: PlaybackFailureReason =
    mediaErrorCode === 4
      ? 'unsupported-local-format'
      : mediaErrorCode === 3
        ? 'local-decode-failure'
        : mediaErrorCode === 2 || mediaErrorCode === 1
          ? 'local-read-failure'
          : 'unknown'
  return {
    source: 'local',
    reason,
    recoverable: false,
    ...(typeof mediaErrorCode === 'number' ? { technicalCode: mediaErrorCode } : {})
  }
}

export function youtubePlaybackFailure(
  code: YouTubeAdapterErrorCode | 'unknown',
  source: YouTubeMediaSource
): PlaybackFailure {
  const reason: PlaybackFailureReason =
    code === 'unavailable' || code === 'private' || code === 'init_failed'
      ? 'youtube-unavailable'
      : code === 'embedding_disabled'
        ? 'youtube-embed-restricted'
        : code === 'api_load_failed' || code === 'network'
          ? 'youtube-network'
          : 'youtube-playback-failed'
  return {
    source: 'youtube',
    reason,
    recoverable: true,
    youtubeVideoId: source.videoId,
    canonicalUrl: source.canonicalUrl,
    technicalCode: code
  }
}

export function isCurrentYouTubeFailureEvent(args: {
  eventVideoId: string
  eventLoadGeneration: number
  activeSource: MediaSource | null
  activeLoadGeneration: number
}): args is typeof args & { activeSource: YouTubeMediaSource } {
  return (
    args.activeSource?.kind === 'youtube' &&
    args.activeSource.videoId === args.eventVideoId &&
    args.activeLoadGeneration === args.eventLoadGeneration
  )
}

export function playbackFailureCopyKeys(failure: PlaybackFailure): {
  title: string
  primary: string
  secondary: string
} {
  if (failure.source === 'youtube') {
    return {
      title: 'youtube.playbackUnavailableTitle',
      primary: 'youtube.playbackUnavailablePrimary',
      secondary: 'youtube.playbackUnavailableSecondary'
    }
  }
  return {
    title: 'userMessages.mediaPlaybackFailedTitle',
    primary: 'userMessages.localPlaybackFailedLead',
    secondary: 'userMessages.localPlaybackFailedDetails'
  }
}

export function resolveLiveTransportDuration(args: {
  source: PlaybackFailureSource
  ready: boolean
  duration: number
}): number | null {
  if (args.source === 'youtube' && !args.ready) {
    return null
  }
  return Number.isFinite(args.duration) && args.duration > 0 ? args.duration : null
}

export function canCreatePlaybackPositionBookmark(
  source: PlaybackFailureSource,
  ready: boolean
): boolean {
  return source === 'local' || ready
}
