import { describe, expect, it } from 'vitest'
import { hasVeilMenuSession, hasVeilSession } from './trackSession'

const emptySession = {
  trackFilePath: null as string | null,
  masks: [] as [],
  mutes: [] as [],
  skips: [] as [],
  bookmarks: [] as []
}

describe('hasVeilSession', () => {
  it('is false with no items or loaded path', () => {
    expect(hasVeilSession(emptySession)).toBe(false)
  })

  it('is true for bookmark-only tracks', () => {
    expect(
      hasVeilSession({
        ...emptySession,
        bookmarks: [
          {
            id: 'b1',
            type: 'bookmark',
            start: 12,
            end: 12,
            enabled: true,
            label: 'Note',
            notes: ''
          }
        ]
      })
    ).toBe(true)
  })

  it('is true when a track file path is set', () => {
    expect(
      hasVeilSession({
        ...emptySession,
        trackFilePath: 'C:\\clips\\demo.veil'
      })
    ).toBe(true)
  })
})

describe('hasVeilMenuSession', () => {
  it('matches hasVeilSession for bookmark-only tracks', () => {
    const bookmarkOnly = {
      ...emptySession,
      bookmarks: [
        {
          id: 'b1',
          type: 'bookmark' as const,
          start: 5,
          end: 5,
          enabled: true,
          label: 'Bookmark',
          notes: ''
        }
      ]
    }
    expect(hasVeilMenuSession(bookmarkOnly)).toBe(true)
    expect(hasVeilMenuSession(bookmarkOnly)).toBe(hasVeilSession(bookmarkOnly))
  })
})
