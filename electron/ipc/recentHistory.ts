import { BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import {
  RecentHistoryStore,
  type PersistedRecentHistory,
  type PersistedRecentVeil,
  type PersistedRecentVideo
} from '../lib/recentHistoryStore'

async function broadcastHistory(store: RecentHistoryStore): Promise<PersistedRecentHistory> {
  const history = await store.read()
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('recentHistory:changed', history)
  }
  return history
}

export function registerRecentHistoryHandlers(store: RecentHistoryStore): void {
  ipcMain.handle('recentHistory:read', () => store.read())
  ipcMain.handle('recentHistory:pathExists', (_event, filePath: unknown) =>
    typeof filePath === 'string' && filePath.length > 0 && existsSync(filePath))
  ipcMain.handle('recentHistory:recordVideo', async (_event, entry: PersistedRecentVideo) => {
    await store.recordVideo(entry)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:recordVeil', async (_event, entry: PersistedRecentVeil) => {
    await store.recordVeil(entry)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:relocateVideo', async (
    _event,
    previousFilePath: unknown,
    entry: PersistedRecentVideo
  ) => {
    if (typeof previousFilePath === 'string') await store.relocateVideo(previousFilePath, entry)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:relocateVeil', async (
    _event,
    previousFilePath: unknown,
    entry: PersistedRecentVeil
  ) => {
    if (typeof previousFilePath === 'string') await store.relocateVeil(previousFilePath, entry)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:updateYouTubeTitle', async (
    _event,
    videoId: unknown,
    title: unknown
  ) => {
    if (typeof videoId === 'string' && typeof title === 'string') {
      await store.updateYouTubeTitle(videoId, title)
    }
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:updateVideoDuration', async (_event, name: unknown, duration: unknown) => {
    if (typeof name === 'string' && typeof duration === 'number') {
      await store.updateVideoDuration(name, duration)
    }
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:removeVideo', async (_event, identity: unknown) => {
    if (typeof identity === 'string') await store.removeVideo(identity)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:removeVeil', async (_event, filePath: unknown) => {
    if (typeof filePath === 'string') await store.removeVeil(filePath)
    return broadcastHistory(store)
  })
  ipcMain.handle('recentHistory:clear', async () => {
    await store.clear()
    return broadcastHistory(store)
  })
}
