import { formatTime } from './time'
import type { BookmarkTrackItem } from '../types/track'

function csvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function buildBookmarkCsv(bookmarks: readonly BookmarkTrackItem[]): string | null {
  if (bookmarks.length === 0) return null
  const lines = ['Timestamp,Seconds,Label,Note']
  const sorted = [...bookmarks].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
  for (const bookmark of sorted) {
    lines.push([
      formatTime(bookmark.start),
      String(bookmark.start),
      bookmark.label ?? '',
      bookmark.notes ?? ''
    ].map(csvCell).join(','))
  }
  return lines.join('\r\n')
}

export function bookmarkCsvFileName(mediaName: string | null | undefined): string {
  const base = (mediaName?.trim() || 'media')
    .replace(/\.[^./\\]+$/, '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim() || 'media'
  return `${base}-bookmarks.csv`
}
