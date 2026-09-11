import type { MediaKind } from './mediaKind'
import type { MediaSource } from '../types/mediaSource'

export function shouldDefaultInspectorToVeilTools(
  mediaSource: MediaSource | null,
  mediaKind: MediaKind | null
): boolean {
  return mediaSource?.kind === 'local' && mediaKind === 'video'
}
