export const SUBTITLE_RENDERED_MIN_PX = 14
export const SUBTITLE_RENDERED_MAX_PX = 44

export function responsiveSubtitleFontSize(input: {
  viewportWidth: number
  viewportHeight: number
  configuredScale: number
}): number {
  const width = Number.isFinite(input.viewportWidth) ? Math.max(0, input.viewportWidth) : 0
  const height = Number.isFinite(input.viewportHeight) ? Math.max(0, input.viewportHeight) : 0
  const configuredScale = Number.isFinite(input.configuredScale)
    ? Math.max(0.8, Math.min(1.4, input.configuredScale))
    : 1

  if (width <= 0 || height <= 0) return 24 * configuredScale

  const widthResponsiveBase = Math.max(16, Math.min(32, width * 0.028))
  const configuredSize = widthResponsiveBase * configuredScale
  const smallViewportHeightCap = Math.max(SUBTITLE_RENDERED_MIN_PX, height * 0.085)
  return Math.max(
    SUBTITLE_RENDERED_MIN_PX,
    Math.min(SUBTITLE_RENDERED_MAX_PX, smallViewportHeightCap, configuredSize)
  )
}
