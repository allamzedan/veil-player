import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from '../state/useHistoryStore'
import { useVeilStore } from '../state/useVeilStore'
import { EMPTY_TRACK_METADATA } from '../types/track'
import type { BookmarkTrackItem, MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'
import { DEFAULT_REGION_COVER_RECT, DEFAULT_SUBTITLE_COVER_MODE } from './subtitleCoverDefaults'
import { clearTimelineSelection } from './timelineSelection'
import {
  activeTimelineMaskEditorId,
  includesTimelineSelectionItem,
  isTimelineMultiSelectModifier
} from './timelineMultiSelection'
import {
  isBlankTimelineDeselectionTarget,
  shouldClearBlankTimelineSelection
} from './timelineBlankSelection'
import { undoTrack } from './trackHistory'
import { buildVeilTrackFromStore, type VeilTrackStorePayload } from './trackSerialization'

const rect = { xPercent: 10, yPercent: 10, widthPercent: 20, heightPercent: 20 }
const style = { mode: 'solid' as const, color: '#000000', opacity: 1 }

const mask = (id: string, start: number): MaskTrackItem => ({
  id, type: 'mask', start, end: start + 1, enabled: true, rect: { ...rect }, style: { ...style }
})
const mute = (id: string, start: number): MuteTrackItem => ({
  id, type: 'mute', start, end: start + 1, enabled: true
})
const skip = (id: string, start: number): SkipTrackItem => ({
  id, type: 'skip', start, end: start + 1, enabled: true
})
const bookmark = (id: string, start: number): BookmarkTrackItem => ({
  id, type: 'bookmark', start, end: start, enabled: true
})

const seedItems = (): void => {
  useVeilStore.setState({
    masks: [mask('mask-a', 1), mask('mask-b', 2)],
    mutes: [mute('mute-a', 3)],
    skips: [skip('skip-a', 4)],
    bookmarks: [bookmark('bookmark-a', 5)],
    selectedItems: [],
    selectedItemId: null,
    selectedItemType: null,
    groups: [],
    isTrackDirty: false,
    videoSrc: 'veil-media://source',
    videoFilePath: 'C:\\media\\source.mp4',
    videoFileName: 'source.mp4'
  })
  useHistoryStore.getState().clear()
}

const blankTarget = (className: string): EventTarget => ({
  closest: (selector: string) => selector.includes(className) ? { className } : null
}) as unknown as EventTarget

describe('timeline multi-selection model', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    })
    seedItems()
  })

  it('normal selection selects one item and clears a prior multi-selection', () => {
    const state = useVeilStore.getState()
    state.setSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    useVeilStore.getState().setSelectedItem('skip-a', 'skip')

    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [{ id: 'skip-a', type: 'skip' }],
      selectedItemId: 'skip-a',
      selectedItemType: 'skip'
    })
  })

  it.each([
    ['Mask', 'mask-a', 'mask'],
    ['Mute', 'mute-a', 'mute'],
    ['Skip', 'skip-a', 'skip'],
    ['Bookmark', 'bookmark-a', 'bookmark']
  ] as const)('normal-clicking the sole selected %s clears selection', (_label, id, type) => {
    const state = useVeilStore.getState()
    state.setSelectedItem(id, type)
    useVeilStore.getState().selectTimelineItem(id, type)

    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [], selectedItemId: null, selectedItemType: null
    })
  })

  it('normal click during multi-selection collapses to only the clicked item', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    state.toggleSelectedItem('skip-a', 'skip')
    useVeilStore.getState().selectTimelineItem('mute-a', 'mute')

    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [{ id: 'mute-a', type: 'mute' }],
      selectedItemId: 'mute-a',
      selectedItemType: 'mute'
    })
  })

  it('keeps timeline and sidebar indicators synchronized through the shared click action', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    useVeilStore.getState().selectTimelineItem('mask-a', 'mask')
    const selectedItems = useVeilStore.getState().selectedItems

    const timelineSelected = includesTimelineSelectionItem(selectedItems, 'mask-a', 'mask')
    const sidebarSelected = includesTimelineSelectionItem(selectedItems, 'mask-a', 'mask')
    expect(timelineSelected).toBe(true)
    expect(sidebarSelected).toBe(timelineSelected)
    expect(includesTimelineSelectionItem(selectedItems, 'mute-a', 'mute')).toBe(false)
  })

  it('removes active Mask handles when its sole selection is normal-clicked off', () => {
    const state = useVeilStore.getState()
    state.setSelectedItem('mask-a', 'mask')
    const selected = useVeilStore.getState()
    expect(activeTimelineMaskEditorId(selected.selectedItemId, selected.selectedItemType)).toBe('mask-a')

    useVeilStore.getState().selectTimelineItem('mask-a', 'mask')
    const next = useVeilStore.getState()
    expect(activeTimelineMaskEditorId(next.selectedItemId, next.selectedItemType)).toBeNull()
    expect(next.selectedItems).toEqual([])
  })

  it('Ctrl/Cmd modifier detection is platform-neutral and Shift alone is ignored', () => {
    expect(isTimelineMultiSelectModifier({ ctrlKey: true, metaKey: false })).toBe(true)
    expect(isTimelineMultiSelectModifier({ ctrlKey: false, metaKey: true })).toBe(true)
    expect(isTimelineMultiSelectModifier({ ctrlKey: false, metaKey: false })).toBe(false)
  })

  it('modifier selection adds and removes items, including clearing the final item', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    expect(useVeilStore.getState().selectedItems).toEqual([
      { id: 'mask-a', type: 'mask' },
      { id: 'mute-a', type: 'mute' }
    ])

    useVeilStore.getState().toggleSelectedItem('mask-a', 'mask')
    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [{ id: 'mute-a', type: 'mute' }],
      selectedItemId: 'mute-a',
      selectedItemType: 'mute'
    })
    useVeilStore.getState().toggleSelectedItem('mute-a', 'mute')
    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [], selectedItemId: null, selectedItemType: null
    })
  })

  it('supports cross-type selection and makes the most recently added item active', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    state.toggleSelectedItem('skip-a', 'skip')
    state.toggleSelectedItem('bookmark-a', 'bookmark')
    expect(useVeilStore.getState().selectedItems.map((item) => item.type)).toEqual([
      'mask', 'mute', 'skip', 'bookmark'
    ])
    expect(useVeilStore.getState()).toMatchObject({
      selectedItemId: 'bookmark-a', selectedItemType: 'bookmark'
    })
  })

  it('uses type plus id as collision-safe identity', () => {
    useVeilStore.setState({
      masks: [mask('shared-id', 1)],
      mutes: [mute('shared-id', 2)]
    })
    const state = useVeilStore.getState()
    state.toggleSelectedItem('shared-id', 'mask')
    state.toggleSelectedItem('shared-id', 'mute')
    expect(state.selectedItems).toHaveLength(0)
    expect(useVeilStore.getState().selectedItems).toEqual([
      { id: 'shared-id', type: 'mask' },
      { id: 'shared-id', type: 'mute' }
    ])
    useVeilStore.getState().toggleSelectedItem('shared-id', 'mask')
    expect(useVeilStore.getState().selectedItems).toEqual([{ id: 'shared-id', type: 'mute' }])
  })

  it('keeps multiple Masks selected while only the active Mask owns edit handles', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mask-b', 'mask')
    expect(state.selectedItems).toHaveLength(0)
    expect(useVeilStore.getState().selectedItems).toEqual([
      { id: 'mask-a', type: 'mask' },
      { id: 'mask-b', type: 'mask' }
    ])
    expect(useVeilStore.getState()).toMatchObject({ selectedItemId: 'mask-b', selectedItemType: 'mask' })

    expect(activeTimelineMaskEditorId(
      useVeilStore.getState().selectedItemId,
      useVeilStore.getState().selectedItemType
    )).toBe('mask-b')
    expect(includesTimelineSelectionItem(useVeilStore.getState().selectedItems, 'mask-a', 'mask')).toBe(true)
  })

  it('moves the active Mask editor when another selected Mask is directly selected last', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mask-b', 'mask')
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mask-a', 'mask')
    expect(useVeilStore.getState()).toMatchObject({ selectedItemId: 'mask-a', selectedItemType: 'mask' })
    expect(useVeilStore.getState().selectedItems).toEqual([
      { id: 'mask-b', type: 'mask' },
      { id: 'mask-a', type: 'mask' }
    ])
  })

  it('selecting a non-Mask last leaves selected Masks visible but disables Mask handles', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    expect(useVeilStore.getState()).toMatchObject({ selectedItemId: 'mute-a', selectedItemType: 'mute' })
    expect(includesTimelineSelectionItem(useVeilStore.getState().selectedItems, 'mask-a', 'mask')).toBe(true)
    expect(activeTimelineMaskEditorId(
      useVeilStore.getState().selectedItemId,
      useVeilStore.getState().selectedItemType
    )).toBeNull()
  })
})

