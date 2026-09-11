import { useMemo, type Ref } from 'react'
import { formatSeconds } from '../lib/time'
import { pickRulerTickStep, timeToXPercent } from '../lib/timelineMath'
import type { BookmarkTrackItem } from '../types/track'
import type { SelectedTimelineItem } from '../lib/timelineMultiSelection'
import TimelineBookmarkMarkers from './TimelineBookmarkMarkers'

interface TimelineRulerProps {
  viewStart: number
  viewEnd: number
  duration: number
  bookmarks: BookmarkTrackItem[]
  selectedItemId: string | null
  selectedItemType: string | null
  selectedItems?: readonly SelectedTimelineItem[]
  onSelectBookmark: (id: string, modifierSelection?: boolean) => void
  onSelectBookmarkExclusive: (id: string) => void
  onBlankDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  usableTrackRef?: Ref<HTMLDivElement>
}

export default function TimelineRuler({
  viewStart,
  viewEnd,
  duration,
  bookmarks,
  selectedItemId,
  selectedItemType,
  selectedItems = [],
  onSelectBookmark,
  onSelectBookmarkExclusive,
  onBlankDoubleClick,
  usableTrackRef
}: TimelineRulerProps) {
  const visibleDuration = Math.max(viewEnd - viewStart, 0.001)
  const tickStep = useMemo(() => pickRulerTickStep(visibleDuration), [visibleDuration])

  const ticks = useMemo(() => {
    const first = Math.ceil(viewStart / tickStep) * tickStep
    const result: number[] = []
    for (let time = first; time <= viewEnd + tickStep * 0.001; time += tickStep) {
      result.push(time)
    }
    return result
  }, [tickStep, viewEnd, viewStart])

  const labelEvery = tickStep >= 30 ? 1 : tickStep >= 10 ? 2 : tickStep >= 5 ? 3 : 5

  return (
    <div className="timeline-ruler">
      <div className="timeline-ruler__lane">
        <div ref={usableTrackRef} className="timeline-ruler__usable-track" onDoubleClick={onBlankDoubleClick}>
          {ticks.map((time, index) => {
            const left = timeToXPercent(time, 0, duration)
            const showLabel = index % labelEvery === 0
            return (
              <div
                key={time}
                className="timeline-ruler__tick"
                style={{ left: `${left}%` }}
                aria-hidden="true"
              >
                <span className="timeline-ruler__line" />
                {showLabel ? (
                  <span className="timeline-ruler__label ltr-digits">{formatSeconds(time)}</span>
                ) : null}
              </div>
            )
          })}
          <TimelineBookmarkMarkers
            bookmarks={bookmarks}
            duration={duration}
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            selectedItems={selectedItems}
            onSelect={onSelectBookmark}
            onSelectExclusive={onSelectBookmarkExclusive}
          />
        </div>
      </div>
    </div>
  )
}
