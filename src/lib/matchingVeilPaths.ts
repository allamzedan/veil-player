import { basename, dirname, join } from 'node:path'

/** Candidate VEIL paths beside a video file (same directory, matching basename). */
export function buildMatchingVeilCandidates(videoFilePath: string): string[] {
  const dir = dirname(videoFilePath)
  const base = basename(videoFilePath)
  const stem = base.replace(/\.[^.\\/]+$/, '')

  const fileNames = [
    `${stem}.veil`,
    `${base}.veil`,
    `${stem}.veil.json`,
    `${base}.veil.json`,
    `${stem}.veil.veil`
  ]

  return [...new Set(fileNames)].map((name) => join(dir, name))
}

export function findExistingMatchingVeils(
  videoFilePath: string,
  exists: (filePath: string) => boolean
): string[] {
  if (videoFilePath.length === 0) {
    return []
  }

  return buildMatchingVeilCandidates(videoFilePath).filter((candidate) => {
    try {
      return exists(candidate)
    } catch {
      return false
    }
  })
}

export { isVeilTrackFilePath, isLegacyJsonTrackPath } from './matchingVeilFile'
