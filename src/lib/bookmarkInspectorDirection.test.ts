import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('refreshed Inspector bookmark presentation', () => {
  const inspector = read('../components/InspectorPanel.tsx')
  const editor = read('../components/BookmarkItemEditor.tsx')
  const preview = read('../components/LayerSelectionPreview.tsx')
  const styles = read('../styles.css')

  it('applies automatic direction independently to bookmark labels and notes', () => {
    expect(inspector).toMatch(/className="bookmark-navigation__label"\s+dir="auto"/)
    expect(inspector).toMatch(/className="bookmark-navigation__note"\s+dir="auto"/)
    expect(styles).toMatch(/\.bookmark-navigation__label,\s*\.bookmark-navigation__note\s*\{[^}]*text-align:\s*start;[^}]*unicode-bidi:\s*plaintext;/s)
    expect(inspector).not.toMatch(/<li[^>]+dir="auto"/)
    expect(inspector).not.toMatch(/bookmark-navigation__row[^>]+dir="auto"/)
  })

  it('keeps timestamps in a fixed LTR run beside independently directed labels', () => {
    expect(inspector).toMatch(/bookmark-navigation__timestamp ltr-digits/)
    expect(styles).toMatch(/\.bookmark-navigation__bookmark-heading\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\);/s)
  })

  it('keeps actions in a fixed column and reserves wrapping space for long text', () => {
    expect(styles).toMatch(/\.inspector-navigation-list__item\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s)
    expect(styles).toMatch(/\.inspector-navigation-list__actions\s*\{[^}]*justify-self:\s*end;[^}]*direction:\s*ltr;/s)
    expect(styles).toMatch(/\.bookmark-navigation__text strong,\s*\.bookmark-navigation__text small\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*word-break:\s*break-word;/s)
  })

  it('uses readable secondary text in normal and selected bookmark rows', () => {
    expect(styles).toMatch(/\.inspector-navigation-list__item \.bookmark-navigation__note\s*\{[^}]*var\(--veil-text-secondary\)/s)
    expect(styles).toMatch(/\.inspector-navigation-list__item--selected \.bookmark-navigation__note\s*\{[^}]*var\(--veil-text-secondary\)/s)
    expect(styles).toContain('border-inline-start-color: var(--veil-bookmark)')
  })

  it('clamps row notes and exposes full preview text accessibly', () => {
    expect(styles).toMatch(/\.inspector-navigation-list__item \.bookmark-navigation__note\s*{[^}]*-webkit-line-clamp:\s*3;[^}]*text-overflow:\s*ellipsis;/s)
    expect(preview).toContain('layer-selection-preview__note')
    expect(preview).toContain('dir="auto" title={note}')
    expect(styles).toMatch(/\.layer-selection-preview__label,\s*\.layer-selection-preview__note\s*\{[^}]*text-overflow:\s*ellipsis;[^}]*unicode-bidi:\s*plaintext;/s)
  })

  it('preserves automatic direction while editing without changing handlers', () => {
    expect(editor.match(/dir="auto"/g)).toHaveLength(2)
    expect(editor).toContain('onChange={(event) => setLabelInput(event.target.value)}')
    expect(editor).toContain('onChange={(event) => setNotesInput(event.target.value)}')
    expect(editor).toContain('onClick={apply}')
    expect(editor).toContain('onClick={remove}')
  })

  it('leaves bookmark toast presentation and action semantics separate', () => {
    expect(inspector).toContain('void copyBookmark(row.item)')
    expect(inspector).toContain('removeNavigationItem(row)')
    expect(inspector).toContain('formatBookmarkClipboardText(bookmark)')
    expect(inspector).toContain('requestBookmarkToast(row.item.id)')
  })
})
