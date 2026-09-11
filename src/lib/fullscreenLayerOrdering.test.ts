import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  sortFullscreenLayerItems,
  type ActiveLayerSummary
} from '../components/FullscreenEditOverlay'

const mixed: ActiveLayerSummary[] = [
  { id: 'mask-late', type: 'mask', label: 'Late mask', start: 40, end: 45 },
  { id: 'mute-early', type: 'mute', label: 'Early mute', start: 5, end: 8 },
  { id: 'skip-middle', type: 'skip', label: 'Middle skip', start: 20, end: 24 },
  { id: 'bookmark-point', type: 'bookmark', label: 'Point', start: 12, end: 12 },
  { id: 'bookmark-tie', type: 'bookmark', label: 'Tie point', start: 20, end: 20 },
  { id: 'mask-tie', type: 'mask', label: 'Tie mask', start: 20, end: 22 }
]

describe('fullscreen Layers ordering', () => {
  it('defaults the local selector to Time without serializing the choice', () => {
    const overlay = readFileSync(
      new URL('../components/FullscreenEditOverlay.tsx', import.meta.url),
      'utf8'
    ).replace(/\r\n/g, '\n')

    expect(overlay).toContain("useState<FullscreenLayerSort>('time')")
    expect(overlay).toContain('<option value="time">{t(\'layers.sortTime\')}</option>')
    expect(overlay).toContain('<option value="type">{t(\'layers.sortType\')}</option>')
    expect(overlay).not.toMatch(/localStorage|sessionStorage|serialize|persist/i)
  })

  it('sorts mixed ranges and bookmark points chronologically by default', () => {
    expect(sortFullscreenLayerItems(mixed, 'time').map((item) => item.id)).toEqual([
      'mute-early',
      'bookmark-point',
      'mask-tie',
      'skip-middle',
      'bookmark-tie',
      'mask-late'
    ])
  })

  it('restores type grouping and keeps each type chronological', () => {
    expect(sortFullscreenLayerItems(mixed, 'type').map((item) => item.id)).toEqual([
      'mask-tie',
      'mask-late',
      'mute-early',
      'skip-middle',
      'bookmark-point',
      'bookmark-tie'
    ])
  })

  it('uses item IDs as a deterministic fallback for equal time and type', () => {
    const ties: ActiveLayerSummary[] = [
      { id: 'bookmark-z', type: 'bookmark', label: 'Z', start: 10, end: 10 },
      { id: 'bookmark-a', type: 'bookmark', label: 'A', start: 10, end: 10 }
    ]
    expect(sortFullscreenLayerItems(ties, 'time').map((item) => item.id)).toEqual([
      'bookmark-a',
      'bookmark-z'
    ])
  })

  it('keeps Active filtering range-only and All inclusive of bookmarks', () => {
    const video = readFileSync(
      new URL('../components/VideoPlayer.tsx', import.meta.url),
      'utf8'
    ).replace(/\r\n/g, '\n')

    expect(video).toContain('buildLayerListRows(masks, mutes, skips, bookmarks)')
    expect(video).toContain("if (row.type === 'skip')")
    expect(video).toContain('return false')
    expect(video).toContain("fullscreenLayerFilter === 'all' ? allLayerItems : activeLayerItems")
  })
})
