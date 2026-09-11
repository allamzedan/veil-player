import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem,
  TrackAnchor,
  TrackGroup,
  TrackMetadata
} from '../types/track'
import { EMPTY_TRACK_METADATA } from '../types/track'

export interface TrackHistorySnapshot {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  globalOffsetSeconds: number
  trackMetadata: TrackMetadata
  groups: TrackGroup[]
  anchors: TrackAnchor[]
  timestamp: number
}

export interface TrackSnapshotSource {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  bookmarks: BookmarkTrackItem[]
  globalOffsetSeconds: number
  trackMetadata: TrackMetadata
  groups: TrackGroup[]
  anchors: TrackAnchor[]
}

export function captureTrackSnapshot(source: TrackSnapshotSource): TrackHistorySnapshot {
  return {
    masks: structuredClone(source.masks),
    mutes: structuredClone(source.mutes),
    skips: structuredClone(source.skips),
    bookmarks: structuredClone(source.bookmarks),
    globalOffsetSeconds: source.globalOffsetSeconds,
    trackMetadata: structuredClone(source.trackMetadata),
    groups: structuredClone(source.groups),
    anchors: structuredClone(source.anchors),
    timestamp: Date.now()
  }
}

export function snapshotsEqual(a: TrackHistorySnapshot, b: TrackHistorySnapshot): boolean {
  return (
    a.globalOffsetSeconds === b.globalOffsetSeconds &&
    JSON.stringify(a.masks) === JSON.stringify(b.masks) &&
    JSON.stringify(a.mutes) === JSON.stringify(b.mutes) &&
    JSON.stringify(a.skips) === JSON.stringify(b.skips) &&
    JSON.stringify(a.bookmarks) === JSON.stringify(b.bookmarks) &&
    JSON.stringify(a.trackMetadata) === JSON.stringify(b.trackMetadata) &&
    JSON.stringify(a.groups) === JSON.stringify(b.groups) &&
    JSON.stringify(a.anchors) === JSON.stringify(b.anchors)
  )
}

export const emptyTrackSnapshotSource = (): TrackSnapshotSource => ({
  masks: [],
  mutes: [],
  skips: [],
  bookmarks: [],
  globalOffsetSeconds: 0,
  trackMetadata: { ...EMPTY_TRACK_METADATA },
  groups: [],
  anchors: []
})
