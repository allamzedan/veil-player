import { describe, expect, it } from 'vitest'
import { filterNavigationItemsByQuery } from './bookmarkSearch'

const rows = [
  { type: 'mask', item: { id: 'mask', label: 'Opening cover', notes: 'Visual note' } },
  { type: 'mute', item: { id: 'mute', label: 'Quiet phrase', notes: 'Arabic audio' } },
  { type: 'skip', item: { id: 'skip', label: 'Credits', notes: '' } },
  { type: 'bookmark', item: { id: 'a', label: 'Opening Scene', notes: 'Warm intro' } },
  { type: 'bookmark', item: { id: 'b', label: 'مقدمة', notes: 'لحظة مهمة' } },
  { type: 'bookmark', item: { id: 'c', label: 'Résumé', notes: '' } }
]

describe('VEIL item search', () => {
  it('matches label and note substrings case-insensitively', () => {
    expect(filterNavigationItemsByQuery(rows, 'OPEN').map((row) => row.item.id)).toEqual(['mask', 'a'])
    expect(filterNavigationItemsByQuery(rows, 'warm intro').map((row) => row.item.id)).toEqual(['a'])
    expect(filterNavigationItemsByQuery(rows, 'visual note').map((row) => row.item.id)).toEqual(['mask'])
    expect(filterNavigationItemsByQuery(rows, 'quiet').map((row) => row.item.id)).toEqual(['mute'])
    expect(filterNavigationItemsByQuery(rows, 'credits').map((row) => row.item.id)).toEqual(['skip'])
  })

  it('matches Arabic and normalized Unicode text', () => {
    expect(filterNavigationItemsByQuery(rows, 'مهمة').map((row) => row.item.id)).toEqual(['b'])
    expect(filterNavigationItemsByQuery(rows, 'résumé').map((row) => row.item.id)).toEqual(['c'])
  })

  it('returns all rows for an empty query and composes with type-filtered input', () => {
    expect(filterNavigationItemsByQuery(rows, '')).toEqual(rows)
    const bookmarks = rows.filter((row) => row.type === 'bookmark')
    expect(filterNavigationItemsByQuery(bookmarks, 'opening').map((row) => row.item.id)).toEqual(['a'])
    const mutes = rows.filter((row) => row.type === 'mute')
    expect(filterNavigationItemsByQuery(mutes, 'arabic').map((row) => row.item.id)).toEqual(['mute'])
  })

  it('does not mutate input rows or selection data', () => {
    const snapshot = structuredClone(rows)
    filterNavigationItemsByQuery(rows, 'opening')
    expect(rows).toEqual(snapshot)
  })
})
