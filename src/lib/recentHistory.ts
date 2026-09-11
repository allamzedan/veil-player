import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  PersistedRecentHistory,
  PersistedRecentVeil,
  PersistedRecentVideo
} from '../../electron/lib/recentHistoryStore'

export type RecentOpenTarget =
  | { kind: 'local'; entry: PersistedRecentVideo; filePath: string }
  | { kind: 'youtube'; entry: PersistedRecentVideo; url: string }
  | { kind: 'veil'; entry: PersistedRecentVeil; filePath: string }

export interface RecentHistoryReader {
  readRecentHistory: () => Promise<PersistedRecentHistory>
  clearRecentHistory: () => Promise<PersistedRecentHistory>
  onRecentHistoryChanged: (callback: (history: PersistedRecentHistory) => void) => () => void
}

export const EMPTY_RECENT_HISTORY: PersistedRecentHistory = { videos: [], veils: [] }

export function toRecentOpenTargets(history: PersistedRecentHistory): RecentOpenTarget[] {
  const videos: RecentOpenTarget[] = []
  for (const entry of history.videos) {
    if (entry.kind === 'youtube' && entry.canonicalUrl) {
      videos.push({ kind: 'youtube', entry, url: entry.canonicalUrl })
    } else if (entry.filePath) {
      videos.push({ kind: 'local', entry, filePath: entry.filePath })
    }
  }
  const veils: RecentOpenTarget[] = history.veils.map((entry) => ({
    kind: 'veil',
    entry,
    filePath: entry.filePath
  }))
  return [...videos, ...veils].sort((a, b) => b.entry.openedAt - a.entry.openedAt)
}

function pathParts(filePath: string): string[] {
  return filePath.replace(/\\/g, '/').split('/').filter(Boolean)
}

export function recentVideoLabel(entry: PersistedRecentVideo): string {
  if (entry.kind !== 'youtube') return entry.name
  const name = entry.name.trim()
  const videoId = entry.videoId?.trim()
  const exposesIdentity = Boolean(
    videoId &&
    (name === videoId || (
      name.toLocaleLowerCase().startsWith('youtube') &&
      name.toLocaleLowerCase().endsWith(videoId.toLocaleLowerCase())
    ))
  )
  return !name || exposesIdentity ? 'YouTube video' : name
}

export function recentVideoTitle(entry: PersistedRecentVideo): string {
  const label = recentVideoLabel(entry)
  if (entry.kind !== 'youtube' || label !== 'YouTube video') return label
  return entry.canonicalUrl ?? entry.videoId ?? label
}
export function recentTargetLabel(
  target: RecentOpenTarget,
  allTargets: readonly RecentOpenTarget[]
): string {
  if (target.kind === 'youtube') {
    return recentVideoLabel(target.entry)
  }
  if (target.kind === 'veil') return target.entry.title

  const parts = pathParts(target.filePath)
  const fileName = parts.at(-1) ?? target.entry.name
  const duplicates = allTargets.filter((candidate) =>
    candidate.kind === 'local' &&
    (pathParts(candidate.filePath).at(-1) ?? candidate.entry.name).toLocaleLowerCase() ===
      fileName.toLocaleLowerCase()
  )
  if (duplicates.length <= 1) return fileName
  const parent = parts.at(-2)
  return parent ? fileName + ' — ' + parent : fileName
}

export function recentTargetTitle(target: RecentOpenTarget): string {
  if (target.kind === 'youtube') return recentVideoTitle(target.entry)
  return target.filePath
}

export function useRecentHistory(api: RecentHistoryReader | undefined): {
  history: PersistedRecentHistory
  targets: RecentOpenTarget[]
  clearRecent: () => Promise<void>
} {
  const [history, setHistory] = useState<PersistedRecentHistory>(EMPTY_RECENT_HISTORY)

  useEffect(() => {
    let active = true
    if (!api) return
    void api.readRecentHistory().then((next) => {
      if (active) setHistory(next)
    }).catch(() => undefined)
    const unsubscribe = api.onRecentHistoryChanged((next) => {
      if (active) setHistory(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [api])

  const targets = useMemo(() => toRecentOpenTargets(history), [history])
  const clearRecent = useCallback(async (): Promise<void> => {
    if (!api) return
    setHistory(await api.clearRecentHistory())
  }, [api])

  return { history, targets, clearRecent }
}
