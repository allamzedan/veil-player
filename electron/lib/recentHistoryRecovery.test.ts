import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RecentHistoryStore } from './recentHistoryStore'

let temporaryDirectory: string | null = null

async function createStore(): Promise<RecentHistoryStore> {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'veil-recent-recovery-'))
  return new RecentHistoryStore(join(temporaryDirectory, 'recent-history.json'))
}

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = null
})

describe('RecentHistoryStore relocation', () => {
  it('atomically replaces the same local-media entry and moves it to the top', async () => {
    const store = await createStore()
    await store.recordVideo({ name: 'other.mp4', mediaKey: 'other', filePath: 'C:\\other.mp4', openedAt: 2 })
    await store.recordVideo({ name: 'missing.mp4', mediaKey: 'old', filePath: 'C:\\missing.mp4', openedAt: 1 })

    await store.relocateVideo('C:\\missing.mp4', {
      kind: 'local', name: 'found.mp4', mediaKey: 'new', filePath: 'D:\\found.mp4', openedAt: 3
    })

    const history = await store.read()
    expect(history.videos.map((entry) => entry.filePath)).toEqual(['D:\\found.mp4', 'C:\\other.mp4'])
    expect(history.videos.some((entry) => entry.filePath === 'C:\\missing.mp4')).toBe(false)
  })

  it('atomically replaces the same VEIL entry without affecting other entries', async () => {
    const store = await createStore()
    await store.recordVeil({ title: 'Other', filePath: 'C:\\other.veil', actionCount: 1, badge: 'custom', openedAt: 2 })
    await store.recordVeil({ title: 'Missing', filePath: 'C:\\missing.veil', actionCount: 2, badge: 'custom', openedAt: 1 })

    await store.relocateVeil('C:\\missing.veil', {
      title: 'Found', filePath: 'D:\\found.veil', actionCount: 3, badge: 'familySafe', openedAt: 3
    })

    const history = await store.read()
    expect(history.veils.map((entry) => entry.filePath)).toEqual(['D:\\found.veil', 'C:\\other.veil'])
    expect(history.veils[0].actionCount).toBe(3)
  })

  it('removes only the requested history entry and never touches real files', async () => {
    const store = await createStore()
    await store.recordVideo({ name: 'one.mp4', mediaKey: 'one', filePath: 'C:\\one.mp4', openedAt: 1 })
    await store.recordVideo({ name: 'two.mp4', mediaKey: 'two', filePath: 'C:\\two.mp4', openedAt: 2 })

    await store.removeVideo('C:\\one.mp4')

    expect((await store.read()).videos.map((entry) => entry.name)).toEqual(['two.mp4'])
  })
})
