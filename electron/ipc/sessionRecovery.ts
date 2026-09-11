import { ipcMain } from 'electron'
import {
  SessionRecoveryStore,
  parseSessionRecoverySnapshot,
  type SessionRecoverySnapshot
} from '../lib/sessionRecoveryStore'

export function registerSessionRecoveryHandlers(store: SessionRecoveryStore): void {
  ipcMain.handle('sessionRecovery:read', async (): Promise<SessionRecoverySnapshot | null> => {
    return store.read()
  })

  ipcMain.handle('sessionRecovery:write', async (_event, value: unknown): Promise<boolean> => {
    const snapshot = parseSessionRecoverySnapshot(value)
    if (!snapshot) return false
    try {
      return await store.write(snapshot)
    } catch {
      return false
    }
  })

  ipcMain.handle('sessionRecovery:clear', async (): Promise<boolean> => {
    try {
      await store.clear()
      return true
    } catch {
      return false
    }
  })
}
