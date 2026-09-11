import { create } from 'zustand'
import { createDefaultMask } from '../lib/maskDefaults'
import { sanitizeTrackMetadata, sanitizeTrackMetadataPatch } from '../lib/trackMetadataValidation'
import { addRecentMaskColor } from '../lib/recentColors'
import { enforceMaskTiming } from '../lib/maskTiming'
import { shiftMaskTiming } from '../lib/shiftMasks'
import { clearTrackHistory, recordTrackHistoryBefore } from '../lib/trackHistory'
import {
  createBookmarkItem,
  patchBookmarkFields,
  shiftBookmarkItems
} from '../lib/bookmarks'
import {
  createMuteItem,
  createSkipItem,
  trackItemExists,
  validateSelection,
  type SelectableItemType
} from '../lib/trackItems'
import {
  includesTimelineSelectionItem,
  toggleTimelineSelectionItem,
  type SelectedTimelineItem
} from '../lib/timelineMultiSelection'
import type {
  UnsupportedYouTubeTrackItem,
  VeilTrackStorePayload
} from '../lib/trackSerialization'
import { parseVeilApprovedMediaId } from '../lib/veilMediaUrl'
import type { SrtCue } from '../lib/srtParser'
import { createMaskId } from '../lib/id'
import { createManualAnchor, sortAnchorsByTime } from '../lib/trackAnchors'
import {
  DEFAULT_REGION_COVER_RECT,
  DEFAULT_SUBTITLE_COVER_MODE
} from '../lib/subtitleCoverDefaults'
import { createSubtitleMasksFromCues } from '../lib/subtitleMasks'
import { confirmNative } from '../lib/nativeConfirm'
import type {
  BookmarkTrackItem,
  GroupColorToken,
  MaskStyle,
  MaskTrackItem,
  MuteTrackItem,
  PercentRect,
  SkipTrackItem,
  SubtitleCoverMode,
  TrackAnchor,
  TrackGroup,
  TrackMetadata
} from '../types/track'
import { EMPTY_TRACK_METADATA } from '../types/track'
import type { MediaKind } from '../lib/mediaKind'
import { inferMediaKindFromFileName } from '../lib/mediaKind'
import type { MediaSource, YouTubeMediaSource } from '../types/mediaSource'
import type { YouTubeMetadata } from '../types/youtubeMetadata'
import {
  markYouTubeMetadataLoading,
  markYouTubeMetadataUnavailable,
  mergeYouTubeMetadata,
  savedYouTubeMetadata
} from '../lib/youtubeMetadata'

export type VideoSourceKind = 'blob' | 'protocol'

export interface VideoMetadata {
  name: string
  duration: number
  fileSize: number | null
  width: number
  height: number
}

