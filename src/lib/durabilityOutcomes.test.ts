import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseAndDeserializeTrackJson } from './trackSerialization'
import { useVeilStore } from '../state/useVeilStore'
import type { MaskTrackItem } from '../types/track'

const directories: string[] = []
const existingMask: MaskTrackItem = {
  id: 'existing-mask',
  type: 'mask',
  start: 1,
  end: 2,
  enabled: true,
  rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
  style: { mode: 'solid', color: '#000000', opacity: 1 }
}
const validTrack = {
  version: '1.6.0',
  app: 'VEIL',
  video: {
    name: 'movie.mp4',
    duration: 60,
    fileSize: 1000,
    resolution: { width: 1280, height: 720 },
    fingerprint: { method: 'metadata-v1', value: 'fp' }
  },
  globalOffsetSeconds: 0,
  items: []
}

function seedCurrentSession(): void {
  useVeilStore.setState({
    masks: [existingMask],
    mutes: [],
    skips: [],
    bookmarks: [],
    selectedItemId: existingMask.id,
    selectedItemType: 'mask',
    isTrackDirty: true,
    trackFilePath: 'C:\\tracks\\current.veil'
  })
}

function attemptPayloadApply(json: string): boolean {
  const parsed = parseAndDeserializeTrackJson(json)
  if (!parsed.ok || !parsed.payload) return false
  useVeilStore.getState().applyLoadedTrackPayload(parsed.payload)
  return true
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('VEIL durability outcomes', () => {
  it.each([
    ['corrupt JSON', '{ broken'],
    ['future schema', JSON.stringify({ ...validTrack, version: '99.0.0' })]
  ])('rejects %s without replacing the current document', (_label, json) => {
    seedCurrentSession()
    const before = {
      masks: useVeilStore.getState().masks,
      selectedItemId: useVeilStore.getState().selectedItemId,
      isTrackDirty: useVeilStore.getState().isTrackDirty,
      trackFilePath: useVeilStore.getState().trackFilePath
    }

    expect(attemptPayloadApply(json)).toBe(false)
    expect({
      masks: useVeilStore.getState().masks,
      selectedItemId: useVeilStore.getState().selectedItemId,
      isTrackDirty: useVeilStore.getState().isTrackDirty,
      trackFilePath: useVeilStore.getState().trackFilePath
    }).toEqual(before)
  })

  it('reads a corrupt source file without modifying it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'veil-corrupt-source-'))
    directories.push(directory)
    const filePath = join(directory, 'corrupt.veil')
    const original = '{ definitely-corrupt'
    await writeFile(filePath, original, 'utf8')

    expect(attemptPayloadApply(await readFile(filePath, 'utf8'))).toBe(false)
    expect(await readFile(filePath, 'utf8')).toBe(original)
  })

  it.each(['1.0.0', '1.3.0', '1.6.0'])('accepts supported schema %s', (version) => {
    expect(parseAndDeserializeTrackJson(JSON.stringify({ ...validTrack, version })).ok).toBe(true)
  })
})
