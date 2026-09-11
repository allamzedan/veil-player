import type { MaskTrackItem } from '../types/track'

const MAX_FADE_MS = 5000

export function clampFadeMs(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(MAX_FADE_MS, Math.round(value)))
}

export function maskNeedsPlaybackOpacityAnimation(masks: ReadonlyArray<MaskTrackItem>): boolean {
  return masks.some((mask) => (mask.fadeInMs ?? 0) > 0 || (mask.fadeOutMs ?? 0) > 0)
}

export function computeMaskEffectiveOpacity(
  item: MaskTrackItem,
  adjustedTime: number
): number {
  const fadeInSec = clampFadeMs(item.fadeInMs) / 1000
  const fadeOutSec = clampFadeMs(item.fadeOutMs) / 1000
  const windowStart = item.start - fadeInSec
  const windowEnd = item.end + fadeOutSec

  if (adjustedTime < windowStart || adjustedTime > windowEnd) {
    return 0
  }

  if (adjustedTime < item.start) {
    if (fadeInSec <= 0) {
      return 1
    }
    return Math.max(0, Math.min(1, (adjustedTime - windowStart) / fadeInSec))
  }

  if (adjustedTime > item.end) {
    if (fadeOutSec <= 0) {
      return 0
    }
    return Math.max(0, Math.min(1, 1 - (adjustedTime - item.end) / fadeOutSec))
  }

  return 1
}

export interface MaskPlaybackRenderEntry {
  mask: MaskTrackItem
  effectiveOpacity: number
}

export function filterMasksForPlaybackRender(
  masks: ReadonlyArray<MaskTrackItem>,
  adjustedTime: number
): MaskPlaybackRenderEntry[] {
  const entries: MaskPlaybackRenderEntry[] = []

  for (const mask of masks) {
    if (mask.enabled === false) {
      continue
    }

    const effectiveOpacity = computeMaskEffectiveOpacity(mask, adjustedTime)
    if (effectiveOpacity <= 0) {
      continue
    }

    entries.push({ mask, effectiveOpacity })
  }

  return entries
}
