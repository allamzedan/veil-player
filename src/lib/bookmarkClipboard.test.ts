import { describe, expect, it } from 'vitest'
import { formatBookmarkClipboardText } from './bookmarkClipboard'

describe('bookmark clipboard formatter', () => {
  it('copies timestamp, label, and note as a plain-text study block', () => {
    expect(formatBookmarkClipboardText({ start: 105, label: 'Vocabulary', notes: 'remember this phrase' }))
      .toBe('1:45 — Vocabulary\nremember this phrase')
  })

  it('omits the note line when the note is empty', () => {
    expect(formatBookmarkClipboardText({ start: 105, label: 'Vocabulary', notes: '  ' }))
      .toBe('1:45 — Vocabulary')
  })

  it('uses timestamp then note when the label is empty', () => {
    expect(formatBookmarkClipboardText({ start: 105, label: '', notes: 'Review this' }))
      .toBe('1:45\nReview this')
  })

  it('uses only the timestamp when both content fields are empty', () => {
    expect(formatBookmarkClipboardText({ start: 105, label: '', notes: '' })).toBe('1:45')
  })

  it('preserves Arabic and mixed Unicode content', () => {
    expect(formatBookmarkClipboardText({
      start: 65,
      label: 'مفردات Vocabulary',
      notes: 'تذكّر phrase 42'
    })).toBe('1:05 — مفردات Vocabulary\nتذكّر phrase 42')
  })

  it('preserves internal note newlines without a trailing blank line', () => {
    expect(formatBookmarkClipboardText({ start: 5, label: 'Review', notes: 'line one\nline two\n' }))
      .toBe('0:05 — Review\nline one\nline two')
  })
})
