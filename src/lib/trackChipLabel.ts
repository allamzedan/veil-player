const MAX_TRACK_CHIP_NAME_LENGTH = 28

export function truncateTrackChipName(name: string, maxLength = MAX_TRACK_CHIP_NAME_LENGTH): string {
  if (name.length <= maxLength) {
    return name
  }
  return `${name.slice(0, maxLength - 1)}…`
}

function stripExtension(fileName: string): string {
  return fileName
    .replace(/\.veil\.json$/i, '')
    .replace(/\.json$/i, '')
    .replace(/\.[^.]+$/, '')
}

export interface ResolveTrackDisplayNameInput {
  trackMetadataTitle?: string
  /** Session loaded filename when available (future). */
  loadedTrackFileName?: string | null
  videoFileName?: string | null
  untitledLabel: string
}

export function resolveTrackDisplayName(input: ResolveTrackDisplayNameInput): string {
  const title = input.trackMetadataTitle?.trim()
  if (title) {
    return truncateTrackChipName(title)
  }

  const loadedName = input.loadedTrackFileName?.trim()
  if (loadedName) {
    const stem = stripExtension(loadedName)
    return truncateTrackChipName(stem || loadedName)
  }

  const videoName = input.videoFileName?.trim()
  if (videoName) {
    const base = stripExtension(videoName)
    return truncateTrackChipName(`${base}.veil`)
  }

  return input.untitledLabel
}

export interface TrackChipContentState {
  maskCount: number
  muteCount: number
  skipCount: number
  bookmarkCount?: number
  isTrackDirty: boolean
  trackFilePath?: string | null
  trackMetadataTitle?: string
}

/** True when the session has meaningful track content to show as "loaded". */
export function hasTrackChipContent(state: TrackChipContentState): boolean {
  const total =
    state.maskCount + state.muteCount + state.skipCount + (state.bookmarkCount ?? 0)
  if (total > 0) {
    return true
  }
  if (state.isTrackDirty) {
    return true
  }
  if (state.trackFilePath) {
    return true
  }
  if (state.trackMetadataTitle?.trim()) {
    return true
  }
  return false
}
