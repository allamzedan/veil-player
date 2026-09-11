import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { withOpenTrackDialogGuard, withSaveTrackDialogGuard } from '../lib/nativeDialogGuard'
import { normalizeTrackSavePath } from '../../src/lib/trackFilenames'
import { atomicWriteTextFile } from '../lib/atomicFile'

const TRACK_FILTERS = [
  {
    name: 'VEIL file',
    extensions: ['veil', 'veil.json', 'json']
  }
]

export interface TrackJsonSaveOptions {
  saveAs?: boolean
  filePath?: string | null
}

export interface TrackJsonIpcResult {
  ok: boolean
  canceled: boolean
  error?: string
  json?: string | null
  filePath?: string | null
}

/** Native open-track dialog. Shared by renderer IPC and launcher. */
export async function pickTrackFile(parent: BrowserWindow | null): Promise<TrackJsonIpcResult> {
  let guarded: TrackJsonIpcResult | null
  try {
    guarded = await withOpenTrackDialogGuard(parent, async () => {
    if (!parent || parent.isDestroyed()) {
      return { ok: false, canceled: true, json: null } as const
    }
    const result = await dialog.showOpenDialog(parent, {
      title: 'Open VEIL File',
      properties: ['openFile'],
      filters: TRACK_FILTERS
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true, json: null } as const
    }

    try {
      const filePath = result.filePaths[0]
      const json = await readFile(filePath, 'utf8')
      return { ok: true, canceled: false, json, filePath } as const
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read track file'
      return { ok: false, canceled: false, error: message, json: null } as const
    }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open track dialog'
    return { ok: false, canceled: false, error: message, json: null }
  }

  if (!guarded) {
    return { ok: false, canceled: true, json: null }
  }

  return guarded
}

export function registerTrackFileHandlers(): void {
  ipcMain.handle(
    'track:saveJson',
    async (
      event,
      trackJson: string,
      options?: TrackJsonSaveOptions
    ): Promise<TrackJsonIpcResult> => {
      if (typeof trackJson !== 'string') {
        return { ok: false, canceled: false, error: 'Invalid track payload' }
      }

      const saveAs = options?.saveAs === true
      const existingPath =
        typeof options?.filePath === 'string' && options.filePath.length > 0
          ? options.filePath
          : null

      if (!saveAs && existingPath) {
        try {
          const normalizedPath = normalizeTrackSavePath(existingPath)
          await atomicWriteTextFile(normalizedPath, trackJson)
          return { ok: true, canceled: false, filePath: normalizedPath }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to write track file'
          return { ok: false, canceled: false, error: message }
        }
      }

      const parent = BrowserWindow.fromWebContents(event.sender)
      let result
      try {
        result = await withSaveTrackDialogGuard(parent, async () => {
          if (!parent || parent.isDestroyed()) {
            return null
          }
          return dialog.showSaveDialog(parent, {
            title: 'Save VEIL File',
            filters: TRACK_FILTERS,
            defaultPath: existingPath ? normalizeTrackSavePath(existingPath) : 'track.veil'
          })
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open save dialog'
        return { ok: false, canceled: false, error: message }
      }

      if (!result || result.canceled || !result.filePath) {
        return { ok: false, canceled: true }
      }

      try {
        const normalizedPath = normalizeTrackSavePath(result.filePath)
        await atomicWriteTextFile(normalizedPath, trackJson)
        return { ok: true, canceled: false, filePath: normalizedPath }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to write track file'
        return { ok: false, canceled: false, error: message }
      }
    }
  )

  ipcMain.handle('track:loadJson', async (event): Promise<TrackJsonIpcResult> =>
    pickTrackFile(BrowserWindow.fromWebContents(event.sender)))

  ipcMain.handle('track:loadJsonFromPath', async (_event, filePath: unknown): Promise<TrackJsonIpcResult> => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return { ok: false, canceled: true, json: null }
    }

    try {
      const json = await readFile(filePath, 'utf8')
      return { ok: true, canceled: false, json, filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read track file'
      return { ok: false, canceled: false, error: message, json: null }
    }
  })

  ipcMain.handle('bookmark:exportCsv', async (event, csv: unknown, defaultFileName: unknown): Promise<TrackJsonIpcResult> => {
    if (typeof csv !== 'string' || csv.length === 0 || typeof defaultFileName !== 'string') {
      return { ok: false, canceled: false, error: 'Invalid bookmark export payload' }
    }

    const parent = BrowserWindow.fromWebContents(event.sender)
    let result
    try {
      result = await withSaveTrackDialogGuard(parent, async () => {
        if (!parent || parent.isDestroyed()) return null
        return dialog.showSaveDialog(parent, {
          title: 'Export Bookmarks',
          filters: [{ name: 'CSV file', extensions: ['csv'] }],
          defaultPath: basename(defaultFileName).replace(/\.csv$/i, '') + '.csv'
        })
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open bookmark export dialog'
      return { ok: false, canceled: false, error: message }
    }

    if (!result || result.canceled || !result.filePath) {
      return { ok: false, canceled: true }
    }

    const filePath = result.filePath.toLowerCase().endsWith('.csv')
      ? result.filePath
      : `${result.filePath}.csv`
    try {
      await writeFile(filePath, csv, 'utf8')
      return { ok: true, canceled: false, filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write bookmark CSV'
      return { ok: false, canceled: false, error: message }
    }
  })
}
