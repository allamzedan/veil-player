import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseYouTubeUrl } from './youtubeUrl'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('Open YouTube native text editing', () => {
  it('accepts a normally pasted valid YouTube URL through the unchanged parser', () => {
    const pasted = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const result = parseYouTubeUrl(pasted)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.source.videoId).toBe('dQw4w9WgXcQ')
  })

  it('keeps the URL input as a standard controlled text-editing surface', () => {
    const dialog = read('../components/OpenYouTubeDialog.tsx')
    expect(dialog).toContain('type="url"')
    expect(dialog).toContain('onChange={(event) => {')
    expect(dialog).not.toContain('onPaste=')
    expect(dialog).not.toContain('onKeyDown=')
    expect(dialog).not.toContain('navigator.clipboard')
  })

  it('restores Electron native Edit commands including Paste and Select All', () => {
    const main = read('../../electron/main.ts')
    expect(main).toContain("role: 'undo'")
    expect(main).toContain("role: 'cut'")
    expect(main).toContain("role: 'copy'")
    expect(main).toContain("role: 'paste'")
    expect(main).toContain("role: 'selectAll'")
  })

  it('installs the generic native text-edit context menu on app windows', () => {
    const main = read('../../electron/main.ts')
    expect(main).toContain("window.webContents.on('context-menu'")
    expect(main).toContain('buildTextEditContextMenuTemplate(params)')
    expect(main.match(/attachTextEditContextMenu\(window\)/g)).toHaveLength(2)
    expect(main).toContain('Menu.buildFromTemplate(template).popup({ window })')
  })
})
