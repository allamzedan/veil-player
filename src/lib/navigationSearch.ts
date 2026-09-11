import type { InspectorTypeFilter } from './inspectorNavigation'

export type NavigationSearchPlaceholderKey =
  | 'inspector.searchVeilItems'
  | 'inspector.searchMasks'
  | 'inspector.searchMutes'
  | 'inspector.searchSkips'
  | 'inspector.searchBookmarks'

export function navigationSearchPlaceholderKey(
  type: InspectorTypeFilter
): NavigationSearchPlaceholderKey {
  if (type === 'mask') return 'inspector.searchMasks'
  if (type === 'mute') return 'inspector.searchMutes'
  if (type === 'skip') return 'inspector.searchSkips'
  if (type === 'bookmark') return 'inspector.searchBookmarks'
  return 'inspector.searchVeilItems'
}
