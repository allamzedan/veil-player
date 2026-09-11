import type { YouTubeMediaSource } from '../types/mediaSource'

export type YouTubeSourceChangeAction = 'save-and-open' | 'open-without-saving' | 'open' | 'cancel'

export function youtubeSourceChangeActions(dirty: boolean): YouTubeSourceChangeAction[] {
  return dirty
    ? ['save-and-open', 'open-without-saving', 'cancel']
    : ['open', 'cancel']
}

export function replaceWithCleanYouTubeSource(
  source: YouTubeMediaSource,
  actions: { clearVideo: () => void; openYouTubeMedia: (source: YouTubeMediaSource) => void }
): void {
  actions.clearVideo()
  actions.openYouTubeMedia(source)
}
