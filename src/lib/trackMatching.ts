import { DURATION_MISMATCH_TOLERANCE_SECONDS, type FingerprintMismatch } from './fingerprint'
import { normalizeDurationSeconds } from './fingerprint'
import type { TrackAnchor } from '../types/track'
import type { SrtCue } from './srtParser'

export type MismatchTier = 'hard' | 'soft' | 'info'

export interface ClassifiedMismatches {
  hard: FingerprintMismatch[]
  soft: FingerprintMismatch[]
  info: FingerprintMismatch[]
}

const HARD_DURATION_ABS_SECONDS = 30
const HARD_DURATION_RATIO = 0.05

export function classifyMismatches(mismatches: FingerprintMismatch[]): ClassifiedMismatches {
  const result: ClassifiedMismatches = { hard: [], soft: [], info: [] }

  for (const mismatch of mismatches) {
    if (mismatch.field === 'duration') {
      const durationHard = isHardDurationMismatch(mismatch.message)
      if (durationHard) {
        result.hard.push(mismatch)
      } else {
        result.soft.push(mismatch)
      }
      continue
    }

    if (mismatch.field === 'binding' || mismatch.field === 'resolution') {
      result.info.push(mismatch)
      continue
    }

    if (mismatch.field === 'name' || mismatch.field === 'fileSize' || mismatch.field === 'fingerprint') {
      result.soft.push(mismatch)
      continue
    }

    result.soft.push(mismatch)
  }

  return result
}

function isHardDurationMismatch(message: string): boolean {
  const match = message.match(/track: ([\d.]+)s, current: ([\d.]+)s/)
  if (!match) {
    return false
  }
  const trackDuration = Number(match[1])
  const currentDuration = Number(match[2])
  if (!Number.isFinite(trackDuration) || !Number.isFinite(currentDuration)) {
    return false
  }
  const delta = Math.abs(trackDuration - currentDuration)
  const ratio = trackDuration > 0 ? delta / trackDuration : delta
  return delta > HARD_DURATION_ABS_SECONDS && ratio > HARD_DURATION_RATIO
}

export function formatMismatchLine(mismatch: FingerprintMismatch): string {
  return mismatch.message
}

const ANCHOR_MATCH_TOLERANCE_SECONDS = 2

export function buildCandidateAnchorsFromCues(cues: SrtCue[]): TrackAnchor[] {
  return cues.map((cue, index) => ({
    id: `cue-${index}`,
    time: cue.start,
    kind: 'cue' as const
  }))
}

export function suggestOffsetFromAnchors(
  trackAnchors: TrackAnchor[],
  candidateAnchors: TrackAnchor[],
  _duration: number
): number | null {
  if (trackAnchors.length < 2 || candidateAnchors.length < 2) {
    return null
  }

  const deltas: number[] = []
  const pairCount = Math.min(trackAnchors.length, candidateAnchors.length)

  for (let index = 0; index < pairCount; index += 1) {
    const trackAnchor = trackAnchors[index]
    const candidate = candidateAnchors[index]
    if (!trackAnchor || !candidate) {
      continue
    }
    const delta = candidate.time - trackAnchor.time
    if (Math.abs(delta) < 3600) {
      deltas.push(delta)
    }
  }

  if (deltas.length < 2) {
    return null
  }

  const sorted = [...deltas].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? null
  if (median === null || !Number.isFinite(median)) {
    return null
  }

  const consistent = deltas.filter(
    (delta) => Math.abs(delta - median) <= ANCHOR_MATCH_TOLERANCE_SECONDS
  )
  if (consistent.length < 2) {
    return null
  }

  return Math.round(median * 1000) / 1000
}

export function formatOffsetSuggestion(offsetSeconds: number): string {
  const sign = offsetSeconds >= 0 ? '+' : ''
  return `Suggested global offset: ${sign}${offsetSeconds.toFixed(3)}s`
}

export function durationsCompatible(trackDuration: number, currentDuration: number): boolean {
  return (
    Math.abs(normalizeDurationSeconds(trackDuration) - normalizeDurationSeconds(currentDuration)) <=
    DURATION_MISMATCH_TOLERANCE_SECONDS
  )
}
