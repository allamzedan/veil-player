import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOfficialYouTubeMetadata, resetYouTubeMetadataCacheForTests } from './youtubeMetadata'

describe('official YouTube Data API metadata lookup', () => {
  beforeEach(() => resetYouTubeMetadataCacheForTests())

  it('does not make a network request when no key is configured', async () => {
    const fetcher = vi.fn()
    await expect(fetchOfficialYouTubeMetadata('dQw4w9WgXcQ', undefined, fetcher)).resolves.toEqual({
      configured: false,
      status: 'unavailable'
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reads snippet fields and caches by YouTube video identity', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: { title: 'Title', channelTitle: 'Channel', description: 'Body', publishedAt: '2020-01-01T00:00:00Z' }
        }]
      })
    })
    const first = await fetchOfficialYouTubeMetadata('dQw4w9WgXcQ', 'test-key', fetcher)
    const second = await fetchOfficialYouTubeMetadata('dQw4w9WgXcQ', 'test-key', fetcher)
    expect(first).toMatchObject({ configured: true, status: 'ready', metadata: { title: 'Title', channelTitle: 'Channel', description: 'Body' } })
    expect(second).toEqual(first)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
