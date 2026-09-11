import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { navigationSearchPlaceholderKey } from './navigationSearch'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('collapsible contextual Navigate search', () => {
  it.each([
    [null, 'inspector.searchVeilItems'],
    ['mask', 'inspector.searchMasks'],
    ['mute', 'inspector.searchMutes'],
    ['skip', 'inspector.searchSkips'],
    ['bookmark', 'inspector.searchBookmarks']
  ] as const)('maps %s to its contextual placeholder', (type, key) => {
    expect(navigationSearchPlaceholderKey(type)).toBe(key)
  })

  it('is hidden by default and opens from a compact accessible utility', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain('useState(false)')
    expect(inspector).toContain('navigationSearchOpen || navigationQuery.length > 0')
    expect(inspector).toContain("aria-label={t('inspector.openSearch')}")
    expect(inspector).toContain('onClick={() => setNavigationSearchOpen(true)}')
    expect(inspector).toContain('{navigationSearchVisible ? (')
  })

  it('autofocuses, preserves the query across filters, and closes only after clearing', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain('navigationSearchRef.current?.focus()')
    expect(inspector).toContain('ref={navigationSearchRef}')
    expect(inspector).toContain("event.key === 'Escape' && navigationQuery.length === 0")
    expect(inspector).toContain("setNavigationType((current) => current === filter ? null : filter)")
    expect(inspector).not.toContain('setNavigationQuery((current)')
    expect(inspector).toContain("setNavigationQuery('')\n                    setNavigationSearchOpen(false)")
  })

  it('keeps Unicode-safe filtering and compact CSV export unchanged', () => {
    const search = read('./bookmarkSearch.ts')
    const inspector = read('../components/InspectorPanel.tsx')
    expect(search).toContain("normalize('NFC')")
    expect(search).toContain('toLocaleLowerCase()')
    expect(inspector).toContain('inspector-navigation-types__button--export')
    expect(inspector).toContain('onClick={() => void exportBookmarks()}')
  })
})
