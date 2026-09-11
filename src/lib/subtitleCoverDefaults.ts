import type { PercentRect, SubtitleCoverMode } from '../types/track'

export type { SubtitleCoverMode }

export const DEFAULT_SUBTITLE_COVER_MODE: SubtitleCoverMode = 'show'

export const DEFAULT_REGION_COVER_RECT: PercentRect = {
  xPercent: 10,
  yPercent: 78,
  widthPercent: 80,
  heightPercent: 18
}

export function shouldRenderSubtitleTextLayer(
  showSubtitleText: boolean,
  mode: SubtitleCoverMode,
  cueCount: number
): boolean {
  return showSubtitleText && cueCount > 0 && (mode === 'show' || mode === 'smartCover')
}

export function isRegionCoverMode(mode: SubtitleCoverMode): boolean {
  return mode === 'regionCover'
}
