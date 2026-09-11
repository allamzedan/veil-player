import {
  DEFAULT_REGION_COVER_RECT,
  DEFAULT_SUBTITLE_COVER_MODE
} from './subtitleCoverDefaults'
import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  PercentRect,
  SkipTrackItem,
  SubtitleCoverMode,
  TrackAnchor,
  TrackGroup,
  TrackMetadata,
  VeilTrack,
  YouTubeTrackMedia
} from '../types/track'
import { EMPTY_TRACK_METADATA, SUPPORTED_TRACK_VERSION } from '../types/track'
import { normalizeBookmarkItem } from './bookmarks'
import { sanitizeTrackMetadata } from './trackMetadataValidation'
import { APP_VERSION } from './appVersion'
import { buildMetadataFingerprint } from './fingerprint'
import { collectValidItemIds, normalizeGroupsOnLoad } from './trackGrouping'
import { normalizeTrackItemEnabled } from './trackItems'
import { parseVeilTrackJson, type ParseVeilTrackResult, type PreservedUnknownTrackItem, type ParsedVeilTrack } from './trackSchema'
import type { VideoMetadata } from '../state/useVeilStore'
import type { MediaSource, YouTubeMediaSource } from '../types/mediaSource'
import { isYouTubeMediaSource } from '../types/mediaSource'
import { toCanonicalYouTubeWatchUrl } from './youtubeUrl'

export interface VeilTrackStorePayload {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  /** Non-executable legacy actions retained for lossless YouTube save/reopen. */
  preservedUnsupportedItems?: UnsupportedYouTubeTrackItem[]
  preservedUnknownItems?: PreservedUnknownTrackItem[]
  preservedUnknownRootFields?: Record<string, unknown>
  globalOffsetSeconds: number
  trackMetadata: TrackMetadata
  groups: TrackGroup[]
  anchors: TrackAnchor[]
  subtitleCoverMode: SubtitleCoverMode
  regionCoverRect: PercentRect
  /** Present when the loaded track is YouTube-bound (schema 1.6.0). */
  youtubeMedia?: YouTubeTrackMedia
}

export interface VeilStoreSnapshotForTrack {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  preservedUnsupportedItems?: UnsupportedYouTubeTrackItem[]
  preservedUnknownItems?: PreservedUnknownTrackItem[]
  preservedUnknownRootFields?: Record<string, unknown>
  globalOffsetSeconds: number
  trackMetadata: TrackMetadata
  groups: TrackGroup[]
  anchors: TrackAnchor[]
  subtitleCoverMode: SubtitleCoverMode
  regionCoverRect: PercentRect
  videoMetadata: VideoMetadata | null
  videoFileName: string | null
  mediaSource?: MediaSource | null
}

export type UnsupportedYouTubeTrackItem = MaskTrackItem | MuteTrackItem | SkipTrackItem

function restoreUnknownItems(items: VeilTrack['items'], preserved: PreservedUnknownTrackItem[] = []): Array<VeilTrack['items'][number] | Record<string, unknown>> {
  const output: Array<VeilTrack['items'][number] | Record<string, unknown>> = [...items]
  for (const entry of [...preserved].sort((a, b) => a.index - b.index)) {
    output.splice(Math.min(Math.max(entry.index, 0), output.length), 0, structuredClone(entry.value))
  }
  return output
}

function assertUniqueItemIds(items: Array<VeilTrack['items'][number] | Record<string, unknown>>): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (typeof item.id !== 'string') continue
    if (seen.has(item.id)) throw new Error('Cannot save VEIL document: duplicate item id "' + item.id + '"')
    seen.add(item.id)
  }
}

function normalizeLocked<T extends { locked?: boolean }>(item: T): T {
  return { ...item, locked: item.locked === true }
}

function normalizeMask(item: MaskTrackItem): MaskTrackItem {
  return normalizeLocked(normalizeTrackItemEnabled(item))
}

function normalizeMute(item: MuteTrackItem): MuteTrackItem {
  return normalizeLocked(normalizeTrackItemEnabled(item))
}

function normalizeSkip(item: SkipTrackItem): SkipTrackItem {
  return normalizeLocked(normalizeTrackItemEnabled(item))
}

function normalizeBookmark(item: BookmarkTrackItem): BookmarkTrackItem {
  return normalizeLocked(normalizeBookmarkItem(item))
}

