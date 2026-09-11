import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ContentReviewPreferencesStore } from './contentReviewPreferencesStore'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })))
})

describe('Content Review custom-term durable store', () => {
  it('round-trips normalized terms through the user-data JSON file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'veil-content-review-'))
    temporaryDirectories.push(directory)
    const filePath = join(directory, 'content-review-preferences.json')
    const store = new ContentReviewPreferencesStore(filePath)

    await expect(store.write(['  Family   Secret  ', 'family secret', '\u79d8\u5bc6']))
      .resolves.toEqual(['Family Secret', '\u79d8\u5bc6'])
    await expect(new ContentReviewPreferencesStore(filePath).read())
      .resolves.toEqual(['Family Secret', '\u79d8\u5bc6'])
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({
      customTerms: ['Family Secret', '\u79d8\u5bc6']
    })
  })

  it('recovers an empty list from missing or malformed storage', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'veil-content-review-'))
    temporaryDirectories.push(directory)
    const store = new ContentReviewPreferencesStore(join(directory, 'missing.json'))
    await expect(store.read()).resolves.toEqual([])
  })
})
