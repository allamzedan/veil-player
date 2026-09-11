import type { PercentRect } from '../types/track'

export const MIN_MASK_SIZE = {
  widthPercent: 1,
  heightPercent: 1
} as const

export interface PercentDelta {
  dxPercent: number
  dyPercent: number
}

export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function clientDeltaToPercent(
  deltaClientX: number,
  deltaClientY: number,
  containerRect: Pick<DOMRect, 'width' | 'height'>
): PercentDelta {
  const width = containerRect.width > 0 ? containerRect.width : 1
  const height = containerRect.height > 0 ? containerRect.height : 1

  return {
    dxPercent: (deltaClientX / width) * 100,
    dyPercent: (deltaClientY / height) * 100
  }
}

export function clampPercentRect(
  rect: PercentRect,
  minSize: { widthPercent: number; heightPercent: number } = MIN_MASK_SIZE
): PercentRect {
  let widthPercent = Math.max(minSize.widthPercent, rect.widthPercent)
  let heightPercent = Math.max(minSize.heightPercent, rect.heightPercent)
  let xPercent = Math.max(0, Math.min(rect.xPercent, 100 - widthPercent))
  let yPercent = Math.max(0, Math.min(rect.yPercent, 100 - heightPercent))

  widthPercent = Math.min(widthPercent, 100 - xPercent)
  heightPercent = Math.min(heightPercent, 100 - yPercent)

  return { xPercent, yPercent, widthPercent, heightPercent }
}

export function moveRect(rect: PercentRect, delta: PercentDelta): PercentRect {
  return clampPercentRect({
    xPercent: rect.xPercent + delta.dxPercent,
    yPercent: rect.yPercent + delta.dyPercent,
    widthPercent: rect.widthPercent,
    heightPercent: rect.heightPercent
  })
}

export function resizeRectFromCorner(
  rect: PercentRect,
  corner: ResizeCorner,
  delta: PercentDelta
): PercentRect {
  switch (corner) {
    case 'bottom-right':
      return clampPercentRect({
        xPercent: rect.xPercent,
        yPercent: rect.yPercent,
        widthPercent: rect.widthPercent + delta.dxPercent,
        heightPercent: rect.heightPercent + delta.dyPercent
      })
    case 'top-left':
      return clampPercentRect({
        xPercent: rect.xPercent + delta.dxPercent,
        yPercent: rect.yPercent + delta.dyPercent,
        widthPercent: rect.widthPercent - delta.dxPercent,
        heightPercent: rect.heightPercent - delta.dyPercent
      })
    case 'top-right':
      return clampPercentRect({
        xPercent: rect.xPercent,
        yPercent: rect.yPercent + delta.dyPercent,
        widthPercent: rect.widthPercent + delta.dxPercent,
        heightPercent: rect.heightPercent - delta.dyPercent
      })
    case 'bottom-left':
      return clampPercentRect({
        xPercent: rect.xPercent + delta.dxPercent,
        yPercent: rect.yPercent,
        widthPercent: rect.widthPercent - delta.dxPercent,
        heightPercent: rect.heightPercent + delta.dyPercent
      })
  }
}
