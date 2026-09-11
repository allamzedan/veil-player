import type { SelectableItemType } from './trackItems'

export interface InspectorSelectionNavigationIntent {
  preserveInspectorTab?: boolean
}

let preservedSelection: { id: string; type: SelectableItemType } | null = null

export function preserveInspectorTabForSelection(id: string, type: SelectableItemType): void {
  preservedSelection = { id, type }
}

export function consumeInspectorTabPreservation(id: string, type: SelectableItemType): boolean {
  const shouldPreserve = preservedSelection?.id === id && preservedSelection.type === type
  preservedSelection = null
  return shouldPreserve
}
