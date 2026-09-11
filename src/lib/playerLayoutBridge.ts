let ensureSidebarVisible: (() => void) | null = null

export function registerEnsureSidebarVisible(fn: () => void): () => void {
  ensureSidebarVisible = fn
  return () => {
    if (ensureSidebarVisible === fn) {
      ensureSidebarVisible = null
    }
  }
}

export function showSidebarIfHidden(): void {
  ensureSidebarVisible?.()
}