interface VeilState {
  videoSrc: string | null
  videoFilePath: string | null
  videoFileName: string | null
  videoMetadata: VideoMetadata | null
  mediaKind: MediaKind | null
  /** Authoritative active media identity (local path or YouTube). */
  mediaSource: MediaSource | null
  /**
   * Lifecycle-only YouTube player instance generation.
   * Bumped on new/changed YouTube loads and forced same-video reloads (e.g. mismatch Retry).
   * Not part of media identity and never serialized into .veil.
   */
  youtubeLoadGeneration: number
  /** Display metadata only; never participates in media matching. */
  youtubeMetadata: YouTubeMetadata | null
  pickedFileBytes: number | null
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  preservedUnsupportedItems: UnsupportedYouTubeTrackItem[]
  preservedUnknownItems: import('../lib/trackSchema').PreservedUnknownTrackItem[]
  preservedUnknownRootFields: Record<string, unknown>
  /** Ordered full selection; the final entry is the most recently directly selected item. */
  selectedItems: SelectedTimelineItem[]
  /** Active item retained for existing single-item Inspector/editor surfaces. */
  selectedItemId: string | null
  selectedItemType: SelectableItemType | null
  globalOffsetSeconds: number
  trackMetadata: TrackMetadata
  groups: TrackGroup[]
  anchors: TrackAnchor[]
  subtitleCues: SrtCue[]
  subtitleFileName: string | null
  showSubtitleText: boolean
  subtitleCoverMode: SubtitleCoverMode
  regionCoverRect: PercentRect
  isTrackDirty: boolean
  trackFilePath: string | null
  markTrackDirty: () => void
  markTrackClean: () => void
  setTrackFilePath: (path: string | null) => void
  validateAndFixSelection: () => void
  setVideoSource: (
    src: string,
    fileName: string,
    sourceKind: VideoSourceKind,
    fileSizeBytes?: number | null,
    filePath?: string | null,
    mediaKind?: MediaKind | null
  ) => void
  setMediaKind: (kind: MediaKind | null) => void
  setVideoMetadata: (metadata: VideoMetadata) => void
  setMediaSource: (source: MediaSource | null) => void
  openYouTubeMedia: (
    source: YouTubeMediaSource,
    options?: { /** Force adapter recreation even when videoId is unchanged. */ reload?: boolean }
  ) => void
  mergeYouTubeMetadata: (
    metadata: Partial<YouTubeMetadata> & Pick<YouTubeMetadata, 'videoId' | 'source'>
  ) => void
  setYouTubeMetadataLoading: (videoId: string) => void
  setYouTubeMetadataUnavailable: (videoId: string, status: 'unavailable' | 'error') => void
  clearVideo: () => void
  addMask: (startSeconds?: number, endSeconds?: number) => void
  addMasks: (newMasks: MaskTrackItem[]) => void
  addMute: (startSeconds?: number, endSeconds?: number) => void
  addSkip: (startSeconds?: number, endSeconds?: number) => void
  addBookmark: (input: { start: number; label?: string; notes?: string }) => void
  patchBookmark: (
    id: string,
    patch: Partial<Pick<BookmarkTrackItem, 'start' | 'label' | 'notes' | 'enabled'>>
  ) => void
  deleteBookmark: (id: string) => void
  addTrackItemsBatch: (batch: {
    masks?: MaskTrackItem[]
    mutes?: MuteTrackItem[]
    skips?: SkipTrackItem[]
    bookmarks?: BookmarkTrackItem[]
  }) => string | null
  reconcileTimedItemsBatch: (batch: {
    removeMuteIds?: string[]
    removeSkipIds?: string[]
    mutes?: MuteTrackItem[]
    skips?: SkipTrackItem[]
  }) => boolean
  importManualBuilderBatch: (
    batch: {
      masks: MaskTrackItem[]
      mutes: MuteTrackItem[]
      skips: SkipTrackItem[]
      firstMaskId: string | null
    },
    options?: { replace?: boolean }
  ) => string | null
  patchMaskRect: (id: string, rect: PercentRect) => void
  patchMaskStyle: (id: string, style: Partial<MaskStyle>) => void
  patchMaskTiming: (id: string, start: number, end: number) => void
  patchMaskFade: (id: string, fadeInMs: number, fadeOutMs: number) => void
  patchItemLabel: (id: string, type: SelectableItemType, label: string | undefined) => void
  patchItemNotes: (id: string, type: SelectableItemType, notes: string | undefined) => void
  patchMuteTiming: (id: string, start: number, end: number) => void
  patchSkipTiming: (id: string, start: number, end: number) => void
  patchTrackItemTiming: (
    id: string,
    type: SelectableItemType,
    start: number,
    end: number
  ) => void
  setMaskStart: (id: string, start: number) => void
  setMaskEnd: (id: string, end: number) => void
  setMuteStart: (id: string, start: number) => void
  setMuteEnd: (id: string, end: number) => void
  setSkipStart: (id: string, start: number) => void
  setSkipEnd: (id: string, end: number) => void
  setGlobalOffsetSeconds: (offset: number) => void
  setMasks: (masks: MaskTrackItem[]) => void
  clearTrackItems: () => void
  closeTrack: () => void
  shiftAllTrackItems: (deltaSeconds: number) => void
  applyLoadedTrackPayload: (
    payload: VeilTrackStorePayload,
    options?: { globalOffsetSeconds?: number }
  ) => void
  patchTrackMetadata: (patch: Partial<TrackMetadata>) => void
  addAnchorAtTime: (time: number, label?: string) => void
  updateAnchor: (id: string, patch: Partial<Pick<TrackAnchor, 'time' | 'label'>>) => void
  removeAnchor: (id: string) => void
  setAnchors: (anchors: TrackAnchor[]) => void
  addGroup: (label: string) => string
  removeGroup: (groupId: string) => void
  renameGroup: (groupId: string, label: string) => void
  setGroupColorToken: (groupId: string, token: GroupColorToken | null) => void
  assignItemToGroup: (itemId: string, groupId: string | null) => void
  disableGroupItems: (groupId: string) => void
  enableGroupItems: (groupId: string) => void
  removeTrackItem: (id: string, type: SelectableItemType) => void
  setSelectedItem: (id: string | null, type: SelectableItemType | null) => void
  selectTimelineItem: (id: string, type: SelectableItemType) => void
  toggleSelectedItem: (id: string, type: SelectableItemType) => void
  setItemEnabled: (id: string, type: SelectableItemType, enabled: boolean) => void
  setItemLocked: (id: string, type: SelectableItemType, locked: boolean) => void
  toggleItemLocked: (id: string, type: SelectableItemType) => void
  toggleItemEnabled: (id: string, type: SelectableItemType) => void
  removeSelectedItem: () => void
  setSubtitleCues: (cues: SrtCue[]) => void
  appendSubtitleCues: (cues: SrtCue[]) => void
  clearSubtitleCues: () => void
  setSubtitleFileName: (fileName: string | null) => void
  setShowSubtitleText: (value: boolean) => void
  setSubtitleCoverMode: (mode: SubtitleCoverMode, options?: { markDirty?: boolean }) => void
  setRegionCoverRect: (rect: PercentRect) => void
  generatePerCueSubtitleMasks: () => number
}

let activeObjectUrl: string | null = null

function revokeActiveObjectUrl(): void {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
}

function updateTimedItems<T extends { id: string; start: number; end: number }>(
  items: T[],
  id: string,
  start: number,
  end: number
): T[] {
  const timing = enforceMaskTiming(start, end)
  return items.map((item) =>
    item.id === id ? { ...item, start: timing.start, end: timing.end } : item
  )
}

function shiftTimedItems<T extends { start: number; end: number }>(
  items: T[],
  deltaSeconds: number
): T[] {
  return items.map((item) => {
    const timing = shiftMaskTiming(item.start, item.end, deltaSeconds)
    return { ...item, start: timing.start, end: timing.end }
  })
}

function shiftSubtitleCues(cues: SrtCue[], deltaSeconds: number): SrtCue[] {
  return cues.map((cue) => {
    const timing = shiftMaskTiming(cue.start, cue.end, deltaSeconds)
    return { ...cue, start: timing.start, end: timing.end }
  })
}

type SelectionState = Pick<
  VeilState,
  'masks' | 'mutes' | 'skips' | 'bookmarks' | 'selectedItems' | 'selectedItemId' | 'selectedItemType'
>

function currentSelectedItems(state: SelectionState): SelectedTimelineItem[] {
  const candidates = state.selectedItems.length > 0
    ? state.selectedItems
    : state.selectedItemId && state.selectedItemType
      ? [{ id: state.selectedItemId, type: state.selectedItemType }]
      : []
  const result: SelectedTimelineItem[] = []
  for (const item of candidates) {
    if (
      trackItemExists(state, item.id, item.type) &&
      !includesTimelineSelectionItem(result, item.id, item.type)
    ) {
      result.push(item)
    }
  }
  return result
}

