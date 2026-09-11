import { readFileSync } from 'node:fs'
import { parse, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const styles = read('../styles.css')
const stylesheet = parse(styles)

function declaration(selector: string, property: string): string | undefined {
  const rule = stylesheet.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector
  )
  let value: string | undefined
  rule?.walkDecls(property, (decl: Declaration) => { value = decl.value })
  return value
}

describe('visual layout recovery', () => {
  it('keeps the stylesheet structurally valid and feature additions scoped', () => {
    expect(stylesheet.type).toBe('root')
    expect(declaration('.settings-dialog__row', 'display')).toBe('flex')
    expect(declaration('.subtitle-sheet__section', 'display')).toBe('flex')
    expect(declaration('.inspector-navigation-search input', 'box-sizing')).toBe('border-box')
    expect(declaration('.compact-range-timing__strip', 'display')).toBe('flex')

    const newSelectors = [
      '.settings-dialog__subsection',
      '.settings-dialog__subsection h4,\n.settings-dialog__subheading',
      '.subtitle-sheet__loaded-state',
      '.subtitle-sheet__quick-actions',
      '.inspector-bookmark-tools',
      '.inspector-navigation-search-tools',
      '.inspector-navigation-search',
      '.inspector-navigation-search input',
      '.inspector-navigation-search input:focus-visible'
    ]
    for (const selector of newSelectors) {
      expect(stylesheet.nodes.some((node) => node.type === 'rule' && node.selector === selector)).toBe(true)
    }
  })

  it('preserves horizontal Timeline concept groups and lane geometry', () => {
    const controls = read('../components/TimelineControls.tsx')
    const zoom = controls.indexOf('data-timeline-group="zoom"')
    const navigate = controls.indexOf('data-timeline-group="navigate-edit"')
    const layers = controls.indexOf('data-timeline-group="layers"')
    expect(zoom).toBeGreaterThanOrEqual(0)
    expect(navigate).toBeGreaterThan(zoom)
    expect(layers).toBeGreaterThan(navigate)
    expect(declaration('.player-chrome-timeline--refresh .timeline-controls--concept-a', 'display')).toBe('flex')
    expect(declaration('.player-chrome-timeline--refresh .timeline-controls--concept-a', 'flex-wrap')).toBe('nowrap')
    expect(declaration('.player-chrome-timeline--refresh .timeline-controls__concept-actions', 'display')).toBe('flex')
    expect(declaration('.player-chrome-timeline--refresh .timeline-controls__concept-actions', 'flex-wrap')).toBe('nowrap')
    expect(declaration('.timeline-editor__viewport-shell', 'grid-template-columns')).toBe('4.5rem minmax(0, 1fr)')
  })

  it('keeps search and export inside the existing Inspector navigate list', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const list = inspector.indexOf('data-inspector-layer-list')
    const tools = inspector.indexOf('className="inspector-navigation-search-tools"', list)
    const chapters = inspector.indexOf('<ChapterNavigationList', list)
    const rows = inspector.indexOf('className="bookmark-navigation__list inspector-navigation-list"', list)
    expect(list).toBeGreaterThanOrEqual(0)
    expect(tools).toBeGreaterThan(list)
    expect(chapters).toBeGreaterThan(tools)
    expect(rows).toBeGreaterThan(chapters)
    expect(inspector).toContain('inspector-navigation-types__button--export')
  })
})
