/** Authoritative active media identity — local file or YouTube (provider + videoId). */

export type LocalMediaSource = {
  kind: 'local'
  path: string
  mediaType: 'video' | 'audio'
}

export type YouTubeMediaSource = {
  kind: 'youtube'
  provider: 'youtube'
  videoId: string
  canonicalUrl: string
  title?: string
  duration?: number
}

export type MediaSource = LocalMediaSource | YouTubeMediaSource

export function isYouTubeMediaSource(source: MediaSource): source is YouTubeMediaSource {
  return source.kind === 'youtube'
}

export function isLocalMediaSource(source: MediaSource): source is LocalMediaSource {
  return source.kind === 'local'
}

/** Authoritative YouTube identity — canonical URL is display/reference only. */
export function youtubeIdentityKey(source: Pick<YouTubeMediaSource, 'provider' | 'videoId'>): string {
  return `${source.provider}:${source.videoId}`
}

export function youtubeSourcesMatch(
  a: Pick<YouTubeMediaSource, 'provider' | 'videoId'> | null | undefined,
  b: Pick<YouTubeMediaSource, 'provider' | 'videoId'> | null | undefined
): boolean {
  if (!a || !b) {
    return false
  }
  return a.provider === b.provider && a.videoId === b.videoId
}
