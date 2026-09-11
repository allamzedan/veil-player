import { describe, expect, it } from 'vitest'
import { buildNavigateGroups, sortNavigationItems, type ChapterNavigationItem } from './bookmarkNavigation'

const chapters: ChapterNavigationItem[] = [
  { kind: 'chapter', id: 'b', start: 20, title: 'Second', source: 'youtube', readOnly: true },
  { kind: 'chapter', id: 'a', start: 5, end: 19, title: 'First', source: 'veil', readOnly: false }
]

describe('chapter-ready Navigate model', () => {
  it('sorts chapters chronologically and preserves source/read-only state', () => {
    expect(sortNavigationItems(chapters).map((item) => item.id)).toEqual(['a', 'b'])
    expect(chapters[0]).toMatchObject({ source: 'youtube', readOnly: true })
  })

  it('keeps chapters and bookmarks in separate groups and allows an empty chapter group', () => {
    const groups = buildNavigateGroups([], [{ id: 'mark', type: 'bookmark', start: 8, end: 8, enabled: true }])
    expect(groups.chapters).toEqual([])
    expect(groups.bookmarks[0]).toMatchObject({ kind: 'bookmark', id: 'mark' })
  })
})
