import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SESSION_RECOVERY_VERSION,
  SessionRecoveryStore,
  type SessionRecoverySnapshot
} from './sessionRecoveryStore'

const directories: string[] = []
const snapshot: SessionRecoverySnapshot = {
  version: SESSION_RECOVERY_VERSION,
  savedAt: '2026-08-15T00:00:00.000Z',
  trackJson: '{"version":"1.6.0"}',
  trackFilePath: 'C:\\tracks\\movie.veil',
  mediaIdentity: { kind: 'local', key: 'C:\\media\\movie.mp4' }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function storeFixture(): Promise<{ store: SessionRecoveryStore; filePath: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'veil-recovery-'))
  directories.push(directory)
  const filePath = join(directory, 'session-recovery.json')
  return { store: new SessionRecoveryStore(filePath), filePath }
}

describe('SessionRecoveryStore', () => {
  it('starts clean with empty userData and round-trips a separate recovery snapshot', async () => {
    const { store, filePath } = await storeFixture()
    expect(await store.read()).toBeNull()
    expect(await store.write(snapshot)).toBe(true)
    expect(await store.read()).toEqual(snapshot)
    expect(await readFile(filePath, 'utf8')).not.toContain('source-media-bytes')
  })

  it('clears malformed recovery data without throwing during startup', async () => {
    const { store, filePath } = await storeFixture()
    await writeFile(filePath, '{ malformed', 'utf8')
    expect(await store.read()).toBeNull()
    await expect(readFile(filePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('discard removes recovery state without touching the source VEIL', async () => {
    const { store } = await storeFixture()
    const sourceVeil = join(tmpdir(), `source-${Date.now()}.veil`)
    await writeFile(sourceVeil, 'prior-valid-veil', 'utf8')
    directories.push(sourceVeil)
    await store.write({ ...snapshot, trackFilePath: sourceVeil })
    await store.clear()
    expect(await store.read()).toBeNull()
    expect(await readFile(sourceVeil, 'utf8')).toBe('prior-valid-veil')
  })

  it('rejects snapshots without a stable media identity', async () => {
    const { store } = await storeFixture()
    const invalid = {
      ...snapshot,
      mediaIdentity: { kind: 'local' as const, key: '' }
    }
    expect(await store.write(invalid)).toBe(false)
    expect(await store.read()).toBeNull()
  })
})
