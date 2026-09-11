import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem
} from '../types/track'
import { buildLayerListRows, filterLayerRows, sortLayerRows } from './trackItems'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const mask: MaskTrackItem = {
  id: 'mask-1',
  type: 'mask',
  enabled: true,
  start: 1,
  end: 2,
  label: 'Mask label',
  rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
  style: { mode: 'solid', color: '#000000', opacity: 1 }
}

const mute: MuteTrackItem = {
  id: 'mute-1',
  type: 'mute',
  enabled: true,
  start: 3,
  end: 4,
  label: 'Mute label'
}

const skip: SkipTrackItem = {
  id: 'skip-1',
  type: 'skip',
  enabled: true,
  start: 5,
  end: 6,
  label: 'Skip label'
}

const bookmark: BookmarkTrackItem = {
  id: 'bookmark-1',
  type: 'bookmark',
  enabled: true,
  start: 7.5,
  end: 7.5,
  label: 'Bookmark label',
  notes: 'Bookmark note'
}

const activeSets = {
  mask: new Set([mask.id]),
  mute: new Set([mute.id]),
  skip: new Set([skip.id])
}

describe('Layers dialog bookmarks', () => {
  it('renders the Bookmarks filter between Skips and Active Now only for the dialog', () => {
    const controls = read('../components/LayerListControls.tsx')
    const drawer = read('../components/LayerManagerDrawer.tsx')
    const classicSidebar = read('../components/TrackSidebar.tsx')

    const skipIndex = controls.indexOf("{ value: 'skip'")
    const bookmarkIndex = controls.indexOf("{ value: 'bookmark'")
    const activeIndex = controls.indexOf("{ value: 'active'")

    expect(skipIndex).toBeGreaterThan(-1)
    expect(bookmarkIndex).toBeGreaterThan(skipIndex)
    expect(activeIndex).toBeGreaterThan(bookmarkIndex)
    expect(controls).toContain('<BookmarkIcon aria-hidden />')
    expect(controls).toContain('layer-list-controls__filter--bookmark')
    expect(drawer).toContain('includeBookmarks')
    expect(classicSidebar).not.toContain('includeBookmarks')
  })

  it('includes bookmarks in All and only bookmarks in the Bookmarks filter', () => {
    const rows = sortLayerRows(buildLayerListRows([mask], [mute], [skip], [bookmark]), 'time')

    expect(filterLayerRows(rows, 'all', activeSets).map((row) => row.type)).toEqual([
      'mask',
      'mute',
      'skip',
      'bookmark'
    ])
    expect(filterLayerRows(rows, 'bookmark', activeSets)).toEqual([
      expect.objectContaining({ type: 'bookmark', label: 'Bookmark label', item: bookmark })
    ])
  })

  it('excludes point bookmarks from Active Now', () => {
    const rows = buildLayerListRows([mask], [mute], [skip], [bookmark])

    expect(filterLayerRows(rows, 'active', activeSets).map((row) => row.type)).toEqual([
      'mask',
      'mute',
      'skip'
    ])
  })

  it('renders bookmark icon, label, point timestamp, notes, and bookmark styling', () => {
    const layerList = read('../components/LayerList.tsx')
    const styles = read('../styles.css')

    expect(layerList).toContain("'layer-list__badge--type-bookmark'")
    expect(layerList).toContain("<BookmarkIcon aria-hidden /> {t('inspector.bookmark')}")
    expect(layerList).toContain("type === 'bookmark' ? null : <> → {formatSeconds(item.end)}</>")
    expect(layerList).toContain("type === 'bookmark' && item.notes?.trim()")
    expect(layerList).toContain('layer-list__notes')
    expect(layerList).toContain('layer-list__badge--bookmark-enabled')
    expect(styles).toMatch(/\.layer-list__badge--type-bookmark\s*\{[^}]*var\(--veil-bookmark\)/s)
    expect(styles).toMatch(/\.layer-list__notes\s*\{/)
  })

  it('preserves existing Mask, Mute, Skip filtering and schema 1.6.0', () => {
    const rows = buildLayerListRows([mask], [mute], [skip])

    expect(rows.map((row) => row.type)).toEqual(['mask', 'mute', 'skip'])
    expect(filterLayerRows(rows, 'mask', activeSets).map((row) => row.type)).toEqual(['mask'])
    expect(filterLayerRows(rows, 'mute', activeSets).map((row) => row.type)).toEqual(['mute'])
    expect(filterLayerRows(rows, 'skip', activeSets).map((row) => row.type)).toEqual(['skip'])
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
