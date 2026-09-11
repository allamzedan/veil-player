import type { BookmarkTrackItem } from '../types/track'
import type { SessionBookmark } from '../lib/sessionBookmarks'
import type { TrackAnchor } from '../types/track'

export interface CanvasBookmarkMarker {
  id: string
  label?: string
  /** Horizontal position as percent of canvas width (0–100). */
  xPercent: number
}

interface VeilCanvasBookmarkLayerProps {
  bookmarks: readonly SessionBookmark[]
  trackBookmarks: readonly BookmarkTrackItem[]
  anchors: readonly TrackAnchor[]
  duration: number
}

function toCanvasBookmarkMarkers(
  bookmarks: readonly SessionBookmark[],
  trackBookmarks: readonly BookmarkTrackItem[],
  anchors: readonly TrackAnchor[],
  duration: number
): CanvasBookmarkMarker[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return []
  }

  const markers: CanvasBookmarkMarker[] = []
  const seen = new Set<string>()

  for (const anchor of anchors) {
    if (anchor.kind !== 'bookmark') {
      continue
    }
    const futurePosition = (anchor as TrackAnchor & { canvasXPercent?: number }).canvasXPercent
    if (typeof futurePosition === 'number' && Number.isFinite(futurePosition)) {
      markers.push({
        id: anchor.id,
        label: anchor.label,
        xPercent: Math.min(100, Math.max(0, futurePosition))
      })
      seen.add(anchor.id)
    }
  }

  for (const bookmark of bookmarks) {
    if (seen.has(bookmark.id)) {
      continue
    }
    const futurePosition = (bookmark as SessionBookmark & { canvasXPercent?: number }).canvasXPercent
    const xPercent =
      typeof futurePosition === 'number' && Number.isFinite(futurePosition)
        ? Math.min(100, Math.max(0, futurePosition))
        : Math.min(100, Math.max(0, (bookmark.time / duration) * 100))

    markers.push({
      id: bookmark.id,
      label: bookmark.label,
      xPercent
    })
    seen.add(bookmark.id)
  }

  for (const bookmark of trackBookmarks) {
    if (seen.has(bookmark.id) || bookmark.enabled === false) {
      continue
    }
    markers.push({
      id: bookmark.id,
      label: bookmark.label,
      xPercent: Math.min(100, Math.max(0, (bookmark.start / duration) * 100))
    })
    seen.add(bookmark.id)
  }

  return markers
}

export default function VeilCanvasBookmarkLayer({
  bookmarks,
  trackBookmarks,
  anchors,
  duration
}: VeilCanvasBookmarkLayerProps) {
  const markers = toCanvasBookmarkMarkers(bookmarks, trackBookmarks, anchors, duration)

  if (markers.length === 0) {
    return <div className="veil-canvas__bookmark-layer" aria-hidden />
  }

  return (
    <div className="veil-canvas__bookmark-layer" aria-hidden={false}>
      {markers.map((marker) => (
        <span
          key={marker.id}
          className="veil-canvas__bookmark-marker"
          style={{ left: `${marker.xPercent}%` }}
          title={marker.label}
        />
      ))}
    </div>
  )
}
