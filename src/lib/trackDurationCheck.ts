import { useVeilStore } from '../state/useVeilStore'
import { pushWarningToast } from '../state/useToastStore'
import type { MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'

const DEBOUNCE_MS = 300

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function findTimingBeyondDuration(
  state: {
    masks: MaskTrackItem[]
    mutes: MuteTrackItem[]
    skips: SkipTrackItem[]
  },
  duration: number
): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0
  }

  let count = 0
  for (const item of [...state.masks, ...state.mutes, ...state.skips]) {
    if (item.end > duration) {
      count += 1
    }
  }
  return count
}

export function debouncedWarnDurationOverflow(
  warn: (count: number, duration: number) => void,
  count: number,
  duration: number
): void {
  if (count <= 0) {
    return
  }

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    warn(count, duration)
  }, DEBOUNCE_MS)
}

export function warnDurationOverflowFromStore(): void {
  const state = useVeilStore.getState()
  const duration = state.videoMetadata?.duration

  if (duration === undefined || duration === null || !Number.isFinite(duration) || duration <= 0) {
    return
  }

  const count = findTimingBeyondDuration(state, duration)
  debouncedWarnDurationOverflow((beyondCount, videoDuration) => {
    pushWarningToast(
      `${beyondCount} interval(s) extend beyond video duration (${videoDuration.toFixed(1)}s). Timings were not changed.`
    )
  }, count, duration)
}
