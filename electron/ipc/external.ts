import { ipcMain, shell } from 'electron'

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function registerExternalHandlers(): void {
  ipcMain.handle('shell:openExternal', async (_event, url: unknown) => {
    if (typeof url !== 'string' || !isHttpsUrl(url)) {
      return { ok: false as const, error: 'invalid_url' }
    }

    try {
      await shell.openExternal(url)
      return { ok: true as const }
    } catch {
      return { ok: false as const, error: 'open_failed' }
    }
  })
}
