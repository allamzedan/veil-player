import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('sidebar surgical completion', () => {
  it('uses filter-specific empty-state copy without changing filtering', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const english = read('../i18n/en.ts')

    expect(inspector).toContain('resolveInspectorEmptyStateKind')
    expect(english).toContain("'inspector.emptyAllTitle': 'No VEIL items yet'")
    expect(english).toContain("'inspector.emptyAllDescription': 'Create a mask, mute, skip, or bookmark to begin.'")
    expect(english).toContain("'inspector.emptyMasksTitle': 'No masks yet'")
    expect(english).toContain("'inspector.emptyMasksDescription': 'Create a mask to hide part of the video.'")
    expect(english).toContain("'inspector.emptyMutesTitle': 'No mutes yet'")
    expect(english).toContain("'inspector.emptyMutesDescription': 'Create a mute range to silence part of the media.'")
    expect(english).toContain("'inspector.emptySkipsTitle': 'No skips yet'")
    expect(english).toContain("'inspector.emptySkipsDescription': 'Create a skip range to jump over part of the media.'")
    expect(english).toContain("'inspector.emptyActiveTitle': 'No active VEIL items'")
    expect(english).toContain("'inspector.emptyActiveDescription': 'No mask, mute, or skip is active at the current playback time.'")
    expect(english).toContain("'youtube.noBookmarksTitle': 'No bookmarks yet'")
    expect(english).toContain("'youtube.noBookmarksDescription': 'Add a bookmark to return to an important moment.'")
    expect(inspector).toContain("bookmark: ['youtube.noBookmarksTitle', 'youtube.noBookmarksDescription']")
  })

  it('keeps one refreshed Advanced disclosure and removes its legacy-sidebar trigger', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const player = read('../components/VideoPlayer.tsx')
    const classic = read('../components/TrackSidebar.tsx')
    const details = inspector.slice(inspector.indexOf('id={`${tabPrefix}-details-panel`}'))

    expect(details.match(/t\('inspector\.advanced'\)/g)).toHaveLength(1)
    expect(inspector).not.toContain('onRequestClassicSidebar')
    expect(player).not.toContain('onRequestClassicSidebar=')
    expect(player).toContain('<TrackSidebar')
    expect(classic).toContain('<TrackEditor')
  })

  it('adds capability-gated Bookmark creation and colored icons without changing Overview data', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const overview = inspector.slice(
      inspector.indexOf('id={`${tabPrefix}-overview-panel`}'),
      inspector.indexOf('id={`${tabPrefix}-navigate-panel`}')
    )

    expect(overview).toContain('capabilities.canCreateBookmark')
    expect(overview).toContain('onClick={onAddBookmark}')
    for (const type of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(overview).toContain(`inspector-navigation-list__type--${type}`)
    }
    expect(overview).toContain('{masks.length}')
    expect(overview).toContain('{mutes.length}')
    expect(overview).toContain('{skips.length}')
    expect(overview).toContain('{bookmarks.length}')
    expect(overview).toContain('trackTools.map((item)')
    expect(overview).toContain("value={trackMetadata.summary ?? ''}")
    expect(overview).toContain('patchTrackMetadata({ summary: event.target.value })')
  })

  it('separates row selection from explicit range and bookmark editing', () => {
    const inspector = read('../components/InspectorPanel.tsx')

    expect(inspector).toContain('const selectNavigationItem = (row: InspectorNavigationItem)')
    expect(inspector).toContain('setEditingBookmarkId(null)')
    expect(inspector).toContain('setEditingRangeId(null)')
    expect(inspector).toContain('setSelectedItem(row.item.id, row.type)')
    expect(inspector).toContain('onSeek(row.item.start)')
    expect(inspector).toContain('onClick={() => selectNavigationItem(row)}')
    expect(inspector).not.toContain('onDoubleClick={() => editNavigationItem')
    expect(inspector).toContain('event.stopPropagation(); editNavigationItem(row)')
    expect(inspector).not.toContain('setEditingRangeId(selectedItemId)')
  })

  it('keeps the schema at 1.6.0', () => {
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
