export interface TimelineCenterScrollInput {
  playheadTime: number
  duration: number
  viewportWidth: number
  virtualTrackWidth: number
  usableInsetStart: number
  usableInsetEnd: number
}

export function timelineScrollLeftForPlayhead({
  playheadTime,
  duration,
  viewportWidth,
  virtualTrackWidth,
  usableInsetStart,
  usableInsetEnd
}: TimelineCenterScrollInput): number {
  if (
    !Number.isFinite(duration) || duration <= 0 ||
    !Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
    !Number.isFinite(virtualTrackWidth) || virtualTrackWidth <= 0
  ) return 0

  const maxScroll = Math.max(0, virtualTrackWidth - viewportWidth)
  if (maxScroll === 0) return 0
  const insetStart = Math.max(0, usableInsetStart)
  const insetEnd = Math.max(0, usableInsetEnd)
  const usableWidth = Math.max(1, virtualTrackWidth - insetStart - insetEnd)
  const clampedTime = Math.min(Math.max(playheadTime, 0), duration)
  const logicalX = insetStart + (clampedTime / duration) * usableWidth
  return Math.min(Math.max(logicalX - viewportWidth / 2, 0), maxScroll)
}