function normalizeUnsupportedYouTubeItem(
  item: UnsupportedYouTubeTrackItem
): UnsupportedYouTubeTrackItem {
  if (item.type === 'mask') {
    return normalizeMask(item)
  }
  if (item.type === 'mute') {
    return normalizeMute(item)
  }
  return normalizeSkip(item)
}

function normalizeTrackMetadata(metadata: TrackMetadata | undefined): TrackMetadata {
  if (!metadata) {
    return { ...EMPTY_TRACK_METADATA }
  }
  return sanitizeTrackMetadata(metadata)
}

function normalizeAnchors(anchors: TrackAnchor[] | undefined): TrackAnchor[] {
  if (!anchors) {
    return []
  }
  return anchors
    .filter((anchor) => Number.isFinite(anchor.time) && anchor.time >= 0)
    .map((anchor) => ({
      id: anchor.id,
      time: anchor.time,
      ...(anchor.label?.trim() ? { label: anchor.label.trim() } : {}),
      ...(anchor.kind ? { kind: anchor.kind } : {})
    }))
}

export function isYouTubeBoundTrack(track: VeilTrack): boolean {
  return track.media?.kind === 'youtube' && Boolean(track.media.videoId)
}

export function youtubeMediaFromTrack(track: VeilTrack): YouTubeTrackMedia | null {
  if (!isYouTubeBoundTrack(track) || !track.media) {
    return null
  }
  return {
    kind: 'youtube',
    provider: 'youtube',
    videoId: track.media.videoId,
    canonicalUrl:
      track.media.canonicalUrl || toCanonicalYouTubeWatchUrl(track.media.videoId),
    ...(typeof track.media.duration === 'number' ? { duration: track.media.duration } : {}),
    ...(track.media.title ? { title: track.media.title } : {})
  }
}

export function youtubeMediaSourceFromTrack(track: VeilTrack): YouTubeMediaSource | null {
  const media = youtubeMediaFromTrack(track)
  if (!media) {
    return null
  }
  return {
    kind: 'youtube',
    provider: 'youtube',
    videoId: media.videoId,
    canonicalUrl: media.canonicalUrl,
    ...(media.title ? { title: media.title } : {}),
    ...(typeof media.duration === 'number' ? { duration: media.duration } : {})
  }
}

export function deserializeVeilTrackToStorePayload(track: ParsedVeilTrack): VeilTrackStorePayload {
  const isYouTube = isYouTubeBoundTrack(track)

  const preservedUnsupportedItems = isYouTube
    ? track.items
        .filter(
          (item): item is UnsupportedYouTubeTrackItem =>
            item.type === 'mask'
        )
        .map(normalizeUnsupportedYouTubeItem)
    : []

  // YouTube visual masks remain preserved but non-executable. Mute and Skip ranges
  // use the same schema and store structures as local playback.
  const masks = isYouTube
    ? []
    : track.items
        .filter((item): item is MaskTrackItem => item.type === 'mask')
        .map(normalizeMask)
  const mutes = track.items
    .filter((item): item is MuteTrackItem => item.type === 'mute')
    .map(normalizeMute)
  const skips = track.items
    .filter((item): item is SkipTrackItem => item.type === 'skip')
    .map(normalizeSkip)
  const bookmarks = track.items
    .filter((item): item is BookmarkTrackItem => item.type === 'bookmark')
    .map(normalizeBookmark)

  const preservedMasks = preservedUnsupportedItems.filter(
    (item): item is MaskTrackItem => item.type === 'mask'
  )
  const preservedMutes = preservedUnsupportedItems.filter(
    (item): item is MuteTrackItem => item.type === 'mute'
  )
  const preservedSkips = preservedUnsupportedItems.filter(
    (item): item is SkipTrackItem => item.type === 'skip'
  )
  const validItemIds = collectValidItemIds(
    [...masks, ...preservedMasks],
    [...mutes, ...preservedMutes],
    [...skips, ...preservedSkips],
    bookmarks
  )

  const subtitleCoverMode = isYouTube
    ? DEFAULT_SUBTITLE_COVER_MODE
    : (track.subtitleCover?.mode ?? DEFAULT_SUBTITLE_COVER_MODE)
  const regionCoverRect = isYouTube
    ? { ...DEFAULT_REGION_COVER_RECT }
    : track.subtitleCover?.regionRect
      ? { ...track.subtitleCover.regionRect }
      : { ...DEFAULT_REGION_COVER_RECT }

  const youtubeMedia = youtubeMediaFromTrack(track) ?? undefined

  return {
    masks,
    mutes,
    skips,
    bookmarks,
    preservedUnsupportedItems,
    preservedUnknownItems: track.preservedUnknownItems ?? [],
    preservedUnknownRootFields: track.preservedUnknownRootFields ?? {},
    globalOffsetSeconds: track.globalOffsetSeconds,
    trackMetadata: normalizeTrackMetadata(track.trackMetadata),
    groups: normalizeGroupsOnLoad(track.groups, validItemIds),
    anchors: normalizeAnchors(track.anchors),
    subtitleCoverMode,
    regionCoverRect,
    ...(youtubeMedia ? { youtubeMedia } : {})
  }
}

