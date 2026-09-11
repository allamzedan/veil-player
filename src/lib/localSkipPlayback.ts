import { PLAYBACK_EPSILON } from './trackItems'
import type { SkipTrackItem } from '../types/track'

export interface LocalSkipDecisionInput {
  currentTime: number
  duration: number
  globalOffsetSeconds: number
  activeSkips: SkipTrackItem[]
  allSkips: SkipTrackItem[]
}

export function localSkipHostTarget(input: LocalSkipDecisionInput): number | null {
  if (input.activeSkips.length === 0) return null
  const veilStart = Math.min(...input.activeSkips.map((skip) => skip.start))
  let veilEnd = Math.max(...input.activeSkips.map((skip) => skip.end))
  const enabled = input.allSkips
    .filter((skip) => skip.enabled !== false)
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id))
  for (let pass = 0; pass < enabled.length; pass += 1) {
    let extended = false
    for (const skip of enabled) {
      if (skip.start <= veilEnd + PLAYBACK_EPSILON && skip.end > veilEnd + PLAYBACK_EPSILON) {
        veilEnd = skip.end
        extended = true
      }
    }
    if (!extended) break
  }
  const hostStart = veilStart - input.globalOffsetSeconds
  const effectiveTime = input.currentTime + input.globalOffsetSeconds
  if (input.currentTime < hostStart - PLAYBACK_EPSILON) return null
  if (effectiveTime >= veilEnd - PLAYBACK_EPSILON) return null

  const veilTarget = Number.isFinite(input.duration)
    ? Math.min(veilEnd, input.duration + input.globalOffsetSeconds)
    : veilEnd
  const hostTarget = Math.max(veilTarget - input.globalOffsetSeconds, 0)
  return input.currentTime >= hostTarget - PLAYBACK_EPSILON ? null : hostTarget
}
