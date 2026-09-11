import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('fixed timeline lane headers', () => {
  const editor = read('../components/TimelineEditor.tsx')
  const row = read('../components/TimelineRow.tsx')
  const styles = read('../styles.css')

  it('renders lane headers as a sibling before the horizontal viewport', () => {
    expect(editor.indexOf('timeline-editor__lane-headers')).toBeLessThan(editor.indexOf('ref={viewportRef}'))
    expect(row).not.toContain('timeline-row__label')
    expect(styles).toMatch(/\.timeline-editor__viewport-shell\s*\{[^}]*grid-template-columns:\s*4\.5rem minmax\(0, 1fr\)/s)
    expect(styles).toMatch(/\.timeline-editor__lane-headers \+ \.timeline-editor__viewport\s*\{[^}]*grid-column:\s*2/s)
  })

  it('keeps source-derived labels aligned without adding them to virtual content width', () => {
    expect(editor).toContain("capabilities.canCreateMask && subtitleMasks.length > 0")
    expect(editor).toContain("capabilities.canCreateMuteRange")
    expect(editor).toContain("capabilities.canCreateSkipRange")
    expect(styles).not.toContain('--timeline-label-col')
    expect(styles).not.toContain('--timeline-col-gap')
  })

  it('keeps pointer geometry delegated to the existing authoritative helper', () => {
    expect(editor).toContain('timelineTimeFromPointer({')
    expect(editor).toContain('trackLeft: viewportRect.left')
    expect(editor).toContain('visibleTrackWidth: viewportRect.width')
  })
})
