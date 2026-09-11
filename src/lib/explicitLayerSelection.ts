import { requestBookmarkToastDismissal } from './bookmarkInteractionBridge'
import { useVeilStore } from '../state/useVeilStore'
import type { SelectableItemType } from './trackItems'

export function shouldToggleOffExplicitSelection(
  selectedItemId: string | null,
  selectedItemType: SelectableItemType | null,
  itemId: string,
  itemType: SelectableItemType
): boolean {
  return selectedItemId === itemId && selectedItemType === itemType
}

export function shouldClearMaskSelectionFromStage(
  selectedItemType: SelectableItemType | null,
  targetIsInsideMask: boolean
): boolean {
  return selectedItemType === 'mask' && !targetIsInsideMask
}

export function clearExplicitLayerSelection(): boolean {
  const state = useVeilStore.getState()
  if (
    state.selectedItems.length === 0 &&
    state.selectedItemId === null &&
    state.selectedItemType === null
  ) return false
  state.setSelectedItem(null, null)
  requestBookmarkToastDismissal()
  return true
}
