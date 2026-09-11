import { stat } from 'node:fs/promises'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { withOpenVideoDialogGuard } from '../lib/nativeDialogGuard'
import type { NativeConfirmOptions } from '../../src/types/nativeDialog'
import { isNativeConfirmAccepted, NATIVE_CONFIRM_BUTTONS, NATIVE_CONFIRM_CANCEL_ID } from '../lib/nativeConfirmResponse'
import {
  APPROVED_AUDIO_EXTENSIONS,
  APPROVED_MEDIA_EXTENSIONS,
  APPROVED_VIDEO_EXTENSIONS,
  buildPrivilegedVeilMediaUrl,
  getApprovedAbsolutePath,
  registerApprovedMediaPath,
  releaseApprovedMedia
} from './approvedMedia'
import { openVideoFromPath } from './openVideoPath'

const MEDIA_FILTERS = [
  {
    name: 'Media',
    extensions: [...APPROVED_MEDIA_EXTENSIONS]
  },
  {
    name: 'Video',
    extensions: [...APPROVED_VIDEO_EXTENSIONS]
  },
  {
    name: 'Audio',
    extensions: [...APPROVED_AUDIO_EXTENSIONS]
  }
]

export interface PickVideoFileResult {
  canceled: boolean
  mediaUrl: string | null
  name: string | null
  size: number | null
  filePath: string | null
}

/** Native open-video dialog; registers path for veil-media. Shared by renderer IPC and launcher. */
export async function pickVideoFile(parent: BrowserWindow | null): Promise<PickVideoFileResult> {
  let guarded: PickVideoFileResult | null
  try {
    guarded = await withOpenVideoDialogGuard(parent, async () => {
    if (!parent || parent.isDestroyed()) {
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      } as const
    }
    const result = await dialog.showOpenDialog(parent, {
      title: 'Open Media',
      properties: ['openFile'],
      filters: MEDIA_FILTERS
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      } as const
    }

    const filePath = result.filePaths[0]
    const name = filePath.split(/[/\\]/).pop() ?? filePath

    let mediaId: string
    try {
      mediaId = registerApprovedMediaPath(filePath)
    } catch (err) {
      console.error('[VEIL] registerApprovedMediaPath rejected path:', err)
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      } as const
    }

    const normalizedPath = getApprovedAbsolutePath(mediaId)
    if (!normalizedPath) {
      console.error('[VEIL] media id missing from registry after register:', mediaId)
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      } as const
    }

    let size: number | null = null
    try {
      const stats = await stat(normalizedPath)
      size = stats.size
    } catch {
      releaseApprovedMedia(mediaId)
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      } as const
    }

    const mediaUrl = buildPrivilegedVeilMediaUrl(mediaId)

    return {
      canceled: false,
      mediaUrl,
      name,
      size,
      filePath: normalizedPath
    } as const
    })
  } catch (error) {
    console.error('[VEIL] Open Media dialog failed:', error)
    guarded = null
  }

  if (!guarded) {
    return {
      canceled: true,
      mediaUrl: null,
      name: null,
      size: null,
      filePath: null
    }
  }

  return guarded
}

/**
 * Only this module should approve playable local files for veil-media.
 * Dialog extension filters are for UX; extension checks in registerApprovedMediaPath are the guard.
 */
export function registerDialogHandlers(): void {
  ipcMain.on('dialog:confirm', (event, payload: unknown) => {
    let accepted = false
    if (!payload || typeof payload !== 'object') { event.returnValue = accepted; return }
    const { title, message } = payload as Partial<NativeConfirmOptions>
    if (
      typeof title !== 'string' || title.length === 0 || title.length > 120 ||
      typeof message !== 'string' || message.length === 0 || message.length > 2000
    ) { event.returnValue = accepted; return }

    const parent = BrowserWindow.fromWebContents(event.sender)
    const options = {
      type: 'question' as const,
      title,
      message,
      buttons: [...NATIVE_CONFIRM_BUTTONS],
      cancelId: NATIVE_CONFIRM_CANCEL_ID,
      defaultId: 0,
      noLink: true
    }
    const response = parent && !parent.isDestroyed()
      ? dialog.showMessageBoxSync(parent, options)
      : dialog.showMessageBoxSync(options)
    accepted = isNativeConfirmAccepted(response)
    event.returnValue = accepted
  })
  ipcMain.handle('dialog:openVideo', async (event) =>
    pickVideoFile(BrowserWindow.fromWebContents(event.sender)))

  ipcMain.handle('dialog:openVideoPath', async (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      }
    }

    const result = await openVideoFromPath(filePath)
    if (!result.ok) {
      return {
        canceled: true,
        mediaUrl: null,
        name: null,
        size: null,
        filePath: null
      }
    }

    return {
      canceled: false,
      mediaUrl: result.mediaUrl ?? null,
      name: result.name ?? null,
      size: result.size ?? null,
      filePath: result.filePath ?? null
    }
  })
}
