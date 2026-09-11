import { playbackRatio } from '../playback/authoritativeTime'

export const SEEKBAR_THUMB_CENTER_INSET_PX = 8
export const TIMELINE_MARKER_CENTER_INSET_PX = 9

export interface UsableTrackGeometry {
  containerLeft: number
  containerWidth: number
  gutterWidth?: number
  paddingLeft?: number
  paddingRight?: number
  anchorInset?: number
  scrollLeft?: number
}

export function renderedTimeCenterX(
  time: number,
  duration: number,
  geometry: UsableTrackGeometry
): number | null {
  const normalized = playbackRatio(time, duration)
  if (normalized === null) return null

  const gutterWidth = Math.max(0, geometry.gutterWidth ?? 0)
  const paddingLeft = Math.max(0, geometry.paddingLeft ?? 0)
  const paddingRight = Math.max(0, geometry.paddingRight ?? 0)
  const anchorInset = Math.max(0, geometry.anchorInset ?? 0)
  const scrollLeft = geometry.scrollLeft ?? 0
  const usableLeft = geometry.containerLeft + paddingLeft + gutterWidth + anchorInset
  const usableWidth = Math.max(
    0,
    geometry.containerWidth - paddingLeft - paddingRight - gutterWidth - anchorInset * 2
  )

  return usableLeft + normalized * usableWidth - scrollLeft
}