export function buildVeilTrackFromStore(state: VeilStoreSnapshotForTrack): VeilTrack | null {
  const mediaSource = state.mediaSource ?? null

  if (mediaSource && isYouTubeMediaSource(mediaSource)) {
    const now = new Date().toISOString()
    const trackMetadata: TrackMetadata = sanitizeTrackMetadata({
      ...state.trackMetadata,
      createdAt: state.trackMetadata.createdAt ?? now,
      updatedAt: now
    })
    const duration =
      typeof mediaSource.duration === 'number' && Number.isFinite(mediaSource.duration)
        ? mediaSource.duration
        : state.videoMetadata?.duration

    const media: YouTubeTrackMedia = {
      kind: 'youtube',
      provider: 'youtube',
      videoId: mediaSource.videoId,
      canonicalUrl: mediaSource.canonicalUrl || toCanonicalYouTubeWatchUrl(mediaSource.videoId),
      ...(typeof duration === 'number' && Number.isFinite(duration) ? { duration } : {}),
      ...(mediaSource.title ? { title: mediaSource.title } : {})
    }

    const outputItems = restoreUnknownItems([
      ...(state.preservedUnsupportedItems ?? []), ...state.masks, ...state.mutes, ...state.skips, ...state.bookmarks
    ], state.preservedUnknownItems)
    assertUniqueItemIds(outputItems)
    const track: VeilTrack = {
      ...(state.preservedUnknownRootFields ?? {}),
      version: SUPPORTED_TRACK_VERSION,
      app: 'VEIL',
      appVersion: APP_VERSION,
      exportedAt: now,
      media,
      globalOffsetSeconds: state.globalOffsetSeconds,
      trackMetadata,
      items: outputItems as VeilTrack['items']
    }

    if (state.groups.length > 0) {
      track.groups = state.groups
    }
    if (state.anchors.length > 0) {
      track.anchors = state.anchors
    }

    return track
  }

  if (!state.videoMetadata || !state.videoFileName) {
    return null
  }

  const metadata = state.videoMetadata
  const fileName = state.videoFileName
  const now = new Date().toISOString()
  const trackMetadata: TrackMetadata = sanitizeTrackMetadata({
    ...state.trackMetadata,
    createdAt: state.trackMetadata.createdAt ?? now,
    updatedAt: now
  })

  const outputItems = restoreUnknownItems(
    [...state.masks, ...state.mutes, ...state.skips, ...state.bookmarks],
    state.preservedUnknownItems
  )
  assertUniqueItemIds(outputItems)
  const track: VeilTrack = {
    ...(state.preservedUnknownRootFields ?? {}),
    version: SUPPORTED_TRACK_VERSION,
    app: 'VEIL',
    appVersion: APP_VERSION,
    exportedAt: now,
    video: {
      name: fileName,
      duration: metadata.duration,
      fileSize: metadata.fileSize,
      resolution: {
        width: metadata.width,
        height: metadata.height
      },
      fingerprint: buildMetadataFingerprint(fileName, metadata)
    },
    globalOffsetSeconds: state.globalOffsetSeconds,
    trackMetadata,
    items: outputItems as VeilTrack['items']
  }

  if (state.groups.length > 0) {
    track.groups = state.groups
  }
  if (state.anchors.length > 0) {
    track.anchors = state.anchors
  }

  track.subtitleCover = {
    mode: state.subtitleCoverMode,
    regionRect: { ...state.regionCoverRect }
  }

  return track
}

export function parseAndDeserializeTrackJson(jsonText: string): ParseVeilTrackResult & {
  payload?: VeilTrackStorePayload
} {
  const parsed = parseVeilTrackJson(jsonText)
  if (!parsed.ok) {
    return parsed
  }
  return {
    ok: true,
    track: parsed.track,
    status: parsed.status,
    payload: deserializeVeilTrackToStorePayload(parsed.track)
  }
}
