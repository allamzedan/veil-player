import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('local custom Content Review terms contract', () => {
  it('keeps add, Enter, and individual removal controls in the existing Subtitle settings section', () => {
    const settings = read('../components/SettingsDialog.tsx')
    const contentReviewStart = settings.indexOf('settings-dialog__content-review')
    const contentReviewSection = settings.slice(contentReviewStart, settings.indexOf('</fieldset>', contentReviewStart))

    expect(contentReviewSection).toContain("t('contentReview.customTerms')")
    expect(contentReviewSection).toContain('maxLength={MAX_CONTENT_REVIEW_CUSTOM_TERM_LENGTH}')
    expect(contentReviewSection).toContain('onKeyDown={onCustomReviewTermKeyDown}')
    expect(contentReviewSection).toContain('onClick={onAddCustomReviewTerm}')
    expect(contentReviewSection).toContain('onRemoveCustomReviewTerm(term)')
    expect(contentReviewSection).not.toContain('disabled={!contentReview.analyzeImportedSubtitles}')
  })

  it('keeps custom terms out of the VEIL schema and serialization path', () => {
    expect(read('./trackSerialization.ts')).not.toContain('customTerms')
    expect(read('./trackSchema.ts')).not.toContain('customTerms')
    expect(read('../types/track.ts')).not.toContain('customTerms')
  })
})
