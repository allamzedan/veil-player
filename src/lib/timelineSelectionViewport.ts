export interface TimelineSelection {
  start: number
  end?: number
}

export interface TimelineViewportRange {
  viewStart: number
  viewEnd: number
}

const LONG_RANGE_PADDING_RATIO = 0.2
const SHORT_RANGE_THRESHOLD_SECONDS = 10
const SHORT_RANGE_CONTEXT_SECONDS = 5
const MINIMUM_SELECTION_WINDOW_SECONDS = 10

function shiftedWindow(center: number, desiredSpan: number, duration: number): TimelineViewportRange {
  const visibleSpan = Math.min(Math.max(desiredSpan, 0.001), duration)
  const viewStart = Math.max(0, Math.min(center - visibleSpan / 2, duration - visibleSpan))
  return { viewStart, viewEnd: viewStart + visibleSpan }
}

export function timelineViewportForSelection(
  selection: TimelineSelection,
  duration: number,
  minimumVisibleSeconds = 1
): TimelineViewportRange | null {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(selection.start)) {
    return null
  }

  const start = Math.min(Math.max(selection.start, 0), duration)
  const end = Number.isFinite(selection.end)
    ? Math.min(Math.max(selection.end as number, 0), duration)
    : null
  const hasRange = end !== null && end > start

  if (!hasRange) {
    const durationAwareWindow = Math.min(30, Math.max(20, duration * 0.05))
    const desiredSpan = Math.max(
      Math.min(durationAwareWindow, duration),
      Math.min(MINIMUM_SELECTION_WINDOW_SECONDS, duration),
      minimumVisibleSeconds
    )
    return shiftedWindow(start, desiredSpan, duration)
  }

  const rawSpan = end - start
  const desiredSpan = rawSpan < SHORT_RANGE_THRESHOLD_SECONDS
    ? Math.max(rawSpan + SHORT_RANGE_CONTEXT_SECONDS * 2, MINIMUM_SELECTION_WINDOW_SECONDS)
    : rawSpan * (1 + LONG_RANGE_PADDING_RATIO * 2)
  return shiftedWindow((start + end) / 2, Math.max(desiredSpan, minimumVisibleSeconds), duration)
}
