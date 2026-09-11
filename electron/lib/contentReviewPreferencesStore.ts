import { mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { normalizeContentReviewCustomTerms } from '../../src/lib/contentReviewPreferences'
import { atomicWriteTextFile } from './atomicFile'

interface PersistedContentReviewPreferences {
  customTerms: string[]
}

export class ContentReviewPreferencesStore {
  private mutation = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async read(): Promise<string[]> {
    await this.mutation
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedContentReviewPreferences>
      return normalizeContentReviewCustomTerms(parsed.customTerms)
    } catch {
      return []
    }
  }

  write(value: unknown): Promise<string[]> {
    const customTerms = normalizeContentReviewCustomTerms(value)
    const nextMutation = this.mutation.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true })
      await atomicWriteTextFile(this.filePath, JSON.stringify({ customTerms }))
      return customTerms
    })
    this.mutation = nextMutation.then(() => undefined, () => undefined)
    return nextMutation
  }
}
