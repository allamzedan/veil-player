import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('native dialog modality wiring', () => {
  it('parents Open Media and Load VEIL to the invoking BrowserWindow', () => {
    const media = read('../../electron/ipc/dialogs.ts')
    const tracks = read('../../electron/ipc/trackFiles.ts')
    const launcher = read('../../electron/ipc/launcher.ts')

    expect(media).toContain('dialog.showOpenDialog(parent, {')
    expect(media).toContain('pickVideoFile(BrowserWindow.fromWebContents(event.sender))')
    expect(tracks).toContain('dialog.showOpenDialog(parent, {')
    expect(tracks).toContain('pickTrackFile(BrowserWindow.fromWebContents(event.sender))')
    expect(tracks).toContain('dialog.showSaveDialog(parent, {')
    expect(launcher).toContain('pickVideoFile(BrowserWindow.fromWebContents(event.sender))')
    expect(launcher).toContain('pickTrackFile(BrowserWindow.fromWebContents(event.sender))')
  })

  it('keeps main process authoritative and launcher requests locally pending', () => {
    const mainGuard = read('../../electron/lib/nativeDialogGuard.ts')
    const rendererGuard = read('./nativeOpenDialogGuard.ts')
    const launcher = read('../launcher/LauncherApp.tsx')

    expect(mainGuard).toContain('let nativeFileDialogInFlight = false')
    expect(mainGuard).toContain('nativeFileDialogInFlight = false\n    if (parent && !parent.isDestroyed())')
    expect(rendererGuard).toContain('let nativeOpenDialogInFlight = false')
    expect(launcher).toContain('if (fileDialogPending) return')
    expect(launcher).toContain('disabled={fileDialogPending}')
  })

  it('preserves cancellation paths without media or recent-history mutation', () => {
    const openHook = read('../hooks/useVideoFileOpen.ts')
    const trackHook = read('../hooks/useTrackFileActions.ts')
    const openDialogFlow = openHook.slice(
      openHook.indexOf('const openVideo = async'),
      openHook.indexOf('const openVideoPath')
    )
    expect(openHook).toContain('if (result.canceled || !result.mediaUrl || !result.name) {\n            return')
    expect(trackHook).toContain("if (result.canceled) {\n        onStatus?.(null)\n        return 'canceled'")
    expect(openDialogFlow.indexOf('return\n          }'))
      .toBeLessThan(openDialogFlow.indexOf('openVideoFile('))
  })
})
