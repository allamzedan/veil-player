import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t, type TranslationKey } from '../i18n'
import type { GroupColorToken } from '../types/track'
import type { SelectableItemType } from '../lib/trackItems'
import { isTrackItemEnabled } from '../lib/trackItems'
import { timeToXPercent } from '../lib/timelineMath'
import { activateTimelineSelectionKey } from '../lib/timelineKeyboard'
import { isTimelineMultiSelectModifier } from '../lib/timelineMultiSelection'

export type TimelineDragMode = 'move' | 'resize-left' | 'resize-right'

export interface TimelineBarItem {
  id: string
  type: SelectableItemType
  start: number
  end: number
  enabled?: boolean
}

interface TimelineBarProps {
  item: TimelineBarItem
  duration: number
  isSelected: boolean
  isActive: boolean
  previewStart?: number
  previewEnd?: number
  groupColorToken?: GroupColorToken
  onSelect: (modifierSelection?: boolean) => void
  onSelectExclusive: () => void
  onDragStart: (
    mode: TimelineDragMode,
    event: PointerEvent,
    captureEl: HTMLElement
  ) => void
}

const TYPE_LABEL_KEYS: Record<SelectableItemType, TranslationKey> = {
  mask: 'timeline.mask',
  mute: 'timeline.mute',
  skip: 'timeline.skip',
  bookmark: 'inspector.bookmark'
}

const DRAG_THRESHOLD_PX = 5

interface MovePendingSession {
  pointerId: number
  startX: number
  startY: number
  modifierSelection: boolean
}

export default function TimelineBar({
  item,
  duration,
  isSelected,
  isActive,
  previewStart,
  previewEnd,
  groupColorToken,
  onSelect,
  onSelectExclusive,
  onDragStart
}: TimelineBarProps) {
  useLanguage()
  const bodyRef = useRef<HTMLButtonElement>(null)
  const [movePending, setMovePending] = useState<MovePendingSession | null>(null)

  const start = previewStart ?? item.start
  const end = previewEnd ?? item.end
  const enabled = isTrackItemEnabled(item)
  const typeLabel = t(TYPE_LABEL_KEYS[item.type])

  const left = timeToXPercent(start, 0, duration)
  const right = timeToXPercent(end, 0, duration)
  const width = Math.max(right - left, 0)

  const typeClass =
    item.type === 'mask'
      ? 'timeline-bar--mask'
      : item.type === 'mute'
        ? 'timeline-bar--mute'
        : 'timeline-bar--skip'

  const beginResizeDrag = (
    mode: 'resize-left' | 'resize-right',
    event: React.PointerEvent<HTMLElement>
  ): void => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    onSelectExclusive()
    onDragStart(mode, event.nativeEvent, event.currentTarget)
  }

  const onBodyPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setMovePending({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      modifierSelection: isTimelineMultiSelectModifier(event)
    })
  }

  useEffect(() => {
    if (!movePending) {
      return
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== movePending.pointerId) {
        return
      }

      const distance = Math.hypot(
        event.clientX - movePending.startX,
        event.clientY - movePending.startY
      )
      if (distance < DRAG_THRESHOLD_PX) {
        return
      }

      const body = bodyRef.current
      if (!body) {
        return
      }

      setMovePending(null)
      onSelectExclusive()
      onDragStart('move', event, body)
    }

    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== movePending.pointerId) {
        return
      }
      setMovePending(null)
      onSelect(movePending.modifierSelection)
    }

    const onPointerCancel = (event: PointerEvent): void => {
      if (event.pointerId !== movePending.pointerId) {
        return
      }
      setMovePending(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [movePending, onDragStart, onSelect])

  return (
    <div
      className={`timeline-bar ${typeClass}${groupColorToken ? ` timeline-bar--group-${groupColorToken}` : ''}${isSelected ? ' timeline-bar--selected' : ''}${!enabled ? ' timeline-bar--disabled' : ''}${isActive ? ' timeline-bar--active' : ''}`}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={t('timeline.barTitle', {
        type: typeLabel,
        start: start.toFixed(2),
        end: end.toFixed(2)
      })}
    >
      <button
        ref={bodyRef}
        type="button"
        className="timeline-bar__body"
        aria-label={t('timeline.selectType', { type: typeLabel })}
        aria-pressed={isSelected}
        onPointerDown={onBodyPointerDown}
        onKeyDown={(event) => {
          activateTimelineSelectionKey(event, onSelectExclusive)
        }}
        onClick={(event) => {
          if (event.detail !== 0) return
          event.preventDefault()
        }}
      />
      <button
        type="button"
        className="timeline-bar__handle timeline-bar__handle--left"
        aria-label={t('timeline.resizeStart')}
        onPointerDown={(event) => beginResizeDrag('resize-left', event)}
      />
      <button
        type="button"
        className="timeline-bar__handle timeline-bar__handle--right"
        aria-label={t('timeline.resizeEnd')}
        onPointerDown={(event) => beginResizeDrag('resize-right', event)}
      />
    </div>
  )
}
