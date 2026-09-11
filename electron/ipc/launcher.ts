import { existsSync } from 'node:fs'
import { BrowserWindow, ipcMain } from 'electron'
import { pickVideoFile } from './dialogs'
import { pickTrackFile } from './trackFiles'

export type LauncherAction = 'home' | 'openVideo' | 'loadVeil' | 'openYouTube' | 'settings'

export type StartupAction =
  | 'openVideo'
  | 'loadVeil'
  | 'openYouTube'
  | 'settings'
  | { type: 'openVideoPath'; filePath: string }
  | { type: 'loadVeilPath'; filePath: string; openEditModeAfterLoad?: boolean }
  | { type: 'openYouTubeUrl'; url: string }
  | { type: 'recentFileMissing'; kind: 'video' | 'veil'; filePath: string }

export interface LauncherController {
  showMain: (action: LauncherAction, startup?: StartupAction) => void
  getLauncherWindow: () => BrowserWindow | null
}

const RELEASE_NOTES_URL = 'https://github.com/allamzedan/veilplayer/releases'

function pathExists(filePath: string): boolean {
  try {
    return existsSync(filePath)
  } catch {
    return false
  }
}

export function registerLauncherHandlers(controller: LauncherController): void {
  const finish = (action: LauncherAction, startup?: StartupAction): void => {
    controller.showMain(action, startup)
  }

  ipcMain.handle('launcher:openVideo', async (event) => {
    const picked = await pickVideoFile(BrowserWindow.fromWebContents(event.sender))
    if (picked.canceled || !picked.filePath) return { ok: false, canceled: true }
    finish('openVideo', { type: 'openVideoPath', filePath: picked.filePath })
    return { ok: true, filePath: picked.filePath }
  })

  ipcMain.handle('launcher:loadVeil', async (event) => {
    const picked = await pickTrackFile(BrowserWindow.fromWebContents(event.sender))
    if (picked.canceled || !picked.filePath) return { ok: false, canceled: true }
    finish('loadVeil', {
      type: 'loadVeilPath',
      filePath: picked.filePath,
      openEditModeAfterLoad: true
    })
    return { ok: true, filePath: picked.filePath }
  })

  ipcMain.handle('launcher:openYouTube', () => {
    finish('openYouTube', 'openYouTube')
    return { ok: true }
  })

  ipcMain.handle('launcher:openHome', () => {
    finish('home')
  })

  ipcMain.handle('launcher:openSettings', () => {
    finish('settings', 'settings')
  })

  ipcMain.handle('launcher:openVideoPath', (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || filePath.length === 0) return { ok: false }
    if (!pathExists(filePath)) {
      finish('openVideo', { type: 'recentFileMissing', kind: 'video', filePath })
      return { ok: false, missing: true }
    }
    finish('openVideo', { type: 'openVideoPath', filePath })
    return { ok: true }
  })

  ipcMain.handle('launcher:loadVeilPath', (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || filePath.length === 0) return { ok: false }
    if (!pathExists(filePath)) {
      finish('loadVeil', { type: 'recentFileMissing', kind: 'veil', filePath })
      return { ok: false, missing: true }
    }
    finish('loadVeil', { type: 'loadVeilPath', filePath, openEditModeAfterLoad: true })
    return { ok: true }
  })

  ipcMain.handle('launcher:openYouTubeUrl', (_event, url: unknown) => {
    if (typeof url !== 'string' || url.length === 0) return { ok: false }
    finish('openYouTube', { type: 'openYouTubeUrl', url })
    return { ok: true }
  })

  ipcMain.handle('launcher:minimize', () => {
    controller.getLauncherWindow()?.minimize()
  })

  ipcMain.handle('launcher:openReleaseNotes', async () => {
    const { shell } = await import('electron')
    await shell.openExternal(RELEASE_NOTES_URL)
  })
}

export function sendStartupActionToMain(mainWindow: BrowserWindow, action: StartupAction): void {
  const send = (): void => {
    mainWindow.webContents.send('startup:action', action)
  }

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', send)
    return
  }

  send()
}
