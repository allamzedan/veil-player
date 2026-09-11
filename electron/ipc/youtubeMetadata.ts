import { ipcMain } from 'electron'
import type { YouTubeMetadataLookupResult } from '../../src/types/youtubeMetadata'

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000
const FAILURE_TTL_MS = 10 * 60 * 1000

type CacheEntry = { expiresAt: number; result: YouTubeMetadataLookupResult }
const cache = new Map<string, CacheEntry>()

export function resetYouTubeMetadataCacheForTests(): void {
  cache.clear()
}

export async function fetchOfficialYouTubeMetadata(
  videoId: string,
  apiKey = process.env.VEIL_YOUTUBE_DATA_API_KEY,
  fetcher: typeof fetch = fetch
): Promise<YouTubeMetadataLookupResult> {
  if (!VIDEO_ID_PATTERN.test(videoId)) return { configured: Boolean(apiKey), status: 'error' }
  if (!apiKey?.trim()) return { configured: false, status: 'unavailable' }

  const key = `youtube:${videoId}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  let result: YouTubeMetadataLookupResult
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('part', 'snippet,status')
    url.searchParams.set('id', videoId)
    url.searchParams.set('key', apiKey.trim())
    const response = await fetcher(url, { method: 'GET', redirect: 'error' })
    if (!response.ok) throw new Error(`YouTube Data API ${response.status}`)
    const body = await response.json() as {
      items?: Array<{
        id?: string
        snippet?: { title?: string; channelTitle?: string; description?: string; publishedAt?: string }
        status?: { madeForKids?: boolean }
      }>
    }
    const item = body.items?.find((candidate) => candidate.id === videoId)
    if (!item?.snippet) {
      result = { configured: true, status: 'unavailable' }
    } else {
      result = {
        configured: true,
        status: 'ready',
        metadata: {
          videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          madeForKids: item.status?.madeForKids === true,
          fetchedAt: new Date().toISOString()
        }
      }
    }
  } catch {
    result = { configured: true, status: 'error' }
  }
  if (result.metadata?.madeForKids !== true) {
    cache.set(key, {
      result,
      expiresAt: Date.now() + (result.status === 'ready' ? SUCCESS_TTL_MS : FAILURE_TTL_MS)
    })
  }
  return result
}

export function registerYouTubeMetadataHandlers(): void {
  ipcMain.handle('youtube:getMetadata', (_event, videoId: unknown) => {
    if (typeof videoId !== 'string') return { configured: false, status: 'error' }
    return fetchOfficialYouTubeMetadata(videoId)
  })
}
