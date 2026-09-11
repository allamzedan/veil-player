import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const MAX_RECENT = 5

export interface PersistedRecentVideo {
  kind?: 'local' | 'youtube'
  name: string
  mediaKey: string
  filePath?: string
  videoId?: string
  canonicalUrl?: string
  durationSeconds?: number
  openedAt: number
}

export interface PersistedRecentVeil {
  title: string
  filePath: string
  actionCount: number
  badge: 'familySafe' | 'languageLearning' | 'custom'
  openedAt: number
}

export interface PersistedRecentHistory {
  videos: PersistedRecentVideo[]
  veils: PersistedRecentVeil[]
}

const EMPTY_HISTORY: PersistedRecentHistory = { videos: [], veils: [] }

export function normalizeRecentPath(filePath: string): string {
  return filePath.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLocaleLowerCase()
}

function recentVideoKind(entry: PersistedRecentVideo): 'local' | 'youtube' {
  return entry.kind === 'youtube' ? 'youtube' : 'local'
}

function recentVideoKey(entry: PersistedRecentVideo): string {
  if (recentVideoKind(entry) === 'youtube') {
    return ('youtube:' + (entry.videoId ?? entry.canonicalUrl ?? entry.mediaKey)).toLocaleLowerCase()
  }
  return 'local:' + normalizeRecentPath(entry.filePath ?? '')
}

function validVideo(entry: unknown): entry is PersistedRecentVideo {
  if (!entry || typeof entry !== 'object') return false
  const candidate = entry as Partial<PersistedRecentVideo>
  if (
    typeof candidate.name !== 'string' ||
    candidate.name.length === 0 ||
    typeof candidate.mediaKey !== 'string' ||
    typeof candidate.openedAt !== 'number' ||
    !Number.isFinite(candidate.openedAt)
  ) {
    return false
  }
  if (candidate.kind === 'youtube') {
    return typeof candidate.videoId === 'string' && candidate.videoId.length > 0 &&
      typeof candidate.canonicalUrl === 'string' && candidate.canonicalUrl.length > 0
  }
  return typeof candidate.filePath === 'string' && candidate.filePath.length > 0
}

export function minimizePersistedYouTubeEntry(entry: PersistedRecentVideo): PersistedRecentVideo {
  if (recentVideoKind(entry) !== 'youtube') return entry
  return {
    kind: 'youtube',
    name: 'YouTube video',
    mediaKey: entry.videoId ?? entry.mediaKey,
    videoId: entry.videoId,
    canonicalUrl: entry.canonicalUrl,
    openedAt: entry.openedAt
  }
}

function validVeil(entry: unknown): entry is PersistedRecentVeil {
  if (!entry || typeof entry !== 'object') return false
  const candidate = entry as Partial<PersistedRecentVeil>
  return typeof candidate.title === 'string' && candidate.title.length > 0 &&
    typeof candidate.filePath === 'string' && candidate.filePath.length > 0 &&
    typeof candidate.actionCount === 'number' && Number.isFinite(candidate.actionCount) &&
    typeof candidate.badge === 'string' &&
    ['familySafe', 'languageLearning', 'custom'].includes(candidate.badge) &&
    typeof candidate.openedAt === 'number' && Number.isFinite(candidate.openedAt)
}

export class RecentHistoryStore {
  private mutation = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async read(): Promise<PersistedRecentHistory> {
    await this.mutation
    return this.readUnsafe()
  }

  recordVideo(entry: PersistedRecentVideo): Promise<void> {
    if (!validVideo(entry)) return Promise.resolve()
    const persistedEntry = minimizePersistedYouTubeEntry(entry)
    return this.update((history) => ({
      ...history,
      videos: [
        persistedEntry,
        ...history.videos.filter((item) => recentVideoKey(item) !== recentVideoKey(persistedEntry))
      ].slice(0, MAX_RECENT)
    }))
  }

