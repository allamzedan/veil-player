import { formatSeconds } from './time'

interface BookmarkClipboardFields {
  start: number
  label?: string
  notes?: string
}

export function formatBookmarkClipboardText({
  start,
  label,
  notes
}: BookmarkClipboardFields): string {
  const timestamp = formatSeconds(start)
  const cleanLabel = label?.trim() ?? ''
  const cleanNotes = notes?.trim() ?? ''
  const firstLine = cleanLabel ? `${timestamp} — ${cleanLabel}` : timestamp
  return cleanNotes ? `${firstLine}\n${cleanNotes}` : firstLine
}
