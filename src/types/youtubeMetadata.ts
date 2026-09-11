export type YouTubeMetadataSource = 'iframe' | 'youtube-data-api' | 'saved-veil'

export type YouTubeMetadataStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'partial'
  | 'unavailable'
  | 'error'

export interface YouTubeMetadata {
  videoId: string
  title?: string
  channelTitle?: string
  description?: string
  publishedAt?: string
  duration?: number
  canonicalUrl: string
  source: YouTubeMetadataSource
  fetchedAt?: string
  status: YouTubeMetadataStatus
}

export interface YouTubeMetadataLookupResult {
  configured: boolean
  status: 'ready' | 'unavailable' | 'error'
  metadata?: Pick<
    YouTubeMetadata,
    'videoId' | 'title' | 'channelTitle' | 'description' | 'publishedAt' | 'fetchedAt'
  >
}
