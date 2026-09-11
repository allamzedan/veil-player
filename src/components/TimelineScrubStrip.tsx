import { useCallback, useRef } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import {
  clampTimelineTime,
  clientXToTimelineTime,
  timeToXPercent
} from '../lib/timelineMath'
import { t } from '../i18n'
import type { BookmarkTrackItem } from '../types/track'
import ProgressBookmarkMarkers from './ProgressBookmarkMarkers'

interface TimelineScrubStripProps {
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  bookmarks?: BookmarkTrackItem[]
  selectedBookmarkId?: string | null
  onSelectBookmark?: (id: string) => void
  onSeekBookmark?: (time: number, bookmarkId: string) => void
}

export default function TimelineScrubStrip({
  duration,
  currentTime,
  onSeek,
  bookmarks = [],
  selectedBookmarkId = null,
  onSelectBookmark,
  onSeekBookmark
}: TimelineScrubStripProps) {
  useLanguage()
  const laneRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const viewStart = 0
  const viewEnd = duration > 0 ? duration : 1

  const seekFromClientX = useCallback(
    (clientX: number): void => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }
      const time = clampTimelineTime(
        clientXToTimelineTime(clientX, rect, viewStart, viewEnd),
        duration
      )
      onSeek(time)
    },
    [duration, onSeek, viewEnd, viewStart]
  )

  const onLanePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    const lane = laneRef.current
    if (!lane) {
      return
    }

    lane.setPointerCapture(event.pointerId)
    seekFromClientX(event.clientX)

    const onMove = (moveEvent: PointerEvent): void => {
      seekFromClientX(moveEvent.clientX)
    }

    const onUp = (): void => {
      lane.releasePointerCapture(event.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const playheadLeft = timeToXPercent(currentTime, viewStart, viewEnd)

  return (
    <div className="timeline-scrub-strip" aria-label={t('timeline.scrubAria')}>
      <div
        ref={laneRef}
        className="timeline-scrub-strip__lane"
        onPointerDown={onLanePointerDown}
      >
        <div ref={trackRef} className="timeline-scrub-strip__track">
          {onSelectBookmark && onSeekBookmark ? (
            <ProgressBookmarkMarkers
              bookmarks={bookmarks}
              duration={duration}
              selectedBookmarkId={selectedBookmarkId}
              onSelect={onSelectBookmark}
              onSeek={onSeekBookmark}
              trackInsetPx={0}
            />
          ) : null}
          <div
            className="timeline-scrub-strip__playhead"
            style={{ left: `${playheadLeft}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
