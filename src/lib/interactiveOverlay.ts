type OverlayListener = () => void

let openOverlayCount = 0
const listeners = new Set<OverlayListener>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function registerInteractiveOverlay(): () => void {
  openOverlayCount += 1
  emit()
  let registered = true
  return () => {
    if (!registered) return
    registered = false
    openOverlayCount = Math.max(0, openOverlayCount - 1)
    emit()
  }
}

export function isInteractiveOverlayOpen(): boolean {
  return openOverlayCount > 0
}

export function subscribeInteractiveOverlay(listener: OverlayListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetInteractiveOverlaysForTests(): void {
  openOverlayCount = 0
  emit()
}
