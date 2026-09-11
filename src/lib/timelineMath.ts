import type { SrtCue } from './srtParser'
import { enforceMaskTiming } from './maskTiming'

export const SNAP_THRESHOLD_SECONDS = 0.2

export interface TimelineViewport {
  viewStart: number
  viewEnd: number
}

export function getVisibleDuration(viewport: TimelineViewport): number {
  return Math.max(viewport.viewEnd - viewport.viewStart, 0.001)
}

export function timeToXPercent(time: number, viewStart: number, viewEnd: number): number {
  const range = viewEnd - viewStart

  if (!Number.isFinite(time) || !Number.isFinite(range) || range <= 0) {
    return 0
  }

  return ((time - viewStart) / range) * 100
}

export function isTimeInViewport(time: number, viewStart: number, viewEnd: number): boolean {
  const x = timeToXPercent(time, viewStart, viewEnd)
  return x >= 0 && x <= 100
}

export function clampPlayheadXPercent(time: number, viewStart: number, viewEnd: number): number {
  return Math.min(100, Math.max(0, timeToXPercent(time, viewStart, viewEnd)))
}

export function xPercentToTime(xPercent: number, viewStart: number, viewEnd: number): number {
  const span = Math.max(viewEnd - viewStart, 0.001)
  return viewStart + (xPercent / 100) * span
}

export function clientXToTimelineTime(
  clientX: number,
  rect: DOMRect,
  viewStart: number,
  viewEnd: number
): number {
  const xPercent = rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 0
  return xPercentToTime(xPercent, viewStart, viewEnd)
}

export interface TimelinePointerGeometry {
  clientX: number
  trackLeft: number
  visibleTrackWidth: number
  scrollLeft: number
  virtualTrackWidth: number
  duration: number
  usableInsetStart: number
  usableInsetEnd: number
}

/** Maps a pointer into the same full-duration logical track used by rendered items. */
export function timelineTimeFromPointer({
  clientX,
  trackLeft,
  visibleTrackWidth,
  scrollLeft,
  virtualTrackWidth,
  duration,
  usableInsetStart,
  usableInsetEnd
}: TimelinePointerGeometry): number {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(trackLeft) ||
    !Number.isFinite(visibleTrackWidth) ||
    visibleTrackWidth <= 0 ||
    !Number.isFinite(scrollLeft) ||
    !Number.isFinite(virtualTrackWidth) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 0
  }

  const insetStart = Math.max(0, Number.isFinite(usableInsetStart) ? usableInsetStart : 0)
  const insetEnd = Math.max(0, Number.isFinite(usableInsetEnd) ? usableInsetEnd : 0)
  const usableWidth = virtualTrackWidth - insetStart - insetEnd
  if (usableWidth <= 0) return 0

  const logicalX = clientX - trackLeft + scrollLeft - insetStart
  return clampTimelineTime((logicalX / usableWidth) * duration, duration)
}

export function clampTimelineHoverX(
  localX: number,
  visibleWidth: number,
  edgePadding = 28
): number {
  if (!Number.isFinite(localX) || !Number.isFinite(visibleWidth) || visibleWidth <= 0) return 0
  const safePadding = Math.min(Math.max(edgePadding, 0), visibleWidth / 2)
  return Math.min(Math.max(localX, safePadding), visibleWidth - safePadding)
}

export function clampTimelineTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) {
    return 0
  }
  const maxTime = Number.isFinite(duration) && duration > 0 ? duration : 0
  return Math.min(Math.max(time, 0), maxTime)
}

export function shiftInterval(
  start: number,
  end: number,
  delta: number,
  duration: number
): { start: number; end: number } {
  const itemDuration = end - start
  let nextStart = start + delta
  nextStart = Math.max(0, nextStart)
  let nextEnd = nextStart + itemDuration
  if (duration > 0 && nextEnd > duration) {
    nextEnd = duration
    nextStart = Math.max(0, nextEnd - itemDuration)
  }
  return enforceMaskTiming(nextStart, nextEnd)
}

export function resizeIntervalLeft(
  _start: number,
  end: number,
  nextStart: number
): { start: number; end: number } {
  return enforceMaskTiming(nextStart, end)
}

export function resizeIntervalRight(
  start: number,
  _end: number,
  nextEnd: number
): { start: number; end: number } {
  return enforceMaskTiming(start, nextEnd)
}

export function moveIntervalToStart(
  start: number,
  end: number,
  nextStart: number,
  duration: number
): { start: number; end: number } {
  return shiftInterval(start, end, nextStart - start, duration)
}

const RULER_TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600] as const

export function pickRulerTickStep(visibleDuration: number): number {
  if (!Number.isFinite(visibleDuration) || visibleDuration <= 0) {
    return 10
  }

  const targetTickCount = 8
  const rough = visibleDuration / targetTickCount

  for (const step of RULER_TICK_STEPS) {
    if (step >= rough) {
      return step
    }
  }

  return RULER_TICK_STEPS[RULER_TICK_STEPS.length - 1]
}

export function zoomViewportAtTime(
  viewStart: number,
  viewEnd: number,
  duration: number,
  anchorTime: number,
  anchorRatio: number,
  zoomFactor: number,
  minRangeSeconds = 1
): { viewStart: number; viewEnd: number } {
  const currentRange = viewEnd - viewStart

  if (
    !Number.isFinite(currentRange) ||
    currentRange <= 0 ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return {
      viewStart: 0,
      viewEnd: Math.max(1, duration)
    }
  }

  const nextRange = Math.min(
    duration,
    Math.max(minRangeSeconds, currentRange * zoomFactor)
  )

  const safeAnchorRatio = Math.min(1, Math.max(0, anchorRatio))

  let nextStart = anchorTime - nextRange * safeAnchorRatio
  let nextEnd = nextStart + nextRange

  if (nextStart < 0) {
    nextStart = 0
    nextEnd = nextRange
  }

  if (nextEnd > duration) {
    nextEnd = duration
    nextStart = Math.max(0, duration - nextRange)
  }

  return { viewStart: nextStart, viewEnd: nextEnd }
}

export function shiftViewport(
  viewStart: number,
  viewEnd: number,
  duration: number,
  deltaSeconds: number,
  minRangeSeconds = 1
): { viewStart: number; viewEnd: number } {
  const visible = Math.max(viewEnd - viewStart, minRangeSeconds)
  let nextStart = viewStart + deltaSeconds

  if (nextStart < 0) {
    nextStart = 0
  }

  if (duration > 0 && nextStart + visible > duration) {
    nextStart = Math.max(0, duration - visible)
  }

  return { viewStart: nextStart, viewEnd: nextStart + visible }
}

export function snapTimeToNearestCue(
  time: number,
  cues: SrtCue[],
  globalOffsetSeconds: number,
  thresholdSeconds: number
): number {
  if (cues.length === 0 || thresholdSeconds <= 0) {
    return time
  }

  const trackTime = time - globalOffsetSeconds
  let snapped = time
  let bestDistance = thresholdSeconds

  for (const cue of cues) {
    for (const boundary of [cue.start, cue.end]) {
      const distance = Math.abs(trackTime - boundary)
      if (distance < bestDistance) {
        bestDistance = distance
        snapped = boundary + globalOffsetSeconds
      }
    }
  }

  return snapped
}
