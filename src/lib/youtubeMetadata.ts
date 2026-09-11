import type { YouTubeMediaSource } from '../types/mediaSource'
import type {
  YouTubeMetadata,
  YouTubeMetadataSource,
  YouTubeMetadataStatus
} from '../types/youtubeMetadata'

const SOURCE_PRIORITY: Record<YouTubeMetadataSource, number> = {
  'saved-veil': 0,
  iframe: 1,
  'youtube-data-api': 2
}

export function savedYouTubeMetadata(source: YouTubeMediaSource): YouTubeMetadata {
  const hasDetails = Boolean(source.title?.trim()) ||
    (typeof source.duration === 'number' && Number.isFinite(source.duration))
  return {
    videoId: source.videoId,
    canonicalUrl: source.canonicalUrl,
    source: 'saved-veil',
    status: hasDetails ? 'partial' : 'idle',
    ...(source.title?.trim() ? { title: source.title.trim() } : {}),
    ...(typeof source.duration === 'number' && Number.isFinite(source.duration)
      ? { duration: source.duration }
      : {})
  }
}

function cleanText(value: string | undefined): string | undefined {
  const clean = value?.trim()
  return clean ? clean : undefined
}

function derivedStatus(metadata: YouTubeMetadata, requested?: YouTubeMetadataStatus): YouTubeMetadataStatus {
  if (requested === 'loading' || requested === 'error' || requested === 'unavailable') {
    return requested
  }
  return metadata.title && metadata.channelTitle && metadata.description ? 'ready' : 'partial'
}

export function mergeYouTubeMetadata(
  current: YouTubeMetadata,
  incoming: Partial<YouTubeMetadata> & Pick<YouTubeMetadata, 'videoId' | 'source'>
): YouTubeMetadata {
  if (incoming.videoId !== current.videoId) return current
  const incomingWins = SOURCE_PRIORITY[incoming.source] >= SOURCE_PRIORITY[current.source]
  const choose = (prior: string | undefined, next: string | undefined): string | undefined => {
    const clean = cleanText(next)
    return clean && (incomingWins || !prior) ? clean : prior
  }
  const next: YouTubeMetadata = {
    ...current,
    title: choose(current.title, incoming.title),
    channelTitle: choose(current.channelTitle, incoming.channelTitle),
    description: choose(current.description, incoming.description),
    publishedAt: choose(current.publishedAt, incoming.publishedAt),
    duration:
      typeof incoming.duration === 'number' && Number.isFinite(incoming.duration) &&
      (incoming.source === 'iframe' || incomingWins || current.duration === undefined)
        ? incoming.duration
        : current.duration,
    canonicalUrl: current.canonicalUrl,
    source: incomingWins ? incoming.source : current.source,
    fetchedAt: incoming.fetchedAt ?? current.fetchedAt,
    status: current.status
  }
  next.status = derivedStatus(next, incoming.status)
  return next
}

export function markYouTubeMetadataLoading(current: YouTubeMetadata): YouTubeMetadata {
  return { ...current, status: 'loading' }
}

export function markYouTubeMetadataUnavailable(
  current: YouTubeMetadata,
  status: 'unavailable' | 'error'
): YouTubeMetadata {
  return {
    ...current,
    status: current.title || current.duration ? 'partial' : status
  }
}
