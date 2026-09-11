import type { TrackMetadata, VeilTrack } from '../types/track'

export type VeilBadgeKind = 'familySafe' | 'languageLearning' | 'custom'

export interface RecentVeilEntry {
  title: string
  filePath: string
  actionCount: number
  badge: VeilBadgeKind
  openedAt: number
}

function normalizeBadge(value: string): VeilBadgeKind | null {
  const lower = value.toLowerCase()
  if (lower.includes('family') || lower.includes('safe')) return 'familySafe'
  if (lower.includes('language') || lower.includes('learning') || lower.includes('study')) {
    return 'languageLearning'
  }
  return null
}

export function inferVeilBadge(metadata: TrackMetadata | undefined, fileName: string): VeilBadgeKind {
  const fromTitle = normalizeBadge(metadata?.title ?? fileName)
  if (fromTitle) return fromTitle
  for (const tag of metadata?.tags ?? []) {
    const fromTag = normalizeBadge(tag)
    if (fromTag) return fromTag
  }
  return 'custom'
}

export function countTrackActions(track: VeilTrack): number {
  return track.items.filter((item) => item.enabled !== false).length
}

export function recordRecentVeil(entry: Omit<RecentVeilEntry, 'openedAt'>): void {
  if (typeof window === 'undefined') return
  void window.veil?.recordRecentVeil({ ...entry, openedAt: Date.now() }).catch(() => undefined)
}

export function removeRecentVeilByPath(filePath: string): void {
  if (typeof window === 'undefined') return
  void window.veil?.removeRecentVeil(filePath).catch(() => undefined)
}

export function recordRecentVeilFromTrack(
  track: VeilTrack,
  filePath: string,
  displayPath?: string
): void {
  const fileName = displayPath?.split(/[/\\]/).pop() ?? filePath.split(/[/\\]/).pop() ?? 'VEIL'
  recordRecentVeil({
    title: fileName,
    filePath,
    actionCount: countTrackActions(track),
    badge: inferVeilBadge(track.trackMetadata, fileName)
  })
}
export function recentVeilEntryFromTrack(track: VeilTrack, filePath: string): RecentVeilEntry {
  const fileName = filePath.split(/[/\\]/).pop() ?? 'VEIL'
  return {
    title: fileName,
    filePath,
    actionCount: countTrackActions(track),
    badge: inferVeilBadge(track.trackMetadata, fileName),
    openedAt: Date.now()
  }
}
