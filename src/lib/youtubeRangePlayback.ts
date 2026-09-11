import { reconcilePlayback } from './reconciler'
import { buildReconcileItems, PLAYBACK_EPSILON } from './trackItems'
import type { MuteTrackItem, SkipTrackItem } from '../types/track'

export interface YouTubeRangePlaybackInput {
  sourceKey: string
  loadGeneration: number
  ready: boolean
  currentTime: number
  duration: number
  playing: boolean
  userMuted: boolean
  volume: number
  globalOffsetSeconds: number
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
}

export interface YouTubeRangePlaybackResult {
  activeMutes: MuteTrackItem[]
  activeSkips: SkipTrackItem[]
  rangeMuted: boolean
  effectiveMuted: boolean
  skipTarget: number | null
}

function enabledSkipsByTime(skips: SkipTrackItem[]): SkipTrackItem[] {
  return skips
    .filter((skip) => skip.enabled !== false && Number.isFinite(skip.start) && Number.isFinite(skip.end))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id))
}

export function resolveChainedSkipEnd(
  activeSkips: SkipTrackItem[],
  allSkips: SkipTrackItem[]
): number | null {
  if (activeSkips.length === 0) return null

  let end = Math.max(...activeSkips.map((skip) => skip.end))
  const sorted = enabledSkipsByTime(allSkips)

  // At most one extension per stored range. This bounds malformed or cyclic input.
  for (let pass = 0; pass < sorted.length; pass += 1) {
    let extended = false
    for (const skip of sorted) {
      if (skip.start <= end + PLAYBACK_EPSILON && skip.end > end + PLAYBACK_EPSILON) {
        end = skip.end
        extended = true
      }
    }
    if (!extended) break
  }

  return end
}

export class YouTubeRangePlaybackGuard {
  private sourceKey = ''
  private loadGeneration = -1
  private skipLatch: { start: number; target: number } | null = null

  resetSkipLatch(): void {
    this.skipLatch = null
  }

  reset(): void {
    this.sourceKey = ''
    this.loadGeneration = -1
    this.skipLatch = null
  }

  reconcile(input: YouTubeRangePlaybackInput): YouTubeRangePlaybackResult {
    if (input.sourceKey !== this.sourceKey || input.loadGeneration !== this.loadGeneration) {
      this.sourceKey = input.sourceKey
      this.loadGeneration = input.loadGeneration
      this.skipLatch = null
    }

    if (!input.ready || !Number.isFinite(input.currentTime)) {
      return {
        activeMutes: [],
        activeSkips: [],
        rangeMuted: false,
        effectiveMuted: input.userMuted || input.volume === 0,
        skipTarget: null
      }
    }

    const { activeMutes, activeSkips } = reconcilePlayback(
      {
        items: buildReconcileItems([], input.mutes, input.skips),
        globalOffsetSeconds: input.globalOffsetSeconds
      },
      input.currentTime
    )
    const rangeMuted = activeMutes.length > 0
    const result: YouTubeRangePlaybackResult = {
      activeMutes,
      activeSkips,
      rangeMuted,
      effectiveMuted: input.userMuted || rangeMuted || input.volume === 0,
      skipTarget: null
    }

    const latch = this.skipLatch
    if (latch && (
      input.currentTime < latch.start - PLAYBACK_EPSILON ||
      input.currentTime > latch.target + PLAYBACK_EPSILON
    )) {
      this.skipLatch = null
    }

    if (!input.playing || activeSkips.length === 0 || this.skipLatch) return result

    const trackEnd = resolveChainedSkipEnd(activeSkips, input.skips)
    if (trackEnd === null) return result
    const mediaStart = Math.min(...activeSkips.map((skip) => skip.start)) - input.globalOffsetSeconds
    const unclampedTarget = trackEnd - input.globalOffsetSeconds
    const target = input.duration > 0
      ? Math.min(Math.max(unclampedTarget, 0), input.duration)
      : Math.max(unclampedTarget, 0)
    if (input.currentTime >= target - PLAYBACK_EPSILON) return result

    this.skipLatch = { start: mediaStart, target }
    result.skipTarget = target
    return result
  }
}