function selectionPatch(
  selectedItems: SelectedTimelineItem[],
  preferredActive?: SelectedTimelineItem | null
): Pick<VeilState, 'selectedItems' | 'selectedItemId' | 'selectedItemType'> {
  const active = preferredActive && includesTimelineSelectionItem(
    selectedItems,
    preferredActive.id,
    preferredActive.type
  )
    ? preferredActive
    : (selectedItems[selectedItems.length - 1] ?? null)
  return {
    selectedItems,
    selectedItemId: active?.id ?? null,
    selectedItemType: active?.type ?? null
  }
}

export const useVeilStore = create<VeilState>((set, get) => ({
  videoSrc: null,
  videoFilePath: null,
  videoFileName: null,
  videoMetadata: null,
  mediaKind: null,
  mediaSource: null,
  youtubeLoadGeneration: 0,
  youtubeMetadata: null,
  pickedFileBytes: null,
  masks: [],
  mutes: [],
  skips: [],
  bookmarks: [],
  preservedUnsupportedItems: [],
  preservedUnknownItems: [],
  preservedUnknownRootFields: {},
  selectedItems: [],
  selectedItemId: null,
  selectedItemType: null,
  globalOffsetSeconds: 0,
  trackMetadata: { ...EMPTY_TRACK_METADATA },
  groups: [],
  anchors: [],
  subtitleCues: [],
  subtitleFileName: null,
  showSubtitleText: false,
  subtitleCoverMode: DEFAULT_SUBTITLE_COVER_MODE,
  regionCoverRect: { ...DEFAULT_REGION_COVER_RECT },
  isTrackDirty: false,
  trackFilePath: null,

  markTrackDirty: () => {
    set({ isTrackDirty: true })
  },

  markTrackClean: () => {
    set({ isTrackDirty: false })
  },

  setTrackFilePath: (path) => {
    set({ trackFilePath: path })
  },

  validateAndFixSelection: () => {
    const state = get()
    const legacy = validateSelection(state)
    const selectedItems = currentSelectedItems({
      ...state,
      selectedItemId: legacy.selectedItemId,
      selectedItemType: legacy.selectedItemType
    })
    const next = selectionPatch(selectedItems, legacy.selectedItemId && legacy.selectedItemType
      ? { id: legacy.selectedItemId, type: legacy.selectedItemType }
      : null)
    if (
      next.selectedItems !== state.selectedItems ||
      next.selectedItemId !== state.selectedItemId ||
      next.selectedItemType !== state.selectedItemType
    ) {
      set(next)
    }
  },

  setVideoSource: (src, fileName, sourceKind, fileSizeBytes = null, filePath = null, mediaKind = null) => {
    const previousSrc = get().videoSrc
    const previousPrivilegedId = parseVeilApprovedMediaId(previousSrc)

    if (previousPrivilegedId !== null) {
      void window.veil?.releasePrivilegedMedia?.(previousPrivilegedId)
    }

    revokeActiveObjectUrl()
    activeObjectUrl = sourceKind === 'blob' ? src : null
    const resolvedKind = mediaKind ?? inferMediaKindFromFileName(fileName)
    const localPath = filePath ?? src
    set({
      videoSrc: src,
      videoFilePath: filePath,
      videoFileName: fileName,
      pickedFileBytes: fileSizeBytes ?? null,
      videoMetadata: null,
      mediaKind: resolvedKind,
      mediaSource: {
        kind: 'local',
        path: localPath,
        mediaType: resolvedKind === 'audio' ? 'audio' : 'video'
      },
      youtubeLoadGeneration: 0,
      youtubeMetadata: null,
      ...selectionPatch([])
    })
  },

  setMediaKind: (kind) => {
    set({ mediaKind: kind })
  },

  setVideoMetadata: (metadata) => {
    set({ videoMetadata: metadata })
  },

  setMediaSource: (source) => {
    set({ mediaSource: source })
  },

  openYouTubeMedia: (source, options) => {
    const previousSrc = get().videoSrc
    const previousPrivilegedId = parseVeilApprovedMediaId(previousSrc)

    if (previousPrivilegedId !== null) {
      void window.veil?.releasePrivilegedMedia?.(previousPrivilegedId)
    }

    revokeActiveObjectUrl()

    const previous = get()
    const previousYouTube =
      previous.mediaSource && previous.mediaSource.kind === 'youtube'
        ? previous.mediaSource
        : null
    const sameIdentity =
      previousYouTube !== null &&
      previousYouTube.provider === source.provider &&
      previousYouTube.videoId === source.videoId
    const bumpGeneration = options?.reload === true || !sameIdentity

    const displayName = source.title?.trim() || source.videoId
    set({
      videoSrc: null,
      videoFilePath: null,
      videoFileName: displayName,
      pickedFileBytes: null,
      mediaKind: 'video',
      mediaSource: { ...source },
      youtubeLoadGeneration: bumpGeneration
        ? previous.youtubeLoadGeneration + 1
        : previous.youtubeLoadGeneration,
      youtubeMetadata: sameIdentity && previous.youtubeMetadata
        ? previous.youtubeMetadata
        : savedYouTubeMetadata(source),
      ...selectionPatch([]),
      videoMetadata: {
        name: displayName,
        duration: typeof source.duration === 'number' && Number.isFinite(source.duration) ? source.duration : 0,
        fileSize: null,
        width: 0,
        height: 0
      }
    })
  },

  mergeYouTubeMetadata: (metadata) => {
    const state = get()
    if (!state.youtubeMetadata || state.youtubeMetadata.videoId !== metadata.videoId) return
    const merged = mergeYouTubeMetadata(state.youtubeMetadata, metadata)
    const active = state.mediaSource
    set({
      youtubeMetadata: merged,
      ...(active && active.kind === 'youtube' && active.videoId === metadata.videoId
        ? {
            mediaSource: {
              ...active,
              ...(merged.title ? { title: merged.title } : {}),
              ...(typeof merged.duration === 'number' ? { duration: merged.duration } : {})
            },
            videoFileName: merged.title ?? state.videoFileName,
            videoMetadata: state.videoMetadata
              ? {
                  ...state.videoMetadata,
                  name: merged.title ?? state.videoMetadata.name,
                  duration: merged.duration ?? state.videoMetadata.duration
                }
              : state.videoMetadata
          }
        : {})
    })
  },

  setYouTubeMetadataLoading: (videoId) => {
    const current = get().youtubeMetadata
    if (current?.videoId === videoId) set({ youtubeMetadata: markYouTubeMetadataLoading(current) })
  },

  setYouTubeMetadataUnavailable: (videoId, status) => {
    const current = get().youtubeMetadata
    if (current?.videoId === videoId) {
      set({ youtubeMetadata: markYouTubeMetadataUnavailable(current, status) })
    }
  },

  clearVideo: () => {
    const previousSrc = get().videoSrc
    const privilegedMediaId = parseVeilApprovedMediaId(previousSrc)

    revokeActiveObjectUrl()

    if (privilegedMediaId !== null) {
      void window.veil?.releasePrivilegedMedia?.(privilegedMediaId)
    }

    clearTrackHistory()

    set({
      videoSrc: null,
      videoFilePath: null,
      videoFileName: null,
      videoMetadata: null,
      mediaKind: null,
      mediaSource: null,
      youtubeLoadGeneration: 0,
      youtubeMetadata: null,
      pickedFileBytes: null,
      masks: [],
      mutes: [],
      skips: [],
      bookmarks: [],
      preservedUnsupportedItems: [],
      preservedUnknownItems: [],
      preservedUnknownRootFields: {},
      selectedItems: [],
      selectedItemId: null,
      selectedItemType: null,
      globalOffsetSeconds: 0,
      trackMetadata: { ...EMPTY_TRACK_METADATA },
      groups: [],
      anchors: [],
      subtitleCues: [],
      subtitleFileName: null,
      showSubtitleText: false,
      subtitleCoverMode: DEFAULT_SUBTITLE_COVER_MODE,
      regionCoverRect: { ...DEFAULT_REGION_COVER_RECT },
      isTrackDirty: false,
      trackFilePath: null
    })
  },

  addMask: (startSeconds, endSeconds) => {
    recordTrackHistoryBefore()
    const mask = createDefaultMask(startSeconds, endSeconds)
    set({
      masks: [...get().masks, mask],
      selectedItems: [{ id: mask.id, type: 'mask' }],
      selectedItemId: mask.id,
      selectedItemType: 'mask',
      isTrackDirty: true
    })
  },

  addMasks: (newMasks) => {
    if (newMasks.length === 0) {
      return
    }

    recordTrackHistoryBefore()

    set((state) => ({
      masks: [...state.masks, ...newMasks],
      isTrackDirty: true
    }))
  },

  addMute: (startSeconds, endSeconds) => {
    recordTrackHistoryBefore()
    const mute = createMuteItem(startSeconds, endSeconds)
    set({
      mutes: [...get().mutes, mute],
      selectedItems: [{ id: mute.id, type: 'mute' }],
      selectedItemId: mute.id,
      selectedItemType: 'mute',
      isTrackDirty: true
    })
  },

  addSkip: (startSeconds, endSeconds) => {
    recordTrackHistoryBefore()
    const skip = createSkipItem(startSeconds, endSeconds)
    set({
      skips: [...get().skips, skip],
      selectedItems: [{ id: skip.id, type: 'skip' }],
      selectedItemId: skip.id,
      selectedItemType: 'skip',
      isTrackDirty: true
    })
  },

  addBookmark: ({ start, label, notes }) => {
    recordTrackHistoryBefore()
    const bookmark = createBookmarkItem(start, label, notes)
    set({
      bookmarks: [...get().bookmarks, bookmark],
      selectedItems: [{ id: bookmark.id, type: 'bookmark' }],
      selectedItemId: bookmark.id,
      selectedItemType: 'bookmark',
      isTrackDirty: true
    })
  },

  patchBookmark: (id, patch) => {
    const bookmark = get().bookmarks.find((item) => item.id === id)
    if (!bookmark || bookmark.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      bookmarks: state.bookmarks.map((item) =>
        item.id === id ? patchBookmarkFields(item, patch) : item
      ),
      isTrackDirty: true
    }))
  },

  deleteBookmark: (id) => {
    get().removeTrackItem(id, 'bookmark')
  },

  addTrackItemsBatch: ({ masks = [], mutes = [], skips = [], bookmarks = [] }) => {
    if (masks.length === 0 && mutes.length === 0 && skips.length === 0 && bookmarks.length === 0) {
      return null
    }

    recordTrackHistoryBefore()

    const firstMaskId = masks[0]?.id ?? null

    set((state) => ({
      masks: masks.length > 0 ? [...state.masks, ...masks] : state.masks,
      mutes: mutes.length > 0 ? [...state.mutes, ...mutes] : state.mutes,
      skips: skips.length > 0 ? [...state.skips, ...skips] : state.skips,
      bookmarks: bookmarks.length > 0 ? [...state.bookmarks, ...bookmarks] : state.bookmarks,
      ...(firstMaskId
        ? selectionPatch([{ id: firstMaskId, type: 'mask' }])
        : selectionPatch(currentSelectedItems(state), state.selectedItemId && state.selectedItemType
          ? { id: state.selectedItemId, type: state.selectedItemType }
          : null)),
      isTrackDirty: true
    }))

    return firstMaskId
  },

  reconcileTimedItemsBatch: ({
    removeMuteIds = [],
    removeSkipIds = [],
    mutes = [],
    skips = []
  }) => {
    const state = get()
    const muteIds = new Set(removeMuteIds)
    const skipIds = new Set(removeSkipIds)
    const removesMute = state.mutes.some((item) => muteIds.has(item.id))
    const removesSkip = state.skips.some((item) => skipIds.has(item.id))
    if (!removesMute && !removesSkip && mutes.length === 0 && skips.length === 0) {
      return false
    }

    recordTrackHistoryBefore()
    set((current) => {
      const selectedItems = currentSelectedItems(current).filter((item) =>
        !((item.type === 'mute' && muteIds.has(item.id)) ||
          (item.type === 'skip' && skipIds.has(item.id)))
      )
      const preferredActive = current.selectedItemId && current.selectedItemType
        ? { id: current.selectedItemId, type: current.selectedItemType }
        : null
      return {
        mutes: [...current.mutes.filter((item) => !muteIds.has(item.id)), ...mutes],
        skips: [...current.skips.filter((item) => !skipIds.has(item.id)), ...skips],
        ...selectionPatch(selectedItems, preferredActive),
        isTrackDirty: true
      }
    })
    return true
  },

  importManualBuilderBatch: (batch, options) => {
    const replace = options?.replace ?? false
    if (
      batch.masks.length === 0 &&
      batch.mutes.length === 0 &&
      batch.skips.length === 0
    ) {
      return null
    }

    recordTrackHistoryBefore()

    set((state) => ({
      masks: replace ? batch.masks : [...state.masks, ...batch.masks],
      mutes: replace ? batch.mutes : [...state.mutes, ...batch.mutes],
      skips: replace ? batch.skips : [...state.skips, ...batch.skips],
      ...(batch.firstMaskId
        ? selectionPatch([{ id: batch.firstMaskId, type: 'mask' }])
        : selectionPatch(currentSelectedItems(state), state.selectedItemId && state.selectedItemType
          ? { id: state.selectedItemId, type: state.selectedItemType }
          : null)),
      isTrackDirty: true
    }))

    return batch.firstMaskId
  },

  patchMaskRect: (id, rect) => {
    const mask = get().masks.find((m) => m.id === id)
    if (mask?.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      masks: state.masks.map((m) => (m.id === id ? { ...m, rect } : m)),
      isTrackDirty: true
    }))
  },

  patchMaskStyle: (id, style) => {
    const mask = get().masks.find((m) => m.id === id)
    if (mask?.locked) {
      return
    }
    if (style.color !== undefined) {
      addRecentMaskColor(style.color)
    }
    recordTrackHistoryBefore()
    set((state) => ({
      masks: state.masks.map((mask) =>
        mask.id === id ? { ...mask, style: { ...mask.style, ...style } } : mask
      ),
      isTrackDirty: true
    }))
  },

  patchMaskTiming: (id, start, end) => {
    const mask = get().masks.find((m) => m.id === id)
    if (mask?.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      masks: updateTimedItems(state.masks, id, start, end),
      isTrackDirty: true
    }))
  },

  patchMaskFade: (id, fadeInMs, fadeOutMs) => {
    const mask = get().masks.find((m) => m.id === id)
    if (mask?.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      masks: state.masks.map((m) =>
        m.id === id
          ? {
              ...m,
              fadeInMs: Math.max(0, Math.min(5000, Math.round(fadeInMs))),
              fadeOutMs: Math.max(0, Math.min(5000, Math.round(fadeOutMs)))
            }
          : m
      ),
      isTrackDirty: true
    }))
  },

  patchMuteTiming: (id, start, end) => {
    const mute = get().mutes.find((m) => m.id === id)
    if (mute?.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      mutes: updateTimedItems(state.mutes, id, start, end),
      isTrackDirty: true
    }))
  },

  patchSkipTiming: (id, start, end) => {
    const skip = get().skips.find((m) => m.id === id)
    if (skip?.locked) {
      return
    }
    recordTrackHistoryBefore()
    set((state) => ({
      skips: updateTimedItems(state.skips, id, start, end),
      isTrackDirty: true
    }))
  },

  patchTrackItemTiming: (id, type, start, end) => {
    if (type === 'mask') {
      get().patchMaskTiming(id, start, end)
    } else if (type === 'mute') {
      get().patchMuteTiming(id, start, end)
    } else if (type === 'skip') {
      get().patchSkipTiming(id, start, end)
    } else {
      get().patchBookmark(id, { start })
    }
  },

  setMaskStart: (id, start) => {
    recordTrackHistoryBefore()
    set((state) => {
      const mask = state.masks.find((m) => m.id === id)
      if (!mask) {
        return state
      }
      return {
        masks: updateTimedItems(state.masks, id, start, mask.end),
        isTrackDirty: true
      }
    })
  },

  setMaskEnd: (id, end) => {
    recordTrackHistoryBefore()
    set((state) => {
      const mask = state.masks.find((m) => m.id === id)
      if (!mask) {
        return state
      }
      return {
        masks: updateTimedItems(state.masks, id, mask.start, end),
        isTrackDirty: true
      }
    })
  },

  setMuteStart: (id, start) => {
    recordTrackHistoryBefore()
    set((state) => {
      const mute = state.mutes.find((m) => m.id === id)
      if (!mute) {
        return state
      }
      return {
        mutes: updateTimedItems(state.mutes, id, start, mute.end),
        isTrackDirty: true
      }
    })
  },

  setMuteEnd: (id, end) => {
    recordTrackHistoryBefore()
    set((state) => {
      const mute = state.mutes.find((m) => m.id === id)
      if (!mute) {
        return state
      }
      return {
        mutes: updateTimedItems(state.mutes, id, mute.start, end),
        isTrackDirty: true
      }
    })
  },

  setSkipStart: (id, start) => {
    recordTrackHistoryBefore()
    set((state) => {
      const skip = state.skips.find((m) => m.id === id)
      if (!skip) {
        return state
      }
      return {
        skips: updateTimedItems(state.skips, id, start, skip.end),
        isTrackDirty: true
      }
    })
  },

  setSkipEnd: (id, end) => {
    recordTrackHistoryBefore()
    set((state) => {
      const skip = state.skips.find((m) => m.id === id)
      if (!skip) {
        return state
      }
      return {
        skips: updateTimedItems(state.skips, id, skip.start, end),
        isTrackDirty: true
      }
    })
  },

  setGlobalOffsetSeconds: (offset) => {
    recordTrackHistoryBefore()
    set({ globalOffsetSeconds: offset, isTrackDirty: true })
  },

  setMasks: (masks) => {
    recordTrackHistoryBefore()
    set({ masks, isTrackDirty: true })
  },

  clearTrackItems: () => {
    clearTrackHistory()
    set({
      masks: [],
      mutes: [],
      skips: [],
      bookmarks: [],
      preservedUnsupportedItems: [],
      preservedUnknownItems: [],
      preservedUnknownRootFields: {},
      selectedItems: [],
      selectedItemId: null,
      selectedItemType: null,
      trackMetadata: { ...EMPTY_TRACK_METADATA },
      groups: [],
      anchors: [],
      subtitleCues: [],
      subtitleFileName: null,
      isTrackDirty: false,
      trackFilePath: null
    })
  },

  closeTrack: () => {
    clearTrackHistory()
    set({
      masks: [],
      mutes: [],
      skips: [],
      bookmarks: [],
      preservedUnsupportedItems: [],
      preservedUnknownItems: [],
      preservedUnknownRootFields: {},
      selectedItems: [],
      selectedItemId: null,
      selectedItemType: null,
      globalOffsetSeconds: 0,
      trackMetadata: { ...EMPTY_TRACK_METADATA },
      groups: [],
      anchors: [],
      subtitleCues: [],
      subtitleFileName: null,
      showSubtitleText: false,
      subtitleCoverMode: DEFAULT_SUBTITLE_COVER_MODE,
      regionCoverRect: { ...DEFAULT_REGION_COVER_RECT },
      isTrackDirty: false,
      trackFilePath: null
    })
  },

  shiftAllTrackItems: (deltaSeconds) => {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds === 0) {
      return
    }

    recordTrackHistoryBefore()

    set((state) => ({
      masks: shiftTimedItems(state.masks, deltaSeconds),
      mutes: shiftTimedItems(state.mutes, deltaSeconds),
      skips: shiftTimedItems(state.skips, deltaSeconds),
      bookmarks: shiftBookmarkItems(state.bookmarks, deltaSeconds),
      subtitleCues: shiftSubtitleCues(state.subtitleCues, deltaSeconds),
      isTrackDirty: true
    }))
  },

  applyLoadedTrackPayload: (payload, options) => {
    clearTrackHistory()
    set({
      masks: payload.masks,
      mutes: payload.mutes,
      skips: payload.skips,
      bookmarks: payload.bookmarks,
      preservedUnsupportedItems: payload.preservedUnsupportedItems ?? [],
      preservedUnknownItems: payload.preservedUnknownItems ?? [],
      preservedUnknownRootFields: payload.preservedUnknownRootFields ?? {},
      globalOffsetSeconds: options?.globalOffsetSeconds ?? payload.globalOffsetSeconds,
      trackMetadata: { ...payload.trackMetadata },
      groups: structuredClone(payload.groups),
      anchors: structuredClone(payload.anchors),
      selectedItems: [],
      selectedItemId: null,
      selectedItemType: null,
      subtitleCues: [],
      subtitleFileName: null,
      showSubtitleText: false,
      subtitleCoverMode: payload.subtitleCoverMode ?? DEFAULT_SUBTITLE_COVER_MODE,
      regionCoverRect: payload.regionCoverRect
        ? { ...payload.regionCoverRect }
        : { ...DEFAULT_REGION_COVER_RECT },
      isTrackDirty: false
    })
  },

  patchTrackMetadata: (patch) => {
    recordTrackHistoryBefore()
    const sanitized = sanitizeTrackMetadataPatch(patch)
    set((state) => ({
      trackMetadata: sanitizeTrackMetadata({ ...state.trackMetadata, ...sanitized }),
      isTrackDirty: true
    }))
  },

  addAnchorAtTime: (time, label) => {
    recordTrackHistoryBefore()
    const anchor = createManualAnchor(time, label)
    set((state) => ({
      anchors: sortAnchorsByTime([...state.anchors, anchor]),
      isTrackDirty: true
    }))
  },

  updateAnchor: (id, patch) => {
    recordTrackHistoryBefore()
    set((state) => ({
      anchors: sortAnchorsByTime(
        state.anchors.map((anchor) =>
          anchor.id === id
            ? {
                ...anchor,
                ...(patch.time !== undefined ? { time: patch.time } : {}),
                ...(patch.label !== undefined
                  ? patch.label?.trim()
                    ? { label: patch.label.trim() }
                    : {}
                  : {})
              }
            : anchor
        )
      ),
      isTrackDirty: true
    }))
  },

  removeAnchor: (id) => {
    recordTrackHistoryBefore()
    set((state) => ({
      anchors: state.anchors.filter((anchor) => anchor.id !== id),
      isTrackDirty: true
    }))
  },

  setAnchors: (anchors) => {
    recordTrackHistoryBefore()
    set({ anchors: sortAnchorsByTime(anchors), isTrackDirty: true })
  },

  addGroup: (label) => {
    recordTrackHistoryBefore()
    const id = createMaskId()
    set((state) => ({
      groups: [...state.groups, { id, label: label.trim() || 'Group', itemIds: [] }],
      isTrackDirty: true
    }))
    return id
  },

  removeGroup: (groupId) => {
    recordTrackHistoryBefore()
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== groupId),
      isTrackDirty: true
    }))
  },

  renameGroup: (groupId, label) => {
    recordTrackHistoryBefore()
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === groupId ? { ...group, label: label.trim() || group.label } : group
      ),
      isTrackDirty: true
    }))
  },

  setGroupColorToken: (groupId, token) => {
    recordTrackHistoryBefore()
    set((state) => ({
      groups: state.groups.map((group) => {
        if (group.id !== groupId) {
          return group
        }
        if (token === null) {
          const { colorToken: _removed, ...rest } = group
          return rest as TrackGroup
        }
        return { ...group, colorToken: token }
      }),
      isTrackDirty: true
    }))
  },

  assignItemToGroup: (itemId, groupId) => {
    recordTrackHistoryBefore()
    set((state) => ({
      groups: state.groups.map((group) => {
        const withoutItem = group.itemIds.filter((id) => id !== itemId)
        if (groupId !== null && group.id === groupId) {
          return { ...group, itemIds: [...withoutItem, itemId] }
        }
        return { ...group, itemIds: withoutItem }
      }),
      isTrackDirty: true
    }))
  },

  disableGroupItems: (groupId) => {
    const state = get()
    const group = state.groups.find((entry) => entry.id === groupId)
    if (!group) {
      return
    }
    recordTrackHistoryBefore()
    const memberIds = new Set(group.itemIds)
    set({
      masks: state.masks.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: false } : item
      ),
      mutes: state.mutes.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: false } : item
      ),
      skips: state.skips.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: false } : item
      ),
      bookmarks: state.bookmarks.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: false } : item
      ),
      isTrackDirty: true
    })
  },

  enableGroupItems: (groupId) => {
    const state = get()
    const group = state.groups.find((entry) => entry.id === groupId)
    if (!group) {
      return
    }
    recordTrackHistoryBefore()
    const memberIds = new Set(group.itemIds)
    set({
      masks: state.masks.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: true } : item
      ),
      mutes: state.mutes.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: true } : item
      ),
      skips: state.skips.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: true } : item
      ),
      bookmarks: state.bookmarks.map((item) =>
        memberIds.has(item.id) ? { ...item, enabled: true } : item
      ),
      isTrackDirty: true
    })
  },

  removeTrackItem: (id, type) => {
    recordTrackHistoryBefore()
    set((state) => {
      const selectedItems = currentSelectedItems(state).filter(
        (item) => item.id !== id || item.type !== type
      )
      const preferredActive = state.selectedItemId === id && state.selectedItemType === type
        ? null
        : state.selectedItemId && state.selectedItemType
          ? { id: state.selectedItemId, type: state.selectedItemType }
          : null
      const groups = state.groups.map((group) => ({
        ...group,
        itemIds: group.itemIds.filter((itemId) => itemId !== id)
      }))
      return {
        masks: type === 'mask' ? state.masks.filter((item) => item.id !== id) : state.masks,
        mutes: type === 'mute' ? state.mutes.filter((item) => item.id !== id) : state.mutes,
        skips: type === 'skip' ? state.skips.filter((item) => item.id !== id) : state.skips,
        bookmarks: type === 'bookmark'
          ? state.bookmarks.filter((item) => item.id !== id)
          : state.bookmarks,
        groups,
        ...selectionPatch(selectedItems, preferredActive),
        isTrackDirty: true
      }
    })
  },

  setSelectedItem: (id, type) => {
    if (id === null && type === null) {
      set(selectionPatch([]))
      return
    }

    if (id === null || type === null) {
      return
    }

    const state = get()
    if (!trackItemExists(state, id, type)) {
      return
    }

    set(selectionPatch([{ id, type }], { id, type }))
  },

  selectTimelineItem: (id, type) => {
    const state = get()
    if (!trackItemExists(state, id, type)) return
    const selectedItems = currentSelectedItems(state)
    if (
      selectedItems.length === 1 &&
      includesTimelineSelectionItem(selectedItems, id, type)
    ) {
      set(selectionPatch([]))
      return
    }
    set(selectionPatch([{ id, type }], { id, type }))
  },

  toggleSelectedItem: (id, type) => {
    const state = get()
    if (!trackItemExists(state, id, type)) return
    const selectedItems = toggleTimelineSelectionItem(currentSelectedItems(state), { id, type })
    const clickedRemainsSelected = includesTimelineSelectionItem(selectedItems, id, type)
    const currentActive = state.selectedItemId && state.selectedItemType
      ? { id: state.selectedItemId, type: state.selectedItemType }
      : null
    set(selectionPatch(selectedItems, clickedRemainsSelected ? { id, type } : currentActive))
  },

  patchItemLabel: (id, type, label) => {
    recordTrackHistoryBefore()
    const normalized = label?.trim() || undefined
    if (type === 'mask') {
      set((state) => ({
        masks: state.masks.map((item) =>
          item.id === id ? { ...item, label: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'mute') {
      set((state) => ({
        mutes: state.mutes.map((item) =>
          item.id === id ? { ...item, label: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'skip') {
      set((state) => ({
        skips: state.skips.map((item) =>
          item.id === id ? { ...item, label: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    get().patchBookmark(id, { label: label ?? '' })
  },

  patchItemNotes: (id, type, notes) => {
    recordTrackHistoryBefore()
    const normalized = notes?.trim() || undefined
    if (type === 'mask') {
      set((state) => ({
        masks: state.masks.map((item) =>
          item.id === id ? { ...item, notes: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'mute') {
      set((state) => ({
        mutes: state.mutes.map((item) =>
          item.id === id ? { ...item, notes: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'skip') {
      set((state) => ({
        skips: state.skips.map((item) =>
          item.id === id ? { ...item, notes: normalized } : item
        ),
        isTrackDirty: true
      }))
      return
    }
    get().patchBookmark(id, { notes: notes ?? '' })
  },

  setItemEnabled: (id, type, enabled) => {
    recordTrackHistoryBefore()
    if (type === 'mask') {
      set((state) => ({
        masks: state.masks.map((item) => (item.id === id ? { ...item, enabled } : item)),
        isTrackDirty: true
      }))
      return
    }

    if (type === 'mute') {
      set((state) => ({
        mutes: state.mutes.map((item) => (item.id === id ? { ...item, enabled } : item)),
        isTrackDirty: true
      }))
      return
    }

    if (type === 'skip') {
      set((state) => ({
        skips: state.skips.map((item) => (item.id === id ? { ...item, enabled } : item)),
        isTrackDirty: true
      }))
      return
    }

    get().patchBookmark(id, { enabled })
  },

  setItemLocked: (id, type, locked) => {
    recordTrackHistoryBefore()
    if (type === 'mask') {
      set((state) => ({
        masks: state.masks.map((item) => (item.id === id ? { ...item, locked } : item)),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'mute') {
      set((state) => ({
        mutes: state.mutes.map((item) => (item.id === id ? { ...item, locked } : item)),
        isTrackDirty: true
      }))
      return
    }
    if (type === 'skip') {
      set((state) => ({
        skips: state.skips.map((item) => (item.id === id ? { ...item, locked } : item)),
        isTrackDirty: true
      }))
      return
    }
    set((state) => ({
      bookmarks: state.bookmarks.map((item) => (item.id === id ? { ...item, locked } : item)),
      isTrackDirty: true
    }))
  },

  toggleItemLocked: (id, type) => {
    const state = get()
    if (type === 'mask') {
      const item = state.masks.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemLocked(id, type, item.locked !== true)
      return
    }
    if (type === 'mute') {
      const item = state.mutes.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemLocked(id, type, item.locked !== true)
      return
    }
    if (type === 'skip') {
      const item = state.skips.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemLocked(id, type, item.locked !== true)
      return
    }
    const item = state.bookmarks.find((m) => m.id === id)
    if (!item) {
      return
    }
    get().setItemLocked(id, type, item.locked !== true)
  },

  toggleItemEnabled: (id, type) => {
    const state = get()

    if (type === 'mask') {
      const item = state.masks.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemEnabled(id, type, item.enabled === false)
      return
    }

    if (type === 'mute') {
      const item = state.mutes.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemEnabled(id, type, item.enabled === false)
      return
    }

    if (type === 'skip') {
      const item = state.skips.find((m) => m.id === id)
      if (!item) {
        return
      }
      get().setItemEnabled(id, type, item.enabled === false)
      return
    }

    const item = state.bookmarks.find((m) => m.id === id)
    if (!item) {
      return
    }
    get().setItemEnabled(id, type, item.enabled === false)
  },

  removeSelectedItem: () => {
    const state = get()
    const selectedItems = currentSelectedItems(state)
    if (selectedItems.length === 0) return

    recordTrackHistoryBefore()
    const selectedByType = {
      mask: new Set(selectedItems.filter((item) => item.type === 'mask').map((item) => item.id)),
      mute: new Set(selectedItems.filter((item) => item.type === 'mute').map((item) => item.id)),
      skip: new Set(selectedItems.filter((item) => item.type === 'skip').map((item) => item.id)),
      bookmark: new Set(selectedItems.filter((item) => item.type === 'bookmark').map((item) => item.id))
    }
    const removedIds = new Set(selectedItems.map((item) => item.id))
    set((current) => ({
      masks: current.masks.filter((item) => !selectedByType.mask.has(item.id)),
      mutes: current.mutes.filter((item) => !selectedByType.mute.has(item.id)),
      skips: current.skips.filter((item) => !selectedByType.skip.has(item.id)),
      bookmarks: current.bookmarks.filter((item) => !selectedByType.bookmark.has(item.id)),
      groups: current.groups.map((group) => ({
        ...group,
        itemIds: group.itemIds.filter((itemId) => !removedIds.has(itemId))
      })),
      ...selectionPatch([]),
      isTrackDirty: true
    }))
  },

  setSubtitleCues: (cues) => {
    set({ subtitleCues: cues })
  },

  appendSubtitleCues: (cues) => {
    if (cues.length === 0) {
      return
    }
    set((state) => ({
      subtitleCues: [...state.subtitleCues, ...cues]
    }))
  },

  clearSubtitleCues: () => {
    set({ subtitleCues: [], subtitleFileName: null })
  },

  setSubtitleFileName: (fileName) => {
    set({ subtitleFileName: fileName })
  },

  setShowSubtitleText: (value) => {
    set({ showSubtitleText: value })
  },

  setSubtitleCoverMode: (mode, options) => {
    const markDirty = options?.markDirty !== false
    set({
      subtitleCoverMode: mode,
      ...(markDirty ? { isTrackDirty: true } : {})
    })
  },

  setRegionCoverRect: (rect) => {
    recordTrackHistoryBefore()
    set({ regionCoverRect: rect, isTrackDirty: true })
  },

  generatePerCueSubtitleMasks: () => {
    const { subtitleCues, masks } = get()
    if (subtitleCues.length === 0) {
      return 0
    }

    const existingSrtCount = masks.filter((mask) => mask.source?.kind === 'srt').length
    if (existingSrtCount > 0) {
      const proceed = confirmNative(
        'Replace Subtitle Masks', `Replace ${existingSrtCount} existing subtitle mask(s) with ${subtitleCues.length} new per-cue mask(s)?`
      )
      if (!proceed) {
        return 0
      }
      recordTrackHistoryBefore()
      set((state) => ({
        masks: state.masks.filter((mask) => mask.source?.kind !== 'srt')
      }))
    } else {
      recordTrackHistoryBefore()
    }

    const generated = createSubtitleMasksFromCues(subtitleCues)
    get().addMasks(generated)
    return generated.length
  }
}))
