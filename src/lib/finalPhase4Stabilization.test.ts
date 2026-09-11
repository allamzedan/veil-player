import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import LayerSelectionPreview from '../components/LayerSelectionPreview'
import { useVeilStore } from '../state/useVeilStore'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('final Phase 4 sidebar stabilization', () => {
  beforeEach(() => useVeilStore.getState().clearVideo())

  it('renders range Enabled, Lock, Edit, Delete actions while Bookmark keeps Edit, Copy, Delete', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const rangeActions = inspector.slice(
      inspector.indexOf("{row.type !== 'bookmark' ? ("),
      inspector.indexOf("{row.type === 'bookmark' ? (", inspector.indexOf("{row.type !== 'bookmark' ? ("))
    )
    expect(rangeActions).toContain('Disable layer')
    expect(rangeActions).toContain('Enable layer')
    expect(rangeActions).toContain('Unlock layer')
    expect(rangeActions).toContain('Lock layer')
    expect(rangeActions).toContain('event.stopPropagation()')
    expect(inspector).toContain('<EditIcon />')
    expect(inspector).toContain('<CopyIcon />')
    expect(inspector).toContain('<TrashIcon />')
    expect(inspector).toContain('inspector-navigation-list__icon-button--enabled')
    expect(inspector).toContain('inspector-navigation-list__icon-button--delete')
    const styles = read('../styles.css')
    expect(styles).toMatch(/\.inspector-navigation-list__icon-button\s*\{[^}]*width:\s*1\.875rem;[^}]*height:\s*1\.875rem/s)
    expect(styles).toMatch(/\.inspector-navigation-list__icon-button--active\s*\{[^}]*border-color:\s*transparent;[^}]*background:\s*transparent;/s)
    expect(styles).toMatch(/\.inspector-navigation-list__icon-button--delete:hover,[\s\S]*color:\s*var\(--danger/)
    expect(styles).toMatch(/\.inspector-navigation-list__item--disabled \.inspector-navigation-list__select/)
    expect(read('../components/TrackEditor.tsx')).not.toContain('toggleItemEnabled')
    expect(read('../components/TrackEditor.tsx')).not.toContain('toggleItemLocked')
  })

  it('persists Enabled and Lock on the targeted range without selecting or seeking', () => {
    useVeilStore.getState().addMask(1, 3)
    const mask = useVeilStore.getState().masks[0]
    useVeilStore.getState().setSelectedItem(null, null)
    useVeilStore.getState().toggleItemEnabled(mask.id, 'mask')
    useVeilStore.getState().toggleItemLocked(mask.id, 'mask')
    const updated = useVeilStore.getState().masks[0]
    expect(updated.enabled).toBe(false)
    expect(updated.locked).toBe(true)
    expect(useVeilStore.getState().selectedItemId).toBeNull()
  })

  it('renders the selected-layer type icon as a complete non-interactive SVG, not an underscore control', () => {
    const html = renderToStaticMarkup(createElement(LayerSelectionPreview, {
      item: { id: 'mask-1', type: 'mask', label: 'Mask', start: 1, end: 3, enabled: true }
    }))
    const styles = read('../styles.css')
    expect(html).toContain('<rect')
    expect(html).toContain('M8 9h8M8 13h5')
    expect(html).not.toContain('<button')
    expect(styles).toMatch(/\.layer-selection-preview\s*\{[^}]*pointer-events:\s*none/s)
    expect(styles).toMatch(/\.layer-selection-preview__type svg\s*\{[^}]*overflow:\s*visible/s)
  })

  it('uses the Inspector collapse-icon family for the surgical Timeline Hide control', () => {
    const player = read('../components/VideoPlayer.tsx')
    expect(player).toContain('aria-label="Hide Timeline"')
    expect(player).toContain('title="Hide Timeline"')
    expect(player).toContain('<InspectorCollapseIcon />')
    expect(player).toContain('onClick={handleTimelineChromeHide}')
  })
})
