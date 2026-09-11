import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl, isValidYouTubeVideoId } from './youtubeUrl'

describe('parseYouTubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtu.be/dQw4w9WgXcQ?t=12', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest', 'dQw4w9WgXcQ']
  ])('accepts %s', (input, videoId) => {
    const result = parseYouTubeUrl(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.source.videoId).toBe(videoId)
      expect(result.source.provider).toBe('youtube')
      expect(result.source.kind).toBe('youtube')
      expect(result.source.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${videoId}`)
    }
  })

  it('rejects empty input', () => {
    expect(parseYouTubeUrl('').ok).toBe(false)
    expect(parseYouTubeUrl('   ').ok).toBe(false)
  })

  it('rejects malformed URLs', () => {
    const result = parseYouTubeUrl('https://')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('malformed_url')
    }
  })

  it('rejects non-YouTube hosts', () => {
    const result = parseYouTubeUrl('https://vimeo.com/123456')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('unsupported_host')
    }
  })

  it('rejects playlist-only URLs without a video id', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/playlist?list=PLabcdef')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('playlist_only')
    }
  })

  it('rejects invalid video ids', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=short')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid_video_id')
    }
  })

  it('rejects arbitrary iframe HTML', () => {
    const result = parseYouTubeUrl('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('rejected_html')
    }
  })

  it('validates id shape', () => {
    expect(isValidYouTubeVideoId('dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeVideoId('too-short')).toBe(false)
  })
})
