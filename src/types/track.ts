/**
 * Zustand uses masks[], mutes[], skips[], bookmarks[] internally.
 * Persisted VeilTrack files use items: TrackItem[] (joined on save/load).
 */
export type TrackItemType = 'mask' | 'mute' | 'skip' | 'bookmark'

export const LEGACY_TRACK_VERSION = '1.0.0'
export const TRACK_VERSION_1_1 = '1.1.0'
export const TRACK_VERSION_1_2 = '1.2.0'
export const TRACK_VERSION_1_3 = '1.3.0'
export const TRACK_VERSION_1_4 = '1.4.0'
export const TRACK_VERSION_1_5 = '1.5.0'
export const TRACK_VERSION_1_6 = '1.6.0'
/** Newest write version — YouTube-bound media identity + metadata.summary. */
export const SUPPORTED_TRACK_VERSION = TRACK_VERSION_1_6
export const TRACK_VERSIONS = [
  LEGACY_TRACK_VERSION,
  TRACK_VERSION_1_1,
  TRACK_VERSION_1_2,
  TRACK_VERSION_1_3,
  TRACK_VERSION_1_4,
  TRACK_VERSION_1_5,
  TRACK_VERSION_1_6
] as const
export type TrackFileVersion = (typeof TRACK_VERSIONS)[number]

export const GROUP_COLOR_TOKENS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const
export type GroupColorToken = (typeof GROUP_COLOR_TOKENS)[number]

export interface PercentRect {
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
}

export type MaskPresentation =
  | 'solid'
  | 'dim'
  | 'softGlass'
  | 'softEdge'
  | 'lowContrast'
  | 'blur'
  | 'frosted'

export interface MaskStyle {
  mode: 'solid'
  color: string
  opacity: number
  presentation?: MaskPresentation
}

export type MaskSourceKind = 'manual' | 'srt'

export interface MaskSource {
  kind: MaskSourceKind
}

export interface TrackItemBase {
  id: string
  type: TrackItemType
  start: number
  end: number
  /** Omitted or true = enabled. false = excluded from playback and active lists. */
  enabled?: boolean
  label?: string
  notes?: string
  /** When true, item cannot be moved/resized/timing-edited until unlocked. */
  locked?: boolean
}

export interface MaskTrackItem extends TrackItemBase {
  type: 'mask'
  rect: PercentRect
  style: MaskStyle
  source?: MaskSource
  /** Cue-boundary fade-in duration (ms). 0 = instant. */
  fadeInMs?: number
  /** Cue-boundary fade-out duration (ms). 0 = instant. */
  fadeOutMs?: number
}

export interface MuteTrackItem extends TrackItemBase {
  type: 'mute'
}

export interface SkipTrackItem extends TrackItemBase {
  type: 'skip'
}

/** Point marker — informational only; never affects playback. */
export interface BookmarkTrackItem extends TrackItemBase {
  type: 'bookmark'
}

export type TrackItem = MaskTrackItem | MuteTrackItem | SkipTrackItem | BookmarkTrackItem

export type TrackAnchorKind = 'manual' | 'cue' | 'bookmark'

export interface TrackAnchor {
  id: string
  time: number
  label?: string
  kind?: TrackAnchorKind
}

export interface TrackGroup {
  id: string
  label: string
  itemIds: string[]
  colorToken?: GroupColorToken
}

export interface TrackMetadata {
  title?: string
  description?: string
  /** Community attribution — optional display name for shared tracks. */
  author?: string
  /** Community tags for future discovery (local-only until sharing exists). */
  tags?: string[]
  language?: string
  /** Private editor notes (distinct from whole-media Summary). */
  notes?: string
  /**
   * Whole-media untimestamped Summary (schema 1.6.0+).
   * Distinct from bookmark notes and from metadata.notes.
   */
  summary?: string
  createdAt?: string
  updatedAt?: string
  /** Reserved — community rating (not used in M1). */
  rating?: number | string
  /** Reserved — download counter (not used in M1). */
  downloads?: number
  /** Reserved — authenticity signature (not used in M1). */
  signature?: string
}

/** YouTube-bound media identity (schema 1.6.0). Authoritative key: provider + videoId. */
export interface YouTubeTrackMedia {
  kind: 'youtube'
  provider: 'youtube'
  videoId: string
  canonicalUrl: string
  duration?: number
  title?: string
}

export type TrackMedia = YouTubeTrackMedia

export interface VideoFingerprint {
  method: 'partial-sha256' | 'metadata-only' | 'metadata-v1' | 'manual-unbound'
  value: string
}

export type VideoBinding = 'metadata' | 'unbound'

export type SubtitleCoverMode = 'show' | 'smartCover' | 'regionCover'

export interface SubtitleCoverSettings {
  mode: SubtitleCoverMode
  regionRect?: PercentRect
}

export interface LocalTrackVideo {
  /** Omitted or metadata = bound to source video; unbound = manual timestamp-only track. */
  binding?: VideoBinding
  name: string
  duration: number
  fileSize: number | null
  resolution: {
    width: number
    height: number
  }
  fingerprint: VideoFingerprint
}

export interface VeilTrack {
  version: TrackFileVersion
  app: 'VEIL'
  appVersion?: string
  exportedAt?: string
  subtitleCover?: SubtitleCoverSettings
  /**
   * Local / legacy media binding. Required for schema ≤1.5.0 and local 1.6.0 writes.
   * Optional when `media.kind === 'youtube'` (YouTube-bound 1.6.0 files).
   */
  video?: LocalTrackVideo
  /** Remote media identity (YouTube). Present on YouTube-bound 1.6.0 files. */
  media?: TrackMedia
  globalOffsetSeconds: number
  trackMetadata?: TrackMetadata
  groups?: TrackGroup[]
  anchors?: TrackAnchor[]
  items: TrackItem[]
}

export const EMPTY_TRACK_METADATA: TrackMetadata = {}
