import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('desktop text-selection policy', () => {
  it('disables selection for shared chrome and restores it for editable fields', () => {
    expect(styles).toContain('.app :is(button, .app-header, .app-menu, .player-controls, .timeline-editor')
    expect(styles).toContain('user-select: none;')
    expect(styles).toContain('.app :is(input, textarea, select, [contenteditable=true])')
    expect(styles).toContain('user-select: text;')
  })
})
