import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { atomicWriteTextFile, type AtomicFileOperations } from './atomicFile'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  )
})

describe('atomicWriteTextFile', () => {
  it('replaces a prior valid file only after the temporary file is complete', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'veil-atomic-'))
    temporaryDirectories.push(directory)
    const destination = join(directory, 'track.veil')
    await writeFile(destination, 'prior-valid', 'utf8')
    await atomicWriteTextFile(destination, 'next-valid')
    expect(await readFile(destination, 'utf8')).toBe('next-valid')
  })

  it('preserves the prior valid file when commit fails and removes the temporary file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'veil-atomic-'))
    temporaryDirectories.push(directory)
    const destination = join(directory, 'track.veil')
    await writeFile(destination, 'prior-valid', 'utf8')
    let temporaryPath = ''
    const operations: AtomicFileOperations = {
      async writeAndSync(path, data) {
        temporaryPath = path
        await writeFile(path, data, 'utf8')
      },
      async replace() {
        throw new Error('simulated commit failure')
      },
      async remove(path) {
        await rm(path, { force: true })
      }
    }
    await expect(atomicWriteTextFile(destination, 'incomplete-next', operations)).rejects.toThrow(
      'simulated commit failure'
    )
    expect(await readFile(destination, 'utf8')).toBe('prior-valid')
    await expect(readFile(temporaryPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
