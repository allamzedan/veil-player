import { useVeilStore } from '../state/useVeilStore'
import type { MediaKind } from './mediaKind'

interface LocalSourceReplacement {
  src: string
  fileName: string
  sourceKind: 'blob' | 'protocol'
  fileSizeBytes?: number | null
  filePath?: string | null
  mediaKind?: MediaKind | null
}

export function replaceWithCleanLocalSource(source: LocalSourceReplacement): void {
  const state = useVeilStore.getState()
  state.clearVideo()
  useVeilStore.getState().setVideoSource(
    source.src,
    source.fileName,
    source.sourceKind,
    source.fileSizeBytes,
    source.filePath ?? null,
    source.mediaKind
  )
}

export function prepareVideoOpen(): void {
  useVeilStore.getState().setSelectedItem(null, null)
}
