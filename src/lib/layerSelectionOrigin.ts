import type { SelectableItemType } from './trackItems'

export type LayerSelectionOrigin =
  | 'standard'
  | 'fullscreen-layers-row'
  | 'fullscreen-layers-edit'

export function suppressLocalBookmarkToastForSelection(
  type: SelectableItemType,
  isYouTube: boolean,
  origin: LayerSelectionOrigin
): boolean {
  return type === 'bookmark' && !isYouTube && origin !== 'standard'
}