describe('multi-selection lifecycle and deletion', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    })
    seedItems()
  })

  it.each([
    ['ruler', '.timeline-ruler__usable-track'],
    ['lane', '.timeline-row__usable-track']
  ])('blank %s double-click clears the complete selection', (_label, className) => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    const target = blankTarget(className)
    expect(isBlankTimelineDeselectionTarget(target)).toBe(true)
    expect(shouldClearBlankTimelineSelection(target, 2)).toBe(true)
    expect(clearTimelineSelection()).toBe(true)
    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [], selectedItemId: null, selectedItemType: null
    })
  })

  it('loading a VEIL payload clears selection without selecting loaded items', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    const payload: VeilTrackStorePayload = {
      masks: [mask('loaded-mask', 8)],
      mutes: [],
      skips: [],
      bookmarks: [],
      globalOffsetSeconds: 0,
      trackMetadata: { ...EMPTY_TRACK_METADATA },
      groups: [],
      anchors: [],
      subtitleCoverMode: DEFAULT_SUBTITLE_COVER_MODE,
      regionCoverRect: { ...DEFAULT_REGION_COVER_RECT }
    }
    state.applyLoadedTrackPayload(payload)
    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [], selectedItemId: null, selectedItemType: null
    })
    expect(useVeilStore.getState().masks.map((item) => item.id)).toEqual(['loaded-mask'])
  })

  it('media change and close clear the complete selection', () => {
    const state = useVeilStore.getState()
    state.toggleSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    state.setVideoSource('veil-media://next', 'next.mp4', 'protocol', null, 'C:\\media\\next.mp4', 'video')
    expect(useVeilStore.getState().selectedItems).toEqual([])

    useVeilStore.getState().setSelectedItem('mask-a', 'mask')
    useVeilStore.getState().clearVideo()
    expect(useVeilStore.getState()).toMatchObject({
      selectedItems: [], selectedItemId: null, selectedItemType: null
    })
  })

  it('deletes all and only selected items in one history action and clears selection', () => {
    const state = useVeilStore.getState()
    state.setSelectedItem('mask-b', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    state.toggleSelectedItem('bookmark-a', 'bookmark')
    const sourceBefore = {
      videoSrc: state.videoSrc,
      videoFilePath: state.videoFilePath,
      videoFileName: state.videoFileName
    }

    state.removeSelectedItem()
    const next = useVeilStore.getState()
    expect(next.masks.map((item) => item.id)).toEqual(['mask-a'])
    expect(next.mutes).toEqual([])
    expect(next.skips.map((item) => item.id)).toEqual(['skip-a'])
    expect(next.bookmarks).toEqual([])
    expect(next).toMatchObject({ selectedItems: [], selectedItemId: null, selectedItemType: null })
    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect({
      videoSrc: next.videoSrc,
      videoFilePath: next.videoFilePath,
      videoFileName: next.videoFileName
    }).toEqual(sourceBefore)
  })

  it('one Undo restores every batch-deleted item in deterministic original order', () => {
    const state = useVeilStore.getState()
    state.setSelectedItem('mask-b', 'mask')
    state.toggleSelectedItem('mute-a', 'mute')
    state.toggleSelectedItem('bookmark-a', 'bookmark')
    state.removeSelectedItem()

    expect(undoTrack()).toBe(true)
    const restored = useVeilStore.getState()
    expect(restored.masks.map((item) => item.id)).toEqual(['mask-a', 'mask-b'])
    expect(restored.mutes.map((item) => item.id)).toEqual(['mute-a'])
    expect(restored.skips.map((item) => item.id)).toEqual(['skip-a'])
    expect(restored.bookmarks.map((item) => item.id)).toEqual(['bookmark-a'])
    expect(undoTrack()).toBe(false)
  })

  it('does not serialize ephemeral selection into schema 1.6.0', () => {
    const state = useVeilStore.getState()
    state.setSelectedItem('mask-a', 'mask')
    state.toggleSelectedItem('bookmark-a', 'bookmark')
    const track = buildVeilTrackFromStore({
      masks: state.masks,
      mutes: state.mutes,
      skips: state.skips,
      bookmarks: state.bookmarks,
      globalOffsetSeconds: state.globalOffsetSeconds,
      trackMetadata: state.trackMetadata,
      groups: state.groups,
      anchors: state.anchors,
      subtitleCoverMode: state.subtitleCoverMode,
      regionCoverRect: state.regionCoverRect,
      videoMetadata: { name: 'source.mp4', duration: 10, fileSize: 100, width: 1280, height: 720 },
      videoFileName: 'source.mp4'
    })
    expect(track?.version).toBe('1.6.0')
    expect(track).not.toHaveProperty('selectedItems')
    expect(JSON.stringify(track)).not.toContain('selectedItems')
  })
})
