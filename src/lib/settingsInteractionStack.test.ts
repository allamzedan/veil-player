import { readFileSync } from 'node:fs'
import { parse, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const modal = readFileSync(new URL('../components/Modal.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const settings = readFileSync(new URL('../components/SettingsDialog.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const stylesheet = parse(styles)

function declarations(selector: string): Record<string, string> {
  const matches = stylesheet.nodes.filter(
    (node): node is Rule => node.type === 'rule' && node.selector === selector
  )
  expect(matches.length, `Missing CSS rule ${selector}`).toBeGreaterThan(0)
  const result: Record<string, string> = {}
  for (const match of matches) {
    match.walkDecls((declaration: Declaration) => { result[declaration.prop] = declaration.value })
  }
  return result
}

describe('Settings interaction and modal stacking', () => {
  it('prevents accidental Settings text selection while preserving editable controls', () => {
    expect(declarations('.modal__panel--settings')['user-select']).toBe('none')
    expect(declarations(
      ".modal__panel--settings :is(input, textarea, [contenteditable='true'])"
    )['user-select']).toBe('text')
    expect(styles).not.toMatch(/(?:^|\n)(?:body|\.app)\s*\{[^}]*user-select:\s*none;/s)
  })

  it('mounts Settings at the document modal layer instead of the player stacking tree', () => {
    expect(modal).toContain("import { createPortal } from 'react-dom'")
    expect(modal).toContain('document.fullscreenElement ?? document.body')
    expect(modal).toContain("mountToDocument ? 'modal modal--app-theme' : 'modal'")
    expect(settings).toMatch(/<Modal\b[^>]*\bmountToDocument\b/)
    expect(declarations('.app--ui-refresh-v1,\n.modal--app-theme')['--surface']).toBe('var(--veil-panel)')
  })

  it('keeps Timeline bookmark focus below the document-level modal stack without an escape z-index', () => {
    const root = declarations(':root')
    expect(root['--z-timeline-interactive']).toBe('6')
    expect(root['--z-modal-backdrop']).toBe('80')
    expect(root['--z-modal-panel']).toBe('90')
    expect(declarations('.timeline-bookmark-marker:hover,\n.timeline-bookmark-marker:focus-visible')['z-index'])
      .toBe('var(--z-timeline-interactive)')
    expect(declarations('.modal')['z-index']).toBe('var(--z-modal-backdrop)')
    expect(declarations('.modal__backdrop')['z-index']).toBe('var(--z-modal-backdrop)')
    expect(declarations('.modal__panel')['z-index']).toBe('var(--z-modal-panel)')
    expect(declarations('.timeline-editor').isolation).toBe('isolate')
    expect(styles).not.toContain('z-index: 999 !important')
  })

  it('keeps modal panel interaction and backdrop coverage intact', () => {
    expect(declarations('.modal')).toMatchObject({ position: 'fixed', inset: '0' })
    expect(declarations('.modal__backdrop')).toMatchObject({ position: 'absolute', inset: '0' })
    expect(declarations('.modal__panel').position).toBe('relative')
  })

  it('does not hide or restack markers as a Settings-open workaround', () => {
    expect(styles).not.toMatch(/settings[^,{]*[,{][^}]*timeline-(?:bookmark|playhead)/s)
    expect(settings).not.toContain('timeline-bookmark-marker')
    expect(settings).not.toContain('timeline-playhead')
  })
})
