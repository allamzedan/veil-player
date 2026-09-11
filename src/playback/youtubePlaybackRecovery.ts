import { useVeilStore } from '../state/useVeilStore'
import { isYouTubeMediaSource } from '../types/mediaSource'
import type { PlaybackFailure } from './playbackFailure'

export function retryActiveYouTubePlayback(failure: PlaybackFailure | null): boolean {
  const state = useVeilStore.getState()
  const source = state.mediaSource
  if (
    failure?.source !== 'youtube' ||
    !source ||
    !isYouTubeMediaSource(source) ||
    source.videoId !== failure.youtubeVideoId
  ) {
    return false
  }
  state.openYouTubeMedia(source, { reload: true })
  return true
}

export function openFailedYouTubeExternally(
  failure: PlaybackFailure | null,
  openExternal: (url: string) => void = (url) => {
    void window.veil?.openExternalUrl?.(url)
  }
): boolean {
  if (failure?.source !== 'youtube' || !failure.canonicalUrl) {
    return false
  }
  openExternal(failure.canonicalUrl)
  return true
}
