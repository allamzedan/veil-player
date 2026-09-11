import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appendContentReviewCustomTerm,
  DEFAULT_CONTENT_REVIEW_PREFERENCES,
  hydrateContentReviewCustomTerms,
  normalizeContentReviewPreferences,
  patchContentReviewPreferences,
  readContentReviewPreferences,
  removeContentReviewCustomTerm,
  resetContentReviewPreferencesForTests,
  subscribeContentReviewPreferences
} from './contentReviewPreferences'

function installStorage(initial?: string): Map<string, string> {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set('veil:contentReviewPreferences:v1', initial)
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  })
  return values
}

describe('Content Review preferences', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    resetContentReviewPreferencesForTests()
  })

  it('defaults analysis to off for missing or malformed storage', () => {
    installStorage()
    expect(readContentReviewPreferences()).toEqual(DEFAULT_CONTENT_REVIEW_PREFERENCES)
    installStorage('{not json')
    expect(readContentReviewPreferences()).toEqual(DEFAULT_CONTENT_REVIEW_PREFERENCES)
  })

  it('rejects invalid individual values', () => {
    expect(normalizeContentReviewPreferences({ analyzeImportedSubtitles: 'yes' as never }))
      .toEqual(DEFAULT_CONTENT_REVIEW_PREFERENCES)
  })

  it('persists a validated toggle and notifies subscribers', () => {
    const values = installStorage()
    const listener = vi.fn()
    const unsubscribe = subscribeContentReviewPreferences(listener)

    expect(patchContentReviewPreferences({ analyzeImportedSubtitles: true }))
      .toEqual({ analyzeImportedSubtitles: true, customTerms: [] })
    expect(JSON.parse(values.get('veil:contentReviewPreferences:v1') ?? '{}'))
      .toEqual({ analyzeImportedSubtitles: true, customTerms: [] })
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('persists trimmed Unicode and multi-word terms across a storage round-trip', () => {
    installStorage()
    patchContentReviewPreferences({
      customTerms: ['  family   secret  ', '\u79d8\u5bc6\u306e\u8a00\u8449']
    })
    expect(readContentReviewPreferences().customTerms).toEqual([
      'family secret',
      '\u79d8\u5bc6\u306e\u8a00\u8449'
    ])
  })

  it('rejects blanks, overlong values, and case-insensitive duplicates', () => {
    const terms = appendContentReviewCustomTerm([], '  Family Secret  ')
    expect(appendContentReviewCustomTerm(terms, 'family secret')).toEqual(terms)
    expect(appendContentReviewCustomTerm(terms, '   ')).toEqual(terms)
    expect(appendContentReviewCustomTerm(terms, 'x'.repeat(101))).toEqual(terms)
  })

  it('removes one term case-insensitively without disturbing the others', () => {
    expect(removeContentReviewCustomTerm(
      ['Family Secret', '\u79d8\u5bc6'],
      'family secret'
    )).toEqual(['\u79d8\u5bc6'])
  })

  it('writes through the durable bridge and hydrates terms on a new renderer origin', async () => {
    const writeContentReviewCustomTerms = vi.fn(async (terms: string[]) => terms)
    const readContentReviewCustomTerms = vi.fn(async () => ['Persisted Phrase'])
    vi.stubGlobal('window', {
      veil: {
        readContentReviewCustomTerms,
        writeContentReviewCustomTerms
      }
    })
    installStorage()

    patchContentReviewPreferences({ customTerms: ['Persisted Phrase'] })
    expect(writeContentReviewCustomTerms).toHaveBeenCalledWith(['Persisted Phrase'])

    installStorage()
    expect(readContentReviewPreferences().customTerms).toEqual([])
    await hydrateContentReviewCustomTerms()
    expect(readContentReviewCustomTerms).toHaveBeenCalledOnce()
    expect(readContentReviewPreferences().customTerms).toEqual(['Persisted Phrase'])
  })
})
