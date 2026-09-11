import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('bookmark CSV export integration', () => {
  it('uses the existing guarded save-dialog and UTF-8 write architecture', () => {
    const ipc = read('../../electron/ipc/trackFiles.ts')
    expect(ipc).toContain("ipcMain.handle('bookmark:exportCsv'")
    expect(ipc).toContain('withSaveTrackDialogGuard(parent')
    expect(ipc).toContain("filters: [{ name: 'CSV file', extensions: ['csv'] }]")
    expect(ipc).toContain("await writeFile(filePath, csv, 'utf8')")
  })

  it('treats cancellation as non-writing and reports zero bookmarks before IPC', () => {
    const ipc = read('../../electron/ipc/trackFiles.ts')
    const inspector = read('../components/InspectorPanel.tsx')
    const canceled = ipc.indexOf('if (!result || result.canceled || !result.filePath)')
    const write = ipc.indexOf("await writeFile(filePath, csv, 'utf8')")
    expect(canceled).toBeGreaterThanOrEqual(0)
    expect(write).toBeGreaterThan(canceled)
    expect(inspector).toContain("pushWarningToast(t('bookmarks.exportEmpty'))")
    expect(inspector).toContain('if (result?.ok)')
  })
})
