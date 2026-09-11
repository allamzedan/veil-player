import { useMemo } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { buildBookmarkMarkerPositions } from '../lib/bookmarkMarkers'
import { formatSeconds } from '../lib/time'
import type { BookmarkTrackItem } from '../types/track'
import { activateTimelineSelectionKey } from '../lib/timelineKeyboard'
import { includesTimelineSelectionItem, isTimelineMultiSelectModifier, type SelectedTimelineItem } from '../lib/timelineMultiSelection'

interface TimelineBookmarkMarkersProps {
  bookmarks: BookmarkTrackItem[]
  duration: number
  selectedItemId: string | null
  selectedItemType: string | null
  selectedItems?: readonly SelectedTimelineItem[]
  onSelect: (id: string, modifierSelection?: boolean) => void
  onSelectExclusive: (id: string) => void
}

export default function TimelineBookmarkMarkers({
  bookmarks,
  duration,
  selectedItemId,
  selectedItemType,
  selectedItems = [],
  onSelect,
  onSelectExclusive,
}: TimelineBookmarkMarkersProps) {
  useLanguage()
  const markers = useMemo(
    () => buildBookmarkMarkerPositions(bookmarks, duration),
    [bookmarks, duration]
  )

  return (
    <div className="timeline-bookmark-markers">
      {markers.map(({ bookmark, edge, leftPercent, stackOrder }) => {
        const isSelected = selectedItems.length > 0
          ? includesTimelineSelectionItem(selectedItems, bookmark.id, 'bookmark')
          : selectedItemId === bookmark.id && selectedItemType === 'bookmark'
        const label = bookmark.label?.trim() || t('bookmarks.defaultLabel')
        const note = bookmark.notes?.trim()
        const accessibleLabel = note
          ? `${formatSeconds(bookmark.start)} · ${label} · ${note}`
          : `${formatSeconds(bookmark.start)} · ${label}`

        return (
          <button
            key={bookmark.id}
            type="button"
            className={[
              'timeline-bookmark-marker',
              `timeline-bookmark-marker--edge-${edge}`,
              isSelected ? 'timeline-bookmark-marker--selected' : '',
              bookmark.enabled === false ? 'timeline-bookmark-marker--disabled' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: `${leftPercent}%`, zIndex: isSelected ? 1000 : stackOrder }}
            title={accessibleLabel}
            aria-label={accessibleLabel}
            aria-pressed={isSelected}
            onKeyDown={(event) => {
              activateTimelineSelectionKey(event, () => onSelectExclusive(bookmark.id))
            }}
            onClick={(event) => {
              if (event.detail === 0) return
              event.stopPropagation()
              onSelect(bookmark.id, isTimelineMultiSelectModifier(event))
            }}
          />
        )
      })}
    </div>
  )
}
