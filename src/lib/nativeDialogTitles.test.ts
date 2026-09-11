import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmNative } from './nativeConfirm'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

afterEach(() => vi.unstubAllGlobals())

describe('contextual native dialogs', () => {
  it('passes an explicit title and body through the Electron bridge', () => {
    const confirmDialog = vi.fn(() => true)
    vi.stubGlobal('window', { veil: { confirmDialog }, confirm: vi.fn() })

    expect(confirmNative('Delete Mute', 'Delete this Mute?')).toBe(true)
    expect(confirmDialog).toHaveBeenCalledWith({ title: 'Delete Mute', message: 'Delete this Mute?' })
  })

  it('preserves confirm and cancel results and the browser fallback', () => {
    const confirmDialog = vi.fn(() => false)
    const fallback = vi.fn(() => true)
    vi.stubGlobal('window', { veil: { confirmDialog }, confirm: fallback })
    expect(confirmNative('Discard Changes', 'Discard unsaved editor changes?')).toBe(false)
    expect(fallback).not.toHaveBeenCalled()

    vi.stubGlobal('window', { confirm: fallback })
    expect(confirmNative('Discard Changes', 'Discard unsaved editor changes?')).toBe(true)
    expect(fallback).toHaveBeenCalledWith('Discard unsaved editor changes?')
  })

  it('uses owner-bound native message boxes with safe OK/Cancel defaults', () => {
    const dialogs = read('../../electron/ipc/dialogs.ts')
    expect(dialogs).toContain("ipcMain.on('dialog:confirm'")
    expect(dialogs).toContain('dialog.showMessageBoxSync(parent, options)')
    expect(dialogs).toContain('buttons: [...NATIVE_CONFIRM_BUTTONS]')
    expect(dialogs).toContain('cancelId: NATIVE_CONFIRM_CANCEL_ID')
    expect(dialogs).toContain('defaultId: 0')
  })

  it('titles audited destructive and file workflows contextually', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const fullscreen = read('../components/FullscreenEditOverlay.tsx')
    const tracks = read('../../electron/ipc/trackFiles.ts')
    const media = read('../../electron/ipc/dialogs.ts')
    expect(inspector).toContain("t('dialog.deleteTitle'")
    expect(inspector).toContain("t('dialog.discardChanges')")
    expect(fullscreen).toContain("t('dialog.deleteTitle'")
    expect(fullscreen).toContain("t('dialog.discardChanges')")
    expect(tracks).toContain("title: 'Open VEIL File'")
    expect(tracks).toContain("title: 'Save VEIL File'")
    expect(tracks).toContain("title: 'Export Bookmarks'")
    expect(media).toContain("title: 'Open Media'")
  })
})
