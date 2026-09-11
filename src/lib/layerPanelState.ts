import type { SelectableItemType } from './trackItems'

interface LayerIdentity {
  id: string
  type: SelectableItemType
}

export interface LayerPanelState {
  hasSelection: boolean
  isEditingSelectedLayer: boolean
  showPreview: boolean
  showEditor: boolean
}

export function layerIdentityKey(identity: LayerIdentity): string {
  return `${identity.type}:${identity.id}`
}

export function deriveLayerPanelState(
  selection: LayerIdentity | null,
  editingKey: string | null
): LayerPanelState {
  const hasSelection = selection !== null
  const isEditingSelectedLayer = hasSelection && editingKey === layerIdentityKey(selection)
  return {
    hasSelection,
    isEditingSelectedLayer,
    showPreview: hasSelection && !isEditingSelectedLayer,
    showEditor: hasSelection && isEditingSelectedLayer
  }
}
