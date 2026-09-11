import { useCallback } from 'react'
import {
  videoContentLayoutStyle,
  videoContentLayoutToClientRect,
  type VideoContentLayout
} from '../lib/videoRect'
import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { shouldAnimateTransitions } from '../lib/motionPreferences'
import { usePointerDrag } from '../hooks/usePointerDrag'
import {
  clientDeltaToPercent,
  moveRect,
  resizeRectFromCorner,
  type ResizeCorner
} from '../lib/geometry'
import { beginTrackHistoryCoalesced, endTrackHistoryCoalesced } from '../lib/trackHistory'
import { DEFAULT_MASK_STYLE } from '../lib/maskDefaults'
import type { PercentRect } from '../types/track'

type DragMode = 'move' | 'resize'

interface RegionDragSession {
  pointerId: number
  startClientX: number
  startClientY: number
  startRect: PercentRect
  containerRect: DOMRect
  mode: DragMode
  corner?: ResizeCorner
}

interface RegionSubtitleCoverProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  contentLayout: VideoContentLayout | null
  rect: PercentRect
  hidden?: boolean
  readOnly?: boolean
  onPatchRect: (rect: PercentRect) => void
}

function applyOpacityToHexColor(color: string, opacity: number): string {
  const trimmed = color.trim()
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed)
  if (!match) {
    return trimmed
  }

  let hex = match[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((channel) => channel + channel)
      .join('')
  }

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

const CORNERS: ResizeCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export default function RegionSubtitleCover({
  stageRef,
  contentLayout,
  rect,
  hidden = false,
  readOnly = false,
  onPatchRect
}: RegionSubtitleCoverProps) {
  const motionPrefs = useMotionPreferences()
  const motionAllowed = shouldAnimateTransitions(motionPrefs)

  const getContainerRect = useCallback((): DOMRect | null => {
    const stage = stageRef.current
    if (!stage || !contentLayout) {
      return null
    }

    return videoContentLayoutToClientRect(contentLayout, stage)
  }, [contentLayout, stageRef])

  const boundsStyle = videoContentLayoutStyle(contentLayout)

  const { startDrag } = usePointerDrag<RegionDragSession>({
    onMove: (session, event) => {
      const delta = clientDeltaToPercent(
        event.clientX - session.startClientX,
        event.clientY - session.startClientY,
        session.containerRect
      )

      if (session.mode === 'resize' && session.corner) {
        onPatchRect(resizeRectFromCorner(session.startRect, session.corner, delta))
        return
      }

      onPatchRect(moveRect(session.startRect, delta))
    },
    onEnd: (_session, event) => {
      endTrackHistoryCoalesced(event.type !== 'pointercancel')
    }
  })

  const beginInteraction = (
    event: React.PointerEvent<HTMLElement>,
    mode: DragMode,
    corner?: ResizeCorner
  ): void => {
    if (readOnly || hidden) {
      return
    }
    event.stopPropagation()

    const containerRect = getContainerRect()
    if (!containerRect) {
      return
    }

    beginTrackHistoryCoalesced()

    startDrag(
      event,
      {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRect: { ...rect },
        containerRect,
        mode,
        corner
      },
      event.currentTarget
    )
  }

  const fillColor = applyOpacityToHexColor(DEFAULT_MASK_STYLE.color, DEFAULT_MASK_STYLE.opacity)

  return (
    <div
      className={[
        'region-subtitle-cover',
        motionAllowed ? 'region-subtitle-cover--motion' : '',
        hidden ? 'region-subtitle-cover--hidden' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={boundsStyle}
      aria-hidden={hidden}
    >
      <div
        className="region-subtitle-cover__box"
        style={{
          left: `${rect.xPercent}%`,
          top: `${rect.yPercent}%`,
          width: `${rect.widthPercent}%`,
          height: `${rect.heightPercent}%`,
          backgroundColor: fillColor
        }}
        onPointerDown={readOnly ? undefined : (event) => beginInteraction(event, 'move')}
      >
        {!readOnly
          ? CORNERS.map((corner) => (
              <button
                key={corner}
                type="button"
                className={`mask-handle mask-handle--${corner}`}
                aria-label={`Resize region cover ${corner}`}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  beginInteraction(event, 'resize', corner)
                }}
              />
            ))
          : null}
      </div>
    </div>
  )
}
