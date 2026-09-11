import { describe, expect, it } from 'vitest'
import { bookmarkCsvFileName, buildBookmarkCsv } from './bookmarkCsv'
import type { BookmarkTrackItem } from '../types/track'

const bookmark = (id: string, start: number, label = '', notes = ''): BookmarkTrackItem => ({
  id,
  type: 'bookmark',
  start,
  end: start,
  label,
  notes,
  enabled: true
})

describe('bookmark CSV export', () => {
  it('exports chronologically with formatted timestamp and canonical seconds', () => {
    const csv = buildBookmarkCsv([bookmark('later', 65.5, 'Later'), bookmark('first', 2, 'First')])
    expect(csv?.split('\r\n')).toEqual([
      'Timestamp,Seconds,Label,Note',
      '0:02,2,First,',
      '1:05,65.5,Later,'
    ])
  })

  it('escapes commas, quotes, multiline notes, and preserves Arabic Unicode', () => {
    const csv = buildBookmarkCsv([bookmark('a', 3, 'مرحبا, "VEIL"', 'line one\nالسطر الثاني')])
    expect(csv).toContain('"مرحبا, ""VEIL"""')
    expect(csv).toContain('"line one\nالسطر الثاني"')
  })

  it('handles empty fields and refuses zero-bookmark export', () => {
    expect(buildBookmarkCsv([bookmark('empty', 0)])).toContain('0:00,0,,')
    expect(buildBookmarkCsv([])).toBeNull()
  })

  it('creates a safe media-derived default filename', () => {
    expect(bookmarkCsvFileName('My Video.mp4')).toBe('My Video-bookmarks.csv')
    expect(bookmarkCsvFileName('bad:name?.mp4')).toBe('bad_name_-bookmarks.csv')
    expect(bookmarkCsvFileName(null)).toBe('media-bookmarks.csv')
  })
})
