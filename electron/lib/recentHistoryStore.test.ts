import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RecentHistoryStore } from './recentHistoryStore'

let temporaryDirectory: string | null = null

async function createStore(): Promise<{ store: RecentHistoryStore; filePath: string }> {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'veil-recent-history-'))
  const filePath = join(temporaryDirectory, 'recent-history.json')
  return { store: new RecentHistoryStore(filePath), filePath }
}

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = null
})

describe('RecentHistoryStore', () => {
  it('persists media newest-first and reopens the same normalized path at the top', async () => {
    const { store, filePath } = await createStore()
    await store.recordVideo({ name: 'one.mp4', mediaKey: 'one', filePath: 'C:\\Media\\one.mp4', openedAt: 1 })
    await store.recordVideo({ name: 'two.mp4', mediaKey: 'two', filePath: 'C:\\Media\\two.mp4', openedAt: 2 })
    await store.recordVideo({ name: 'ONE.mp4', mediaKey: 'one-new', filePath: 'c:/media/ONE.mp4', openedAt: 3 })

    const rehydrated = await new RecentHistoryStore(filePath).read()
    expect(rehydrated.videos.map((entry) => entry.name)).toEqual(['ONE.mp4', 'two.mp4'])
    expect(rehydrated.videos[0].filePath).toBe('c:/media/ONE.mp4')
  })

  it('persists VEIL open/save updates without duplicate normalized paths', async () => {
    const { store, filePath } = await createStore()
    await store.recordVeil({ title: 'First', filePath: 'C:\\Veils\\first.veil', actionCount: 1, badge: 'custom', openedAt: 1 })
    await store.recordVeil({ title: 'Second', filePath: 'C:\\Veils\\second.veil', actionCount: 2, badge: 'familySafe', openedAt: 2 })
    await store.recordVeil({ title: 'First saved', filePath: 'c:/veils/FIRST.veil', actionCount: 3, badge: 'custom', openedAt: 3 })

    const rehydrated = await new RecentHistoryStore(filePath).read()
    expect(rehydrated.veils.map((entry) => entry.title)).toEqual(['First saved', 'Second'])
    expect(rehydrated.veils[0].actionCount).toBe(3)
  })

  it('preserves the five-item limit and safely removes missing paths', async () => {
    const { store } = await createStore()
    for (let index = 0; index < 7; index += 1) {
      await store.recordVideo({
        name: `${index}.mp4`,
        mediaKey: String(index),
        filePath: `C:\\Media\\${index}.mp4`,
        openedAt: index
      })
    }
    await store.removeVideo('c:/media/6.mp4')
    await store.removeVeil('C:\\missing.veil')

    const history = await store.read()
    expect(history.videos).toHaveLength(4)
    expect(history.videos.some((entry) => entry.name === '6.mp4')).toBe(false)
  })

  it('deduplicates canonical YouTube identity and removes it by video id', async () => {
    const { store } = await createStore()
    await store.recordVideo({
      kind: 'youtube',
      name: 'First title',
      mediaKey: 'dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      openedAt: 1
    })
    await store.recordVideo({
      kind: 'youtube',
      name: 'Updated title',
      mediaKey: 'dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      openedAt: 2
    })

    expect((await store.read()).videos.map((entry) => entry.name)).toEqual(['Updated title'])
    await store.removeVideo('dQw4w9WgXcQ')
    expect((await store.read()).videos).toEqual([])
  })

  it('updates local duration without reordering and clears both lists', async () => {
    const { store } = await createStore()
    await store.recordVideo({ name: 'clip.mp4', mediaKey: 'clip', filePath: 'C:\\clip.mp4', openedAt: 1 })
    await store.recordVeil({ title: 'Edit', filePath: 'C:\\edit.veil', actionCount: 1, badge: 'custom', openedAt: 2 })
    await store.updateVideoDuration('clip.mp4', 42)
    expect((await store.read()).videos[0].durationSeconds).toBe(42)

    await store.clear()
    expect(await store.read()).toEqual({ videos: [], veils: [] })
  })
})
