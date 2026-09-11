import type { TrackVideoSnapshot } from './fingerprint'

export interface LocatedMediaCandidate {
  canceled: boolean
  mediaUrl: string | null
  name: string | null
  size: number | null
  filePath?: string | null
}

export function isValidLocatedTrackMedia(
  expected: TrackVideoSnapshot,
  candidate: LocatedMediaCandidate
): boolean {
  if (
    candidate.canceled ||
    !candidate.mediaUrl ||
    !candidate.name ||
    !candidate.filePath
  ) {
    return false
  }

  if (expected.fileSize !== null) {
    return candidate.size === expected.fileSize
  }

  return candidate.name.toLocaleLowerCase() === expected.name.toLocaleLowerCase()
}

export function activateVerifiedLocatedTrackMedia(
  expected: TrackVideoSnapshot,
  candidate: LocatedMediaCandidate,
  activate: (candidate: LocatedMediaCandidate) => void
): boolean {
  if (!isValidLocatedTrackMedia(expected, candidate)) return false
  activate(candidate)
  return true
}
