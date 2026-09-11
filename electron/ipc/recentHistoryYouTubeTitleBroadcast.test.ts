import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn(),
  handle: vi.fn()
}))

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: electronMocks.getAllWindows },
  ipcMain: { handle: electronMocks.handle }
}))

import { registerRecentHistoryHandlers } from './recentHistory'
import { RecentHistoryStore } from '../lib/recentHistoryStore'

let temporaryDirectory: string | null = null

afterEach(async () => {
  electronMocks.getAllWindows.mockReset()
  electronMocks.handle.mockReset()
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = null
})

describe('YouTube recent title IPC propagation', () => {
  it('enriches the same item and broadcasts the updated snapshot to launcher and menu windows', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'veil-recent-title-broadcast-'))
    const store = new RecentHistoryStore(join(temporaryDirectory, 'recent-history.json'))
    await store.recordVideo({
      kind: 'youtube', name: 'YouTube video', mediaKey: 'Royv6Vqz7S4',
      videoId: 'Royv6Vqz7S4', canonicalUrl: 'https://www.youtube.com/watch?v=Royv6Vqz7S4', openedAt: 10
    })
    await store.recordVideo({
      kind: 'local', name: 'newer.mp4', mediaKey: 'newer', filePath: 'C:\\newer.mp4', openedAt: 20
    })

    const launcherSend = vi.fn()
    const menuSend = vi.fn()
    electronMocks.getAllWindows.mockReturnValue([
      { isDestroyed: () => false, webContents: { send: launcherSend } },
      { isDestroyed: () => false, webContents: { send: menuSend } }
    ])
    registerRecentHistoryHandlers(store)
    const registration = electronMocks.handle.mock.calls.find(
      ([channel]) => channel === 'recentHistory:updateYouTubeTitle'
    )
    expect(registration).toBeDefined()

    const updateTitle = registration![1] as (
      event: unknown,
      videoId: string,
      title: string
    ) => Promise<unknown>
    const updated = await updateTitle({}, 'Royv6Vqz7S4', 'أحمد سعد - Mekassarat')
    const history = await store.read()

    expect(history.videos).toHaveLength(2)
    expect(history.videos.map((entry) => entry.videoId ?? entry.filePath)).toEqual([
      'C:\\newer.mp4',
      'Royv6Vqz7S4'
    ])
    expect(history.videos[1]).toMatchObject({ name: 'أحمد سعد - Mekassarat', openedAt: 10 })
    expect(launcherSend).toHaveBeenCalledWith('recentHistory:changed', updated)
    expect(menuSend).toHaveBeenCalledWith('recentHistory:changed', updated)
  })
})
