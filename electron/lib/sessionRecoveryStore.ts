import { mkdir, readFile, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { atomicWriteTextFile } from './atomicFile'

export const SESSION_RECOVERY_VERSION = 1

export interface SessionRecoverySnapshot {
  version: typeof SESSION_RECOVERY_VERSION
  savedAt: string
  trackJson: string
  trackFilePath: string | null
  mediaIdentity: {
    kind: 'local' | 'youtube'
    key: string
  }
}

export function parseSessionRecoverySnapshot(value: unknown): SessionRecoverySnapshot | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<SessionRecoverySnapshot>
  const media = candidate.mediaIdentity
  if (
    candidate.version !== SESSION_RECOVERY_VERSION ||
    typeof candidate.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.savedAt)) ||
    typeof candidate.trackJson !== 'string' ||
    candidate.trackJson.length === 0 ||
    !(candidate.trackFilePath === null || typeof candidate.trackFilePath === 'string') ||
    !media ||
    (media.kind !== 'local' && media.kind !== 'youtube') ||
    typeof media.key !== 'string' ||
    media.key.length === 0
  ) {
    return null
  }
  return candidate as SessionRecoverySnapshot
}

export class SessionRecoveryStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<SessionRecoverySnapshot | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'))
      const snapshot = parseSessionRecoverySnapshot(parsed)
      if (!snapshot) await this.clear()
      return snapshot
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') await this.clear()
      return null
    }
  }

  async write(snapshot: SessionRecoverySnapshot): Promise<boolean> {
    if (!parseSessionRecoverySnapshot(snapshot)) return false
    await mkdir(dirname(this.filePath), { recursive: true })
    await atomicWriteTextFile(this.filePath, JSON.stringify(snapshot))
    return true
  }

  async clear(): Promise<void> {
    await unlink(this.filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}
