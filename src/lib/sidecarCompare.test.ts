import { describe, expect, it } from 'vitest'
import { compareSidecarItems, selectedSidecarPayload, sidecarMediaWarning } from './sidecarCompare'
import type { VeilTrackStorePayload } from './trackSerialization'

const base: VeilTrackStorePayload = {
  masks: [{ id: 'mask-current', type: 'mask', start: 1, end: 2, rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 }, style: { mode: 'solid', color: '#000000', opacity: 1 } }],
  mutes: [{ id: 'mute-current', type: 'mute', start: 3, end: 4 }],
  skips: [],
  bookmarks: [{ id: 'bookmark-current', type: 'bookmark', start: 5, end: 5, label: '同じ' }],
  globalOffsetSeconds: 0,
  trackMetadata: {},
  groups: [],
  anchors: [],
  subtitleCoverMode: 'show',
  regionCoverRect: { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 }
}

describe('sidecar compare/import', () => {
  it('detects exact duplicates and keeps same-timing non-duplicates selectable', () => {
    const imported = {
      ...base,
      masks: [{ ...base.masks[0], id: 'mask-duplicate' }, { ...base.masks[0], id: 'mask-conflict', label: '別' }],
      bookmarks: [{ ...base.bookmarks[0], id: 'bookmark-duplicate' }]
    }
    const result = compareSidecarItems(base, imported)
    expect(result.items.map((entry) => entry.status)).toEqual(['conflict', 'duplicate', 'duplicate', 'duplicate'])
    expect(result.items[0].relatedCurrentItem?.id).toBe('mask-current')
  })

  it('supports mixed selected imports in deterministic type order', () => {
    const imported: VeilTrackStorePayload = {
      ...base,
      masks: [{ id: 'mask-new', type: 'mask', start: 8, end: 9, rect: { xPercent: 1, yPercent: 2, widthPercent: 3, heightPercent: 4 }, style: { mode: 'solid', color: '#ffffff', opacity: 0.5 } }],
      mutes: [{ id: 'mute-new', type: 'mute', start: 6, end: 7 }],
      skips: [{ id: 'skip-new', type: 'skip', start: 10, end: 11 }],
      bookmarks: [{ id: 'bookmark-new', type: 'bookmark', start: 12, end: 12, label: '日本語' }]
    }
    const comparison = compareSidecarItems({ ...base, masks: [], mutes: [], bookmarks: [] }, imported)
    const payload = selectedSidecarPayload(comparison, new Set(['mask-new', 'mute-new', 'skip-new', 'bookmark-new']))
    expect(payload.masks[0].label).toBeUndefined()
    expect(payload.mutes[0].id).toBe('mute-new')
    expect(payload.skips[0].id).toBe('skip-new')
    expect(payload.bookmarks[0].label).toBe('日本語')
  })

  it('never selects exact duplicates and cancel can leave the current payload untouched', () => {
    const comparison = compareSidecarItems(base, base)
    const payload = selectedSidecarPayload(comparison, new Set(['bookmark-current']))
    expect(payload.masks).toHaveLength(0)
    expect(payload.bookmarks).toHaveLength(0)
    expect(base.bookmarks[0].id).toBe('bookmark-current')
  })


  it('warns on different media without binding or replacing the current session', () => {
    const warning = sidecarMediaWarning({ name: 'other.mp4', duration: 20, fileSize: 10, resolution: { width: 1280, height: 720 }, fingerprint: { method: 'metadata-v1', value: 'other' } }, 'current.mp4', { name: 'current.mp4', duration: 20, fileSize: 10, width: 1280, height: 720 })
    expect(warning).toContain('different media')
  })
})
