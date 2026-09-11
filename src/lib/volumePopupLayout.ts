/** Compact vertical volume popup metrics (Audio Watch dock). */
export const VERTICAL_VOLUME_POPUP = {
  widthPx: 48,
  heightPx: 150,
  minWidthPx: 44,
  maxWidthPx: 56,
  minHeightPx: 130,
  maxHeightPx: 170,
  gapPx: 8,
  sliderTrackPx: 118,
  sliderThicknessPx: 6
} as const

export type VolumePopupPlacement = 'above' | 'below'

export interface VolumePopupPosition {
  top: number
  left: number
  placement: VolumePopupPlacement
}

/**
 * Anchor a compact vertical popup to a volume button without leaving the viewport.
 * Prefers above; flips below when there is not enough space.
 */
export function resolveVerticalVolumePopupPlacement(args: {
  buttonRect: { top: number; bottom: number; left: number; width: number; height: number }
  viewport: { width: number; height: number }
  popup?: { width: number; height: number }
  gap?: number
}): VolumePopupPosition {
  const popupWidth = args.popup?.width ?? VERTICAL_VOLUME_POPUP.widthPx
  const popupHeight = args.popup?.height ?? VERTICAL_VOLUME_POPUP.heightPx
  const gap = args.gap ?? VERTICAL_VOLUME_POPUP.gapPx
  const { buttonRect, viewport } = args

  const spaceAbove = buttonRect.top - gap
  const spaceBelow = viewport.height - buttonRect.bottom - gap
  const placement: VolumePopupPlacement =
    spaceAbove >= popupHeight || spaceAbove >= spaceBelow ? 'above' : 'below'

  let top =
    placement === 'above'
      ? buttonRect.top - gap - popupHeight
      : buttonRect.bottom + gap

  top = Math.min(Math.max(gap, top), Math.max(gap, viewport.height - popupHeight - gap))

  let left = buttonRect.left + buttonRect.width / 2 - popupWidth / 2
  left = Math.min(Math.max(gap, left), Math.max(gap, viewport.width - popupWidth - gap))

  return { top, left, placement }
}

export function isCompactVerticalVolumePopup(size: { width: number; height: number }): boolean {
  return (
    size.width >= VERTICAL_VOLUME_POPUP.minWidthPx &&
    size.width <= VERTICAL_VOLUME_POPUP.maxWidthPx &&
    size.height >= VERTICAL_VOLUME_POPUP.minHeightPx &&
    size.height <= VERTICAL_VOLUME_POPUP.maxHeightPx
  )
}
