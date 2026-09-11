import { memo } from 'react'
import {
  clientDeltaToPercent,
  moveRect,
  resizeRectFromCorner,
  type ResizeCorner
} from '../lib/geometry'
import { resolveMaskPresentation } from '../lib/maskStylePresets'
import { usePointerDrag } from '../hooks/usePointerDrag'
import { beginTrackHistoryCoalesced, endTrackHistoryCoalesced } from '../lib/trackHistory'
import type { MaskTrackItem, PercentRect } from '../types/track'

type DragMode = 'move' | 'resize'

interface MaskDragSession {
  pointerId: number
  startClientX: number
  startClientY: number
  startRect: PercentRect
  containerRect: DOMRect
  mode: DragMode
  corner?: ResizeCorner
}

export type MaskBoxRenderMode = 'fill' | 'handles'

export interface MaskBoxProps {
  mask: MaskTrackItem
  selected: boolean
  dimmed?: boolean
  readOnly?: boolean
  effectiveOpacity?: number
  /** `fill` = mask body on overlay layer; `handles` = resize handles on editor layer */
  renderMode: MaskBoxRenderMode
  getContainerRect: () => DOMRect | null
  onSelect: (id: string) => void
  onPatchRect: (id: string, rect: PercentRect) => void
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

function MaskBox({
  mask,
  selected,
  dimmed = false,
  readOnly = false,
  effectiveOpacity = 1,
  renderMode,
  getContainerRect,
  onSelect,
  onPatchRect
}: MaskBoxProps) {
  const isLocked = readOnly || mask.locked === true
  const { startDrag } = usePointerDrag<MaskDragSession>({
    onMove: (session, event) => {
      const delta = clientDeltaToPercent(
        event.clientX - session.startClientX,
        event.clientY - session.startClientY,
        session.containerRect
      )

      if (session.mode === 'resize') {
        if (session.corner === undefined) {
          return
        }
        onPatchRect(mask.id, resizeRectFromCorner(session.startRect, session.corner, delta))
        return
      }

      onPatchRect(mask.id, moveRect(session.startRect, delta))
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
    if (isLocked) {
      return
    }
    event.stopPropagation()

    const containerRect = getContainerRect()
    if (!containerRect) {
      return
    }

    onSelect(mask.id)
    beginTrackHistoryCoalesced()

    startDrag(
      event,
      {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRect: { ...mask.rect },
        containerRect,
        mode,
        corner
      },
      event.currentTarget
    )
  }

  const { rect, style } = mask
  const isFill = renderMode === 'fill'
  const isHandles = renderMode === 'handles'
  const presentation = resolveMaskPresentation(style)
  const playbackOpacity = Math.max(0, Math.min(1, effectiveOpacity))
  const fillOpacity = style.opacity * playbackOpacity

  return (
    <div
      className={[
        'mask-box',
        selected && isFill ? 'mask-box--selected' : '',
        dimmed && isFill ? 'mask-box--disabled' : '',
        isHandles ? 'mask-box--handles-only' : '',
        isFill ? `mask-box--presentation-${presentation}` : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: `${rect.xPercent}%`,
        top: `${rect.yPercent}%`,
        width: `${rect.widthPercent}%`,
        height: `${rect.heightPercent}%`,
        backgroundColor: isFill ? applyOpacityToHexColor(style.color, fillOpacity) : 'transparent',
        opacity: isFill && dimmed ? 0.45 : 1
      }}
      onPointerDown={isFill && !isLocked ? (event) => beginInteraction(event, 'move') : undefined}
    >
      {isHandles && selected
        ? CORNERS.map((corner) => (
            <button
              key={corner}
              type="button"
              className={`mask-handle mask-handle--${corner}`}
              aria-label={`Resize ${corner}`}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginInteraction(event, 'resize', corner)
              }}
            />
          ))
        : null}
    </div>
  )
}

export default memo(MaskBox)
