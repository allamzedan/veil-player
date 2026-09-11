import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { parseSrt } from './srtParser'
import { useVeilStore } from '../state/useVeilStore'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const originalState = useVeilStore.getState()
afterEach(() => useVeilStore.setState(originalState, true))

describe('simplified subtitle workflow', () => {
  it('loads and replaces SRT cues through the same file input path', () => {
    const controls = read('../components/SrtImportControls.tsx')
    expect(controls).toContain('setSubtitleCues(cues)')
    expect(controls).toContain('setSubtitleFileName(file.name)')
    expect(controls).not.toContain('appendSubtitleCues(cues)')
    expect(controls).not.toContain("t('subtitles.appendConfirm'")
    expect(controls.match(/onClick=\{onImportClick\}/g)?.length).toBeGreaterThanOrEqual(2)
    expect(parseSrt('1\n00:00:01,000 --> 00:00:02,000\nHello').cues).toHaveLength(1)
  })

  it('hides and shows text without unloading cues or the filename', () => {
    const cue = { id: 'cue-1', index: 1, start: 1, end: 2, text: 'مرحبا' }
    useVeilStore.setState({ subtitleCues: [cue], subtitleFileName: 'arabic.srt', showSubtitleText: true })
    useVeilStore.getState().setShowSubtitleText(false)
    expect(useVeilStore.getState().subtitleCues).toEqual([cue])
    expect(useVeilStore.getState().subtitleFileName).toBe('arabic.srt')
    useVeilStore.getState().setShowSubtitleText(true)
    expect(useVeilStore.getState().showSubtitleText).toBe(true)
  })

  it('presents the loaded filename compactly with its full title', () => {
    const controls = read('../components/SrtImportControls.tsx')
    const styles = read('../styles.css')
    expect(controls).toContain('dir="auto" title={subtitleFileName ?? undefined}')
    expect(controls).toContain("t('subtitles.replaceSubtitle')")
    expect(styles).toContain('text-overflow: ellipsis;')
    expect(styles).toContain('white-space: nowrap;')
  })
})
