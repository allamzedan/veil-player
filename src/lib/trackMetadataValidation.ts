import type { TrackMetadata } from '../types/track'

export const TRACK_METADATA_LIMITS = {
  titleMax: 120,
  descriptionMax: 2000,
  authorMax: 80,
  languageMax: 32,
  notesMax: 4000,
  /** Whole-media Summary (metadata.summary) — distinct from notes. */
  summaryMax: 8000,
  tagMax: 32,
  tagsMax: 20
} as const

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return value.slice(0, maxLength)
}

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

export function formatTagsForInput(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) {
    return ''
  }
  return tags.join(', ')
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags || tags.length === 0) {
    return undefined
  }

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of tags) {
    const tag = clampText(raw.trim(), TRACK_METADATA_LIMITS.tagMax)
    if (!tag) {
      continue
    }
    const key = tag.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    normalized.push(tag)
    if (normalized.length >= TRACK_METADATA_LIMITS.tagsMax) {
      break
    }
  }

  return normalized.length > 0 ? normalized : undefined
}

/** Sanitize metadata for store and export. Unknown reserved keys are preserved. */
export function sanitizeTrackMetadata(metadata: TrackMetadata): TrackMetadata {
  const result: TrackMetadata = {}

  const title = metadata.title?.trim()
  if (title) {
    result.title = clampText(title, TRACK_METADATA_LIMITS.titleMax)
  }

  const description = metadata.description?.trim()
  if (description) {
    result.description = clampText(description, TRACK_METADATA_LIMITS.descriptionMax)
  }

  const author = metadata.author?.trim()
  if (author) {
    result.author = clampText(author, TRACK_METADATA_LIMITS.authorMax)
  }

  const language = metadata.language?.trim()
  if (language) {
    result.language = clampText(language, TRACK_METADATA_LIMITS.languageMax)
  }

  const notes = metadata.notes?.trim()
  if (notes) {
    result.notes = clampText(notes, TRACK_METADATA_LIMITS.notesMax)
  }

  // Preserve empty summary as "" when explicitly set; omit when undefined.
  if (typeof metadata.summary === 'string') {
    result.summary = clampText(metadata.summary, TRACK_METADATA_LIMITS.summaryMax)
  }

  const tags = normalizeTags(metadata.tags)
  if (tags) {
    result.tags = tags
  }

  if (metadata.createdAt) {
    result.createdAt = metadata.createdAt
  }
  if (metadata.updatedAt) {
    result.updatedAt = metadata.updatedAt
  }

  if (metadata.rating !== undefined && metadata.rating !== null && metadata.rating !== '') {
    result.rating = metadata.rating
  }
  if (
    typeof metadata.downloads === 'number' &&
    Number.isFinite(metadata.downloads) &&
    metadata.downloads >= 0
  ) {
    result.downloads = Math.floor(metadata.downloads)
  }
  if (metadata.signature?.trim()) {
    result.signature = metadata.signature.trim()
  }

  return result
}

export function sanitizeTrackMetadataPatch(patch: Partial<TrackMetadata>): Partial<TrackMetadata> {
  return sanitizeTrackMetadata({ ...patch })
}
