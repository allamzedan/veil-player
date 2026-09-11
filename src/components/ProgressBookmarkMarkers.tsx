import { useMemo, type CSSProperties } from 'react'
import { buildBookmarkMarkerPositions } from '../lib/bookmarkMarkers'
import { SEEKBAR_THUMB_CENTER_INSET_PX } from '../lib/bookmarkMarkerGeometry'
import { formatSeconds } from '../lib/time'
import type { BookmarkTrackItem } from '../types/track'

export default function ProgressBookmarkMarkers({
  bookmarks,
  duration,
  selectedBookmarkId,
  onSelect,
  onSeek,
  trackInsetPx = SEEKBAR_THUMB_CENTER_INSET_PX
}: {
  bookmarks: BookmarkTrackItem[]
  duration: number
  selectedBookmarkId: string | null
  onSelect: (id: string) => void
  onSeek: (time: number, bookmarkId: string) => void
  trackInsetPx?: number
}) {
  const markers = useMemo(
    () => buildBookmarkMarkerPositions(bookmarks, duration),
    [bookmarks, duration]
  )
  if (!Number.isFinite(duration) || duration <= 0 || markers.length === 0) return null
  return (
    <span
      className="progress-bookmark-markers"
      style={{ '--seekbar-bookmark-track-inset': `${trackInsetPx}px` } as CSSProperties}
    >
      {markers.map(({ bookmark, edge, leftPercent, stackOrder }) => {
        const selected = bookmark.id === selectedBookmarkId
        const label = bookmark.label?.trim() || `Bookmark at ${formatSeconds(bookmark.start)}`
        return <button
          key={bookmark.id}
          type="button"
          className={[
            'progress-bookmark-marker',
            `progress-bookmark-marker--edge-${edge}`,
            selected ? 'progress-bookmark-marker--selected' : '',
            bookmark.enabled === false ? 'progress-bookmark-marker--disabled' : ''
          ].filter(Boolean).join(' ')}
          style={{ left: `${leftPercent}%`, zIndex: selected ? 1000 : stackOrder }}
          title={label}
          aria-label={label}
          aria-pressed={selected}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onSeek(bookmark.start, bookmark.id)
            onSelect(bookmark.id)
          }}
        />
      })}
    </span>
  )
}
