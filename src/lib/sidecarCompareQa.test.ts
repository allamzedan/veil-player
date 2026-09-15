import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compareSidecarItems } from './sidecarCompare'
import type { VeilTrackStorePayload } from './trackSerialization'

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8')

const payload: VeilTrackStorePayload = {
  masks: [{ id: 'mask-1', type: 'mask', start: 1, end: 2, rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 }, style: { mode: 'solid', color: '#000', opacity: 1 } }],
  mutes: [{ id: 'mute-1', type: 'mute', start: 3, end: 4 }],
  skips: [],
  bookmarks: [],
  globalOffsetSeconds: 0,
  trackMetadata: {},
  groups: [],
  anchors: [],
  subtitleCoverMode: 'show',
  regionCoverRect: { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 }
}

describe('VEIL compare/import QA polish', () => {
  it('keeps comparison statuses dynamic and ordered by semantic state', () => {
    const imported = { ...payload, masks: [{ ...payload.masks[0], id: 'mask-duplicate' }, { ...payload.masks[0], id: 'mask-conflict', label: 'changed' }], mutes: [{ ...payload.mutes[0], id: 'mute-new', start: 8, end: 9 }] }
    expect(compareSidecarItems(payload, imported).items.map((entry) => entry.status)).toEqual(['conflict', 'duplicate', 'new'])
  })

  it('uses the compact production wording and semantic import icon', () => {
    const dialog = read('../components/SidecarCompareDialog.tsx')
    const english = read('../i18n/en.ts')
    expect(dialog).toContain("t('sidecar.intro')")
    expect(english).toContain("'sidecar.intro': 'The imported VEIL will be compared and selected items can be added without replacing the current VEIL.'")
    expect(dialog).toContain('<UploadFileIcon')
    expect(dialog).toContain('<CheckIcon')
    expect(dialog).toContain("t('sidecar.new')")
    expect(dialog).toContain("t('sidecar.alreadyPresent')")
    expect(dialog).toContain("t('sidecar.needsAttention')")
    expect(dialog).toContain("t('sidecar.overlapExisting'")
  })

  it('renders the compact same-VEIL empty state with Close-only footer', () => {
    const dialog = read('../components/SidecarCompareDialog.tsx')
    expect(dialog).toContain("t('sidecar.nothingNew')")
    expect(dialog).toContain("t('sidecar.matchesCurrent')")
    expect(dialog).toContain("t('sidecar.allPresent')")
    expect(dialog).toContain('sidecar-compare-dialog__empty-heading')
    expect(dialog).toContain("{t('common.close')}</button>")
    expect(dialog).not.toContain('The VEIL was already added')
  })

  it('keeps the comparison list scrollable while the modal chrome stays fixed', () => {
    const styles = read('../styles.css')
    expect(styles).toContain('grid-template-rows: auto minmax(0, 1fr) auto')
    expect(styles).toContain('.sidecar-compare-dialog__panel')
    expect(styles).toContain('width: min(64rem')
    expect(styles).toContain('max-height: min(74vh')
    expect(styles).toContain('.sidecar-compare-dialog__list { min-height: 0; overflow: auto;')
  })

  it('keeps media compatibility messaging compact and non-mutating', () => {
    const dialog = read('../components/SidecarCompareDialog.tsx')
    const english = read('../i18n/en.ts')
    expect(dialog).toContain("t('sidecar.sameMedia')")
    expect(english).toContain("'sidecar.sameMedia': 'Same media file'")
    expect(dialog).toContain('mediaWarning')
    expect(english).toContain('without replacing the current VEIL.')
  })

  it('clears selection after normal VEIL load while retaining mask rendering state', () => {
    const store = read('../state/useVeilStore.ts')
    expect(store).not.toContain('pickInitialSelection(payload)')
    expect(store).toContain('selectedItemId: null')
    expect(store).toContain('selectedItemType: null')
  })

  it('clears blank timeline selection only on blank double-click', () => {
    const timeline = read('../components/TimelineEditor.tsx')
    const blankSelection = read('./timelineBlankSelection.ts')
    expect(timeline).toContain('shouldClearBlankTimelineSelection(event.target, 2)')
    expect(blankSelection).toContain('activationCount >= 2')
    expect(timeline).toContain('isBlankSeekableTimelineTarget(event.target)')
  })

  it('removes the dead launcher action and keeps Clear Recent', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    expect(launcher).not.toContain('viewAllLater')
    expect(launcher).toContain("t('menu.clearRecent')")
  })
})
