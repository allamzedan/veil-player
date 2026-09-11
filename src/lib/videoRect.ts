import type { CSSProperties } from 'react'

/** Rendered video content box in viewport (client) coordinates. */
export interface RenderedVideoRect {
  left: number
  top: number
  width: number
  height: number
}

/** Video content box positioned relative to a stage element. */
export interface VideoContentLayout {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Computes the object-fit: contain content rectangle inside a video element's layout box.
 * Returns null when intrinsic dimensions are not available yet.
 */
export function getRenderedVideoRect(video: HTMLVideoElement): RenderedVideoRect | null {
  const intrinsicWidth = video.videoWidth
  const intrinsicHeight = video.videoHeight

  if (!intrinsicWidth || !intrinsicHeight) {
    return null
  }

  const elementRect = video.getBoundingClientRect()
  if (elementRect.width <= 0 || elementRect.height <= 0) {
    return null
  }

  const elementAspect = elementRect.width / elementRect.height
  const videoAspect = intrinsicWidth / intrinsicHeight

  let contentWidth: number
  let contentHeight: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > elementAspect) {
    contentWidth = elementRect.width
    contentHeight = elementRect.width / videoAspect
    offsetX = 0
    offsetY = (elementRect.height - contentHeight) / 2
  } else {
    contentHeight = elementRect.height
    contentWidth = elementRect.height * videoAspect
    offsetX = (elementRect.width - contentWidth) / 2
    offsetY = 0
  }

  return {
    left: elementRect.left + offsetX,
    top: elementRect.top + offsetY,
    width: contentWidth,
    height: contentHeight
  }
}

export function getRenderedVideoRectInStage(
  video: HTMLVideoElement,
  stage: HTMLElement
): VideoContentLayout | null {
  const content = getRenderedVideoRect(video)
  if (!content) {
    return null
  }

  const stageRect = stage.getBoundingClientRect()
  const stageClientLeft = stageRect.left + stage.clientLeft
  const stageClientTop = stageRect.top + stage.clientTop

  return {
    left: content.left - stageClientLeft,
    top: content.top - stageClientTop,
    width: content.width,
    height: content.height
  }
}

export function videoContentLayoutToClientRect(
  layout: VideoContentLayout,
  stage: HTMLElement
): DOMRect {
  const stageRect = stage.getBoundingClientRect()
  return new DOMRect(
    stageRect.left + stage.clientLeft + layout.left,
    stageRect.top + stage.clientTop + layout.top,
    layout.width,
    layout.height
  )
}

export function videoContentLayoutStyle(
  layout: VideoContentLayout | null
): CSSProperties {
  if (!layout || layout.width <= 0 || layout.height <= 0) {
    return {
      visibility: 'hidden',
      pointerEvents: 'none'
    }
  }

  return {
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: layout.height
  }
}

/** Letterbox/pillarbox a target aspect ratio inside a container (stage-local coordinates). */
export function computeAspectFitContentLayout(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number
): VideoContentLayout | null {
  if (containerWidth <= 0 || containerHeight <= 0 || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return null
  }

  const containerAspect = containerWidth / containerHeight

  let width: number
  let height: number
  let left: number
  let top: number

  if (aspectRatio > containerAspect) {
    width = containerWidth
    height = containerWidth / aspectRatio
    left = 0
    top = (containerHeight - height) / 2
  } else {
    height = containerHeight
    width = containerHeight * aspectRatio
    left = (containerWidth - width) / 2
    top = 0
  }

  return { left, top, width, height }
}

export function getStageFillContentLayout(stage: HTMLElement): VideoContentLayout | null {
  const rect = stage.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  return (
    computeAspectFitContentLayout(rect.width, rect.height, 16 / 9) ?? {
      left: 0,
      top: 0,
      width: rect.width,
      height: rect.height
    }
  )
}