  recordVeil(entry: PersistedRecentVeil): Promise<void> {
    if (!validVeil(entry)) return Promise.resolve()
    return this.update((history) => ({
      ...history,
      veils: [
        entry,
        ...history.veils.filter(
          (item) => normalizeRecentPath(item.filePath) !== normalizeRecentPath(entry.filePath)
        )
      ].slice(0, MAX_RECENT)
    }))
  }

  relocateVideo(previousFilePath: string, entry: PersistedRecentVideo): Promise<void> {
    if (!previousFilePath || !validVideo(entry) || recentVideoKind(entry) !== 'local') {
      return Promise.resolve()
    }
    const previousKey = normalizeRecentPath(previousFilePath)
    return this.update((history) => ({
      ...history,
      videos: [
        entry,
        ...history.videos.filter((item) =>
          recentVideoKind(item) !== 'local' || (
            normalizeRecentPath(item.filePath ?? '') !== previousKey &&
            recentVideoKey(item) !== recentVideoKey(entry)
          )
        )
      ].slice(0, MAX_RECENT)
    }))
  }

  relocateVeil(previousFilePath: string, entry: PersistedRecentVeil): Promise<void> {
    if (!previousFilePath || !validVeil(entry)) return Promise.resolve()
    const previousKey = normalizeRecentPath(previousFilePath)
    const replacementKey = normalizeRecentPath(entry.filePath)
    return this.update((history) => ({
      ...history,
      veils: [
        entry,
        ...history.veils.filter((item) => {
          const key = normalizeRecentPath(item.filePath)
          return key !== previousKey && key !== replacementKey
        })
      ].slice(0, MAX_RECENT)
    }))
  }
  updateYouTubeTitle(videoId: string, title: string): Promise<void> {
    void videoId
    void title
    return Promise.resolve()
  }
  updateVideoDuration(name: string, durationSeconds: number): Promise<void> {
    if (!name || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return Promise.resolve()
    return this.update((history) => ({
      ...history,
      videos: history.videos.map((entry) =>
        recentVideoKind(entry) === 'local' && entry.name === name
          ? { ...entry, durationSeconds }
          : entry
      )
    }))
  }

  removeVideo(identity: string): Promise<void> {
    const normalized = normalizeRecentPath(identity)
    return this.update((history) => ({
      ...history,
      videos: history.videos.filter((entry) => {
        if (recentVideoKind(entry) === 'youtube') {
          return entry.videoId !== identity && entry.canonicalUrl !== identity
        }
        return normalizeRecentPath(entry.filePath ?? '') !== normalized && entry.name !== identity
      })
    }))
  }

  removeVeil(filePath: string): Promise<void> {
    return this.update((history) => ({
      ...history,
      veils: history.veils.filter(
        (entry) => normalizeRecentPath(entry.filePath) !== normalizeRecentPath(filePath)
      )
    }))
  }

  clear(): Promise<void> {
    return this.update(() => ({ videos: [], veils: [] }))
  }

  private async readUnsafe(): Promise<PersistedRecentHistory> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedRecentHistory>
      return {
        videos: Array.isArray(parsed.videos)
          ? parsed.videos.filter(validVideo).map(minimizePersistedYouTubeEntry).slice(0, MAX_RECENT)
          : [],
        veils: Array.isArray(parsed.veils) ? parsed.veils.filter(validVeil).slice(0, MAX_RECENT) : []
      }
    } catch {
      return { ...EMPTY_HISTORY }
    }
  }

  private update(mutate: (history: PersistedRecentHistory) => PersistedRecentHistory): Promise<void> {
    const nextMutation = this.mutation.then(async () => {
      const next = mutate(await this.readUnsafe())
      await mkdir(dirname(this.filePath), { recursive: true })
      const temporaryPath = this.filePath + '.tmp'
      await writeFile(temporaryPath, JSON.stringify(next), 'utf8')
      await rename(temporaryPath, this.filePath)
    })
    this.mutation = nextMutation.catch(() => undefined)
    return nextMutation
  }
}
