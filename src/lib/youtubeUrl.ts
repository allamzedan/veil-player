import type { YouTubeMediaSource } from '../types/mediaSource'

/** Official 11-character YouTube video id alphabet. */
export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export type YouTubeUrlParseErrorCode =
  | 'empty'
  | 'malformed_url'
  | 'unsupported_host'
  | 'missing_video_id'
  | 'invalid_video_id'
  | 'playlist_only'
  | 'rejected_html'

export type YouTubeUrlParseResult =
  | { ok: true; source: YouTubeMediaSource }
  | { ok: false; code: YouTubeUrlParseErrorCode; message: string }

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com'
])

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

function isYouTubeHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (YOUTUBE_HOSTS.has(host)) {
    return true
  }
  const bare = stripWww(host)
  return bare === 'youtube.com' || bare === 'youtu.be' || bare === 'youtube-nocookie.com'
}

function extractIdFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return null
  }

  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') {
    return parts[1] ?? null
  }

  // youtu.be/<id>
  if (parts.length === 1) {
    return parts[0]
  }

  return null
}

function normalizeVideoId(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null
  }
  const id = candidate.trim()
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(id)) {
    return null
  }
  return id
}

/**
 * Parse and validate a pasted YouTube URL into a normalized media source.
 * Rejects arbitrary iframe HTML, non-YouTube hosts, and playlist-only links without a video id.
 */
export function parseYouTubeUrl(input: string): YouTubeUrlParseResult {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, code: 'empty', message: 'Enter a YouTube URL.' }
  }

  if (/<\s*iframe\b/i.test(raw) || /<\s*script\b/i.test(raw)) {
    return {
      ok: false,
      code: 'rejected_html',
      message: 'Paste a YouTube URL, not embed HTML.'
    }
  }

  let url: URL
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`)
  } catch {
    return { ok: false, code: 'malformed_url', message: 'That URL could not be parsed.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, code: 'malformed_url', message: 'Only http(s) YouTube URLs are supported.' }
  }

  if (!isYouTubeHost(url.hostname)) {
    return {
      ok: false,
      code: 'unsupported_host',
      message: 'Only youtube.com / youtu.be URLs are accepted.'
    }
  }

  const host = stripWww(url.hostname)
  let candidate: string | null = null

  const pathLower = url.pathname.toLowerCase()
  const playlistOnly =
    pathLower.includes('/playlist') ||
    (url.searchParams.has('list') && !url.searchParams.get('v') && !pathLower.includes('/watch'))

  if (host === 'youtu.be') {
    candidate = extractIdFromPath(url.pathname)
  } else {
    candidate = url.searchParams.get('v')
    if (!candidate) {
      candidate = extractIdFromPath(url.pathname)
    }
  }

  if (!normalizeVideoId(candidate) && (playlistOnly || url.searchParams.has('list'))) {
    return {
      ok: false,
      code: 'playlist_only',
      message: 'Playlist links need a specific video id (v=).'
    }
  }

  if (!candidate) {
    return {
      ok: false,
      code: 'missing_video_id',
      message: 'No video id found in that URL.'
    }
  }

  // Strip timestamp junk sometimes glued onto ids in path forms
  const cleaned = candidate.split('?')[0]?.split('&')[0]?.split('#')[0] ?? candidate
  const videoId = normalizeVideoId(cleaned)
  if (!videoId) {
    return {
      ok: false,
      code: 'invalid_video_id',
      message: 'Video id must be 11 characters (A–Z, a–z, 0–9, _, -).'
    }
  }

  return {
    ok: true,
    source: {
      kind: 'youtube',
      provider: 'youtube',
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`
    }
  }
}

export function isValidYouTubeVideoId(videoId: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
}

export function toCanonicalYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
