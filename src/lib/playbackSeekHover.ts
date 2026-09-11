import { SEEKBAR_THUMB_CENTER_INSET_PX } from './bookmarkMarkerGeometry'

export interface SeekTrackRect {
  left: number
  width: number
}

export interface PlaybackSeekHover {
  pointerX: number
  time: number
  trackWidth: number
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

export const playbackTimeFromSeekPointer = (
  clientX: number,
  rect: SeekTrackRect,
  duration: number,
  thumbCenterInset = SEEKBAR_THUMB_CENTER_INSET_PX
): number | null => {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(rect.left) ||
    !Number.isFinite(rect.width) ||
    rect.width <= 0 ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null
  }

  const inset = clamp(thumbCenterInset, 0, rect.width / 2)
  const usableWidth = rect.width - inset * 2
  if (usableWidth <= 0) return null

  const pointerX = clamp(clientX - rect.left, inset, rect.width - inset)
  return ((pointerX - inset) / usableWidth) * duration
}

export const playbackSeekHoverFromPointer = (
  clientX: number,
  rect: SeekTrackRect,
  duration: number
): PlaybackSeekHover | null => {
  const time = playbackTimeFromSeekPointer(clientX, rect, duration)
  if (time === null) return null

  return {
    pointerX: clientX - rect.left,
    time,
    trackWidth: rect.width
  }
}

export const clampSeekTooltipX = (
  pointerX: number,
  trackWidth: number,
  tooltipWidth: number
): number => {
  if (!Number.isFinite(trackWidth) || trackWidth <= 0) return 0

  const safePointerX = Number.isFinite(pointerX) ? pointerX : 0
  const safeTooltipWidth = Number.isFinite(tooltipWidth) ? Math.max(0, tooltipWidth) : 0
  const halfWidth = Math.min(safeTooltipWidth / 2, trackWidth / 2)
  return clamp(safePointerX, halfWidth, trackWidth - halfWidth)
}
