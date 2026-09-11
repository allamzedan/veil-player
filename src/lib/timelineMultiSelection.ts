import type { SelectableItemType } from './trackItems'

export interface SelectedTimelineItem {
  id: string
  type: SelectableItemType
}

export function sameTimelineSelectionItem(
  left: SelectedTimelineItem,
  right: SelectedTimelineItem
): boolean {
  return left.id === right.id && left.type === right.type
}

export function includesTimelineSelectionItem(
  selectedItems: readonly SelectedTimelineItem[],
  id: string,
  type: SelectableItemType
): boolean {
  return selectedItems.some((item) => item.id === id && item.type === type)
}

export function toggleTimelineSelectionItem(
  selectedItems: readonly SelectedTimelineItem[],
  item: SelectedTimelineItem
): SelectedTimelineItem[] {
  if (includesTimelineSelectionItem(selectedItems, item.id, item.type)) {
    return selectedItems.filter((selected) => !sameTimelineSelectionItem(selected, item))
  }
  return [...selectedItems, item]
}

export function isTimelineMultiSelectModifier(event: {
  ctrlKey: boolean
  metaKey: boolean
}): boolean {
  return event.ctrlKey || event.metaKey
}

export function activeTimelineMaskEditorId(
  activeItemId: string | null,
  activeItemType: SelectableItemType | null
): string | null {
  return activeItemType === 'mask' ? activeItemId : null
}
