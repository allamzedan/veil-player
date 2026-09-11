import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import CompactRangeTiming from '../components/CompactRangeTiming'
import LayerSelectionPreview from '../components/LayerSelectionPreview'

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const bookmarkEditorSource = readFileSync(new URL('../components/BookmarkItemEditor.tsx', import.meta.url), 'utf8')
const trackEditorSource = readFileSync(new URL('../components/TrackEditor.tsx', import.meta.url), 'utf8')
const maskStyleSource = readFileSync(new URL('../components/MaskStyleControls.tsx', import.meta.url), 'utf8')

describe('shared compact layer editors', () => {
  it('renders one content-sized preview contract for bookmarks and ranges', () => {
    const bookmark = renderToStaticMarkup(createElement(LayerSelectionPreview, {
      item: { id: 'b', type: 'bookmark', start: 12, end: 12, label: 'Note', notes: 'Full note' }
    }))
    const range = renderToStaticMarkup(createElement(LayerSelectionPreview, {
      item: { id: 'm', type: 'mute', start: 30, end: 40, label: 'Mute', enabled: true, active: true }
    }))
    expect(bookmark).toContain('layer-selection-preview__note')
    expect(bookmark).toContain('dir="ltr"')
    expect(range).toContain('0:10')
    expect(range).toContain('active')
  })

  it('uses one state-driven editor size and fixed body/footer contract', () => {
    expect(styles.match(/--layer-editor-size:\s*clamp\(220px, 38%, 340px\)/g)).toHaveLength(1)
    expect(styles).toMatch(/\.selected-layer-panel-region--preview\s*\{[^}]*max-block-size:\s*25%/s)
    expect(styles).toMatch(/\.selected-item-editor__body\s*\{[^}]*overflow-y:\s*auto/s)
    expect(styles).toMatch(/\.selected-item-editor__actions--footer\s*\{[^}]*flex:\s*0 0 auto/s)
  })

  it('keeps the timing operation order and explicit accessible names', () => {
    const html = renderToStaticMarkup(createElement(CompactRangeTiming, {
      startInput: '0:10', endInput: '0:20', durationReadout: '0:10', durationSeconds: 10,
      onStartChange: vi.fn(), onEndChange: vi.fn(), onNudge: vi.fn(), onCommit: vi.fn()
    }))
    expect(html.indexOf('Decrease start time by 1 second')).toBeLessThan(html.indexOf('value="0:10"'))
    expect(html.indexOf('value="0:10"')).toBeLessThan(html.indexOf('Increase start time by 1 second'))
    expect(html).toContain('Decrease end time by 1 second')
    expect(html).toContain('Increase end time by 1 second')
    expect(html).toContain('compact-range-timing__arrow')
    expect(html).toContain('aria-label="Duration: 10 seconds"')
    expect(html).toContain('dir="ltr"')
    expect(html).toContain('compact-range-timing__duration')
    expect(html.match(/compact-range-timing__pill/g)).toHaveLength(2)
  })

  it('renders a read-only bookmark timestamp, bounded fields, and shared trash action', () => {
    expect(bookmarkEditorSource).toMatch(/selected-item-editor__timestamp-pill/)
    expect(bookmarkEditorSource).not.toMatch(/track-editor__input--timing/)
    expect(bookmarkEditorSource).toMatch(/rows=\{3\}/)
    expect(bookmarkEditorSource).toMatch(/aria-label="Delete layer"/)
    expect(bookmarkEditorSource).toMatch(/title="Delete bookmark"/)
  })

  it('integrates shared timing, compact mask disclosures, and trash in range editors', () => {
    expect(trackEditorSource).toMatch(/<CompactRangeTiming\b/)
    expect(trackEditorSource).toMatch(/<MaskStyleControls\b/)
    expect(trackEditorSource).toMatch(/selected-item-editor__actions--footer/)
    expect(trackEditorSource).toMatch(/aria-label="Delete layer"/)
    expect(maskStyleSource).toMatch(/mask-style-controls__appearance-grid/)
    expect(maskStyleSource).toMatch(/aria-valuetext=\{`\$\{opacityPercent\}%`\}/)
    expect(maskStyleSource).toMatch(/aria-expanded=\{presentationOpen\}/)
  })
})
