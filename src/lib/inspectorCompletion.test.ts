import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Inspector hierarchy completion', () => {
  it('keeps Overview as a persistent first tab and removes Notes and the duplicate tools control', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain("type InspectorTab = 'overview' | 'navigate' | 'details'")
    expect(inspector.indexOf("id: 'overview'")).toBeLessThan(inspector.indexOf("id: 'navigate'"))
    expect(inspector).not.toContain("id: 'notes'")
    expect(inspector).not.toContain('inspector-panel__track-tools')
    expect(inspector).toContain("hidden={activeView !== 'overview'}")
    expect(inspector).toContain("hidden={activeView !== 'navigate'}")
    expect(inspector).toContain("hidden={activeView !== 'details'}")
  })

  it('keeps Create, Summary, Manage, and summary-backed Media Notes in Overview', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const overview = inspector.slice(inspector.indexOf('id={`${tabPrefix}-overview-panel`}'), inspector.indexOf('id={`${tabPrefix}-navigate-panel`}'))
    expect(overview).toContain("t('inspector.sectionCreate')")
    expect(overview).toContain("t('inspector.sectionSummary')")
    expect(overview).toContain("t('inspector.sectionManage')")
    expect(overview).toContain("t('inspector.mediaNotes')")
    expect(overview).toContain("value={trackMetadata.summary ?? ''}")
    expect(overview).toContain('patchTrackMetadata({ summary: event.target.value })')
    expect(overview).toContain('capabilities.canEditMediaNotes')
  })

  it('separates status and single-select type filters with accessible icon buttons', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain('inspector-navigation-status')
    expect(inspector).toContain('inspector-navigation-types')
    expect(inspector).toContain("(['all', 'active'] as const)")
    expect(inspector).toContain('supportedInspectorTypeFilters(capabilities)')
    expect(inspector).toContain('current === filter ? null : filter')
    expect(inspector).toContain('aria-label={typeLabel(filter)}')
    expect(inspector).toContain('title={typeLabel(filter)}')
  })

  it('uses compact rows with icon editing while retaining bookmark notes and row states', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const css = read('../styles.css')
    expect(inspector).toContain('<EditIcon />')
    expect(inspector).toContain('row.type ===')
    expect(inspector).toContain('<CopyIcon />')
    expect(inspector).toContain('inspector-navigation-list__icon-button--delete')
    expect(inspector).toContain('<TrashIcon />')
    expect(inspector).toContain('row.item.notes?.trim()')
    expect(inspector).toContain('inspector-navigation-list__item--selected')
    expect(inspector).toContain('inspector-navigation-list__item--disabled')
    expect(inspector).not.toContain('className="btn btn-ghost btn-compact" onClick={() => setSelectedItem(row.item.id, row.type)}')
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto;')
    expect(css).toContain('.inspector-navigation-list__icon-button')
  })

  it('keeps Inspector and Timeline visibility ownership independent', () => {
    const player = read('../components/VideoPlayer.tsx')
    const inspector = read('../components/InspectorPanel.tsx')
    expect(player).not.toContain("{inspectorCollapsed ? t('common.show') : t('common.hide')} {t('inspector.trackOverview')}")
    expect(player).not.toContain('inspector-dock__collapse')
    expect(player).toContain('onHide={() => setInspectorCollapsed(true)}')
    expect(inspector).toContain('inspector-panel__collapse-action')
    expect(inspector).toContain('Hide Inspector')
    expect(player).toContain('className="inspector-dock__show"')
    expect(player).toContain('onTimelineVisibleChange(!timelineVisible)')
    expect(player).toContain('onClick={handleTimelineChromeHide}')
  })

  it('does not alter the VEIL schema version', () => {
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
