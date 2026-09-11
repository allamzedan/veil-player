export const MENU_VIEWPORT_MARGIN = 10
export const MENU_SUBMENU_GAP = 4

export interface MenuRect {
  top: number
  left: number
  right: number
}

export interface MenuViewportLayout {
  maxHeight: number
  scroll: boolean
}

export interface SubmenuViewportLayout extends MenuViewportLayout {
  top: number
  left: number
  side: 'left' | 'right'
}

export function resolveMenuViewportLayout(
  menuTop: number,
  contentHeight: number,
  viewportHeight: number,
  margin = MENU_VIEWPORT_MARGIN
): MenuViewportLayout {
  const maxHeight = Math.max(0, Math.floor(viewportHeight - menuTop - margin))
  return { maxHeight, scroll: contentHeight > maxHeight }
}

export function resolveSubmenuViewportLayout(
  parentRect: MenuRect,
  submenuWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = MENU_VIEWPORT_MARGIN,
  gap = MENU_SUBMENU_GAP
): SubmenuViewportLayout {
  const maxHeight = Math.max(0, Math.floor(viewportHeight - (margin * 2)))
  const renderedHeight = Math.min(contentHeight, maxHeight)
  const fitsRight = parentRect.right + gap + submenuWidth <= viewportWidth - margin
  const preferredLeft = fitsRight
    ? parentRect.right + gap
    : parentRect.left - gap - submenuWidth
  const left = Math.min(
    Math.max(preferredLeft, margin),
    Math.max(margin, viewportWidth - margin - submenuWidth)
  )
  const top = Math.min(
    Math.max(parentRect.top, margin),
    Math.max(margin, viewportHeight - margin - renderedHeight)
  )

  return {
    top: Math.floor(top),
    left: Math.floor(left),
    side: fitsRight ? 'right' : 'left',
    maxHeight,
    scroll: contentHeight > maxHeight
  }
}

export type SubmenuTriggerKeyAction = 'open-first' | 'open' | null

export function submenuTriggerKeyAction(key: string): SubmenuTriggerKeyAction {
  if (key === 'ArrowRight') return 'open-first'
  if (key === 'Enter' || key === ' ') return 'open'
  return null
}

export type SubmenuKeyAction = 'next' | 'previous' | 'return' | 'close' | null

export function submenuKeyAction(key: string): SubmenuKeyAction {
  if (key === 'ArrowDown') return 'next'
  if (key === 'ArrowUp') return 'previous'
  if (key === 'ArrowLeft') return 'return'
  if (key === 'Escape') return 'close'
  return null
}

export function wrappedMenuIndex(currentIndex: number, itemCount: number, direction: 1 | -1): number {
  if (itemCount <= 0) return -1
  if (currentIndex < 0) return direction === 1 ? 0 : itemCount - 1
  return (currentIndex + direction + itemCount) % itemCount
}
