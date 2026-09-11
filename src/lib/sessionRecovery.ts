import type { YouTubeMediaSource } from '../types/mediaSource'

export const YOUTUBE_RECENT_FALLBACK_TITLE = 'YouTube video'

export function normalizeYouTubeRecentTitle(
  videoId: string,
  title: string | null | undefined
): string | null {
  const normalizedTitle = title?.trim()
  const normalizedVideoId = videoId.trim()
  if (!normalizedTitle || !normalizedVideoId) return null

  const lowerTitle = normalizedTitle.toLocaleLowerCase()
  const lowerVideoId = normalizedVideoId.toLocaleLowerCase()
  if (
    lowerTitle === YOUTUBE_RECENT_FALLBACK_TITLE.toLocaleLowerCase() ||
    lowerTitle === lowerVideoId ||
    (lowerTitle.startsWith('youtube') && lowerTitle.endsWith(lowerVideoId))
  ) return null

  return normalizedTitle
}

export interface RecentVideoEntry {
  kind?: 'local' | 'youtube'
  name: string
  mediaKey: string
  filePath?: string
  videoId?: string
  canonicalUrl?: string
  durationSeconds?: number
  openedAt: number
}

export function normalizeRecentMediaPath(filePath: string): string {
  return filePath.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLocaleLowerCase()
}

export function recordRecentVideo(
  name: string,
  mediaKey: string,
  options?: { filePath?: string; durationSeconds?: number }
): void {
  if (!options?.filePath || typeof window === 'undefined') return
  void window.veil?.recordRecentVideo({
    kind: 'local',
    name,
    mediaKey,
    filePath: options.filePath,
    durationSeconds: options.durationSeconds,
    openedAt: Date.now()
  }).catch(() => undefined)
}

export function recordRecentYouTube(source: YouTubeMediaSource, title?: string | null): void {
  if (typeof window === 'undefined') return
  void window.veil?.recordRecentVideo({
    kind: 'youtube',
    name: normalizeYouTubeRecentTitle(source.videoId, title) ?? YOUTUBE_RECENT_FALLBACK_TITLE,
    mediaKey: source.videoId,
    videoId: source.videoId,
    canonicalUrl: source.canonicalUrl,
    durationSeconds: source.duration,
    openedAt: Date.now()
  }).catch(() => undefined)
}

export function removeRecentVideoByPath(filePath: string): void {
  if (typeof window === 'undefined') return
  void window.veil?.removeRecentVideo(filePath).catch(() => undefined)
}

export function removeRecentVideoByName(name: string): void {
  if (typeof window === 'undefined') return
  void window.veil?.removeRecentVideo(name).catch(() => undefined)
}

export function updateRecentVideoDuration(name: string, durationSeconds: number): void {
  if (
    typeof window === 'undefined' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return
  }
  void window.veil?.updateRecentVideoDuration(name, durationSeconds).catch(() => undefined)
}

export function updateRecentYouTubeTitle(videoId: string, title: string | null | undefined): void {
  void videoId
  void title
}
