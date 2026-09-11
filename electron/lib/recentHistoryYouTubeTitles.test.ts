import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RecentHistoryStore } from './recentHistoryStore'

let temporaryDirectory: string | null = null

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = null
})

describe('RecentHistoryStore YouTube title enrichment', () => {
  it('updates the existing canonical identity without duplication or reordering', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'veil-recent-youtube-title-'))
    const store = new RecentHistoryStore(join(temporaryDirectory, 'recent-history.json'))
    await store.recordVideo({
      kind: 'youtube', name: 'YouTube video', mediaKey: 'Royv6Vqz7S4',
      videoId: 'Royv6Vqz7S4', canonicalUrl: 'https://www.youtube.com/watch?v=Royv6Vqz7S4', openedAt: 10
    })
    await store.recordVideo({
      kind: 'local', name: 'newer.mp4', mediaKey: 'newer', filePath: 'C:\\newer.mp4', openedAt: 20
    })

    await store.updateYouTubeTitle('Royv6Vqz7S4', 'أحمد سعد - Mekassarat (Official Music Video)')

    const history = await store.read()
    expect(history.videos).toHaveLength(2)
    expect(history.videos[0].name).toBe('newer.mp4')
    expect(history.videos[1]).toMatchObject({
      videoId: 'Royv6Vqz7S4',
      name: 'أحمد سعد - Mekassarat (Official Music Video)',
      openedAt: 10
    })
  })
})
