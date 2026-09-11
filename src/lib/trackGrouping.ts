import type { LayerListRow } from './trackItems'
import { GROUP_COLOR_TOKENS, type GroupColorToken, type TrackGroup } from '../types/track'

export interface LayerSection {
  id: string
  label: string
  rows: LayerListRow[]
}

export function isValidGroupColorToken(token: string | undefined): token is GroupColorToken {
  return token !== undefined && (GROUP_COLOR_TOKENS as readonly string[]).includes(token)
}

export function normalizeGroupsOnLoad(
  groups: TrackGroup[] | undefined,
  validItemIds: ReadonlySet<string>
): TrackGroup[] {
  if (!groups || groups.length === 0) {
    return []
  }

  const seenItems = new Set<string>()

  return groups.map((group) => {
    const itemIds = group.itemIds.filter((id) => {
      if (!validItemIds.has(id) || seenItems.has(id)) {
        return false
      }
      seenItems.add(id)
      return true
    })

    const colorToken = isValidGroupColorToken(group.colorToken) ? group.colorToken : undefined

    return {
      id: group.id,
      label: group.label.trim() || 'Group',
      itemIds,
      ...(colorToken ? { colorToken } : {})
    }
  })
}

export function getGroupIdForItem(groups: TrackGroup[], itemId: string): string | null {
  for (const group of groups) {
    if (group.itemIds.includes(itemId)) {
      return group.id
    }
  }
  return null
}

export function buildGroupColorTokenMap(groups: TrackGroup[]): Map<string, GroupColorToken> {
  const map = new Map<string, GroupColorToken>()
  for (const group of groups) {
    if (group.colorToken) {
      for (const itemId of group.itemIds) {
        map.set(itemId, group.colorToken)
      }
    }
  }
  return map
}

export function buildLayerSections(rows: LayerListRow[], groups: TrackGroup[]): LayerSection[] {
  const sections: LayerSection[] = groups.map((group) => ({
    id: group.id,
    label: group.label,
    rows: rows.filter((row) => group.itemIds.includes(row.item.id))
  }))

  const groupedIds = new Set(groups.flatMap((group) => group.itemIds))
  const ungrouped = rows.filter((row) => !groupedIds.has(row.item.id))
  if (ungrouped.length > 0) {
    sections.push({ id: '__ungrouped__', label: 'Ungrouped', rows: ungrouped })
  }

  return sections.filter((section) => section.rows.length > 0)
}

export function filterRowsByGroupVisibility(
  rows: LayerListRow[],
  groups: TrackGroup[],
  hiddenGroupIds: ReadonlySet<string>,
  soloGroupId: string | null
): LayerListRow[] {
  if (soloGroupId !== null) {
    const solo = groups.find((group) => group.id === soloGroupId)
    if (!solo) {
      return rows
    }
    const memberIds = new Set(solo.itemIds)
    return rows.filter((row) => memberIds.has(row.item.id))
  }

  if (hiddenGroupIds.size === 0) {
    return rows
  }

  const hiddenItemIds = new Set<string>()
  for (const group of groups) {
    if (hiddenGroupIds.has(group.id)) {
      for (const itemId of group.itemIds) {
        hiddenItemIds.add(itemId)
      }
    }
  }

  return rows.filter((row) => !hiddenItemIds.has(row.item.id))
}

export function collectValidItemIds(
  masks: { id: string }[],
  mutes: { id: string }[],
  skips: { id: string }[],
  bookmarks: { id: string }[] = []
): Set<string> {
  const ids = new Set<string>()
  for (const item of [...masks, ...mutes, ...skips, ...bookmarks]) {
    ids.add(item.id)
  }
  return ids
}
