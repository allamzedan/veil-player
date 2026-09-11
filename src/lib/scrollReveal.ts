export interface VerticalBounds {
  top: number
  bottom: number
}

export function nearestVerticalScrollDelta(
  viewport: VerticalBounds,
  item: VerticalBounds
): number {
  if (item.top < viewport.top) return item.top - viewport.top
  if (item.bottom > viewport.bottom) return item.bottom - viewport.bottom
  return 0
}

export function revealElementInScrollableViewport(
  viewport: HTMLElement,
  item: HTMLElement
): boolean {
  const delta = nearestVerticalScrollDelta(
    viewport.getBoundingClientRect(),
    item.getBoundingClientRect()
  )
  if (delta === 0) return false
  viewport.scrollTop += delta
  return true
}

export function revealElementInNearestScrollableAncestor(item: HTMLElement): boolean {
  let ancestor = item.parentElement
  while (ancestor) {
    const overflowY = window.getComputedStyle(ancestor).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && ancestor.scrollHeight > ancestor.clientHeight) {
      return revealElementInScrollableViewport(ancestor, item)
    }
    ancestor = ancestor.parentElement
  }
  return false
}
