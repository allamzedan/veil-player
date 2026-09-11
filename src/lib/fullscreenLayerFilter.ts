export type FullscreenLayerFilter = 'active' | 'all'

export const FULLSCREEN_LAYER_SHOW_ALL_THRESHOLD = 20

const STORAGE_KEY = 'veil:session:fullscreenLayerFilter'

export function defaultFullscreenLayerFilter(totalLayers: number): FullscreenLayerFilter {
  return totalLayers <= FULLSCREEN_LAYER_SHOW_ALL_THRESHOLD ? 'all' : 'active'
}

export function readFullscreenLayerFilter(): FullscreenLayerFilter | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (value === 'active' || value === 'all') {
      return value
    }
  } catch {
    // sessionStorage unavailable
  }
  return null
}

export function writeFullscreenLayerFilter(filter: FullscreenLayerFilter): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, filter)
  } catch {
    // sessionStorage unavailable
  }
}

export function resolveFullscreenLayerFilter(totalLayers: number): FullscreenLayerFilter {
  return readFullscreenLayerFilter() ?? defaultFullscreenLayerFilter(totalLayers)
}
