export interface ContentReviewPreferences {
  analyzeImportedSubtitles: boolean
  customTerms: string[]
}

const STORAGE_KEY = 'veil:contentReviewPreferences:v1'
export const MAX_CONTENT_REVIEW_CUSTOM_TERM_LENGTH = 100

export const DEFAULT_CONTENT_REVIEW_PREFERENCES: ContentReviewPreferences = {
  analyzeImportedSubtitles: false,
  customTerms: []
}

const listeners = new Set<() => void>()

interface ContentReviewPreferencesBridge {
  readContentReviewCustomTerms: () => Promise<string[]>
  writeContentReviewCustomTerms: (customTerms: string[]) => Promise<string[]>
}

function contentReviewPreferencesBridge(): ContentReviewPreferencesBridge | undefined {
  return (globalThis as unknown as {
    window?: { veil?: ContentReviewPreferencesBridge }
  }).window?.veil
}

export function normalizeContentReviewCustomTerm(value: string): string | null {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return normalized.length > 0 && normalized.length <= MAX_CONTENT_REVIEW_CUSTOM_TERM_LENGTH
    ? normalized
    : null
}

function customTermKey(value: string): string {
  return value.normalize('NFKC').toLowerCase()
}

export function normalizeContentReviewCustomTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const terms: string[] = []
  const seen = new Set<string>()
  value.forEach((candidate) => {
    if (typeof candidate !== 'string') return
    const term = normalizeContentReviewCustomTerm(candidate)
    if (!term) return
    const key = customTermKey(term)
    if (seen.has(key)) return
    seen.add(key)
    terms.push(term)
  })
  return terms
}

export function appendContentReviewCustomTerm(
  terms: readonly string[],
  candidate: string
): string[] {
  return normalizeContentReviewCustomTerms([...terms, candidate])
}

export function removeContentReviewCustomTerm(
  terms: readonly string[],
  termToRemove: string
): string[] {
  const removeKey = customTermKey(termToRemove)
  return normalizeContentReviewCustomTerms(terms).filter(
    (term) => customTermKey(term) !== removeKey
  )
}

export function normalizeContentReviewPreferences(
  value: Partial<ContentReviewPreferences> | null | undefined
): ContentReviewPreferences {
  return {
    analyzeImportedSubtitles:
      typeof value?.analyzeImportedSubtitles === 'boolean'
        ? value.analyzeImportedSubtitles
        : DEFAULT_CONTENT_REVIEW_PREFERENCES.analyzeImportedSubtitles,
    customTerms: normalizeContentReviewCustomTerms(value?.customTerms)
  }
}

export function readContentReviewPreferences(): ContentReviewPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONTENT_REVIEW_PREFERENCES }
    return normalizeContentReviewPreferences(JSON.parse(raw) as Partial<ContentReviewPreferences>)
  } catch {
    return { ...DEFAULT_CONTENT_REVIEW_PREFERENCES }
  }
}

export async function hydrateContentReviewCustomTerms(): Promise<ContentReviewPreferences> {
  const bridge = contentReviewPreferencesBridge()
  if (!bridge) {
    return readContentReviewPreferences()
  }
  try {
    const customTerms = await bridge.readContentReviewCustomTerms()
    return writeContentReviewPreferences(
      { ...readContentReviewPreferences(), customTerms },
      false
    )
  } catch {
    return readContentReviewPreferences()
  }
}

export function writeContentReviewPreferences(
  value: ContentReviewPreferences,
  persistCustomTerms = true
): ContentReviewPreferences {
  const normalized = normalizeContentReviewPreferences(value)
  const bridge = contentReviewPreferencesBridge()
  if (persistCustomTerms && bridge) {
    void bridge.writeContentReviewCustomTerms(normalized.customTerms)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Keep the validated preference available for this session when storage is unavailable.
  }
  listeners.forEach((listener) => listener())
  return normalized
}

export function patchContentReviewPreferences(
  patch: Partial<ContentReviewPreferences>
): ContentReviewPreferences {
  return writeContentReviewPreferences({ ...readContentReviewPreferences(), ...patch })
}

export function subscribeContentReviewPreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetContentReviewPreferencesForTests(): void {
  listeners.clear()
}
