import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'

export const AUDIO_WATCH_WINDOW = {
  width: 780,
  height: 420,
  minWidth: 720,
  minHeight: 390
} as const

export const AUDIO_WATCH_ACCEPTABLE = {
  minWidth: 740,
  maxWidth: 800,
  minHeight: 390,
  maxHeight: 430
} as const

export const VIDEO_DEFAULT_WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 600
} as const

export type WindowLayoutPreset = 'audio-watch' | 'video-default'

function isWithinAudioWatchAcceptable(width: number, height: number): boolean {
  return (
    width >= AUDIO_WATCH_ACCEPTABLE.minWidth &&
    width <= AUDIO_WATCH_ACCEPTABLE.maxWidth &&
    height >= AUDIO_WATCH_ACCEPTABLE.minHeight &&
    height <= AUDIO_WATCH_ACCEPTABLE.maxHeight
  )
}

function isNearVideoDefault(width: number, height: number, tolerance = 48): boolean {
  return (
    Math.abs(width - VIDEO_DEFAULT_WINDOW.width) <= tolerance &&
    Math.abs(height - VIDEO_DEFAULT_WINDOW.height) <= tolerance
  )
}

function shouldApplyAudioWatchSize(width: number, height: number): boolean {
  if (isNearVideoDefault(width, height)) {
    return true
  }
  return !isWithinAudioWatchAcceptable(width, height)
}

let savedVideoBounds: { width: number; height: number } | null = null
let lastPreset: WindowLayoutPreset | null = null

export function applyWindowLayoutPreset(
  window: BrowserWindow,
  preset: WindowLayoutPreset
): { applied: boolean; preset: WindowLayoutPreset } {
  if (window.isDestroyed() || window.isMaximized() || window.isFullScreen()) {
    return { applied: false, preset }
  }

  const bounds = window.getBounds()

  if (preset === 'audio-watch') {
    if (lastPreset !== 'audio-watch') {
      savedVideoBounds = { width: bounds.width, height: bounds.height }
    }
    window.setMinimumSize(AUDIO_WATCH_WINDOW.minWidth, AUDIO_WATCH_WINDOW.minHeight)
    if (shouldApplyAudioWatchSize(bounds.width, bounds.height)) {
      window.setSize(AUDIO_WATCH_WINDOW.width, AUDIO_WATCH_WINDOW.height, true)
    }
    lastPreset = 'audio-watch'
    return { applied: true, preset }
  }

  window.setMinimumSize(VIDEO_DEFAULT_WINDOW.minWidth, VIDEO_DEFAULT_WINDOW.minHeight)
  const restore = savedVideoBounds ?? {
    width: VIDEO_DEFAULT_WINDOW.width,
    height: VIDEO_DEFAULT_WINDOW.height
  }
  const targetWidth = Math.max(restore.width, VIDEO_DEFAULT_WINDOW.minWidth)
  const targetHeight = Math.max(restore.height, VIDEO_DEFAULT_WINDOW.minHeight)
  if (
    lastPreset === 'audio-watch' ||
    isWithinAudioWatchAcceptable(bounds.width, bounds.height)
  ) {
    window.setSize(targetWidth, targetHeight, true)
  }
  lastPreset = 'video-default'
  return { applied: true, preset }
}

export function registerWindowControlHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', () => {
    const window = getMainWindow()
    if (!window) {
      return { maximized: false }
    }

    if (window.isMaximized()) {
      window.unmaximize()
      return { maximized: false }
    }

    window.maximize()
    return { maximized: true }
  })

  ipcMain.handle('window:isMaximized', () => getMainWindow()?.isMaximized() ?? false)

  ipcMain.handle('window:requestClose', () => {
    const window = getMainWindow()
    if (!window || window.isDestroyed()) {
      return
    }
    window.webContents.send('app:close-requested')
  })

  ipcMain.handle('window:applyLayoutPreset', (_event, preset: unknown) => {
    if (preset !== 'audio-watch' && preset !== 'video-default') {
      return { ok: false as const, error: 'invalid-preset' }
    }
    const window = getMainWindow()
    if (!window || window.isDestroyed()) {
      return { ok: false as const, error: 'no-window' }
    }
    const result = applyWindowLayoutPreset(window, preset)
    return { ok: true as const, ...result }
  })
}

export function attachWindowStateEvents(window: BrowserWindow): void {
  const notify = (): void => {
    if (window.isDestroyed()) {
      return
    }
    window.webContents.send('window:maximized-changed', window.isMaximized())
  }

  window.on('maximize', notify)
  window.on('unmaximize', notify)
}
