import { useCallback, useEffect, useRef } from 'react'

export interface PointerDragSession {
  pointerId: number
  startClientX: number
  startClientY: number
}

interface UsePointerDragOptions<TSession extends PointerDragSession> {
  onMove: (session: TSession, event: PointerEvent) => void
  onEnd: (session: TSession, event: PointerEvent) => void
}

export function usePointerDrag<TSession extends PointerDragSession>(
  options: UsePointerDragOptions<TSession>
): {
  startDrag: (
    event: React.PointerEvent,
    session: TSession,
    captureTarget: HTMLElement
  ) => void
} {
  const sessionRef = useRef<TSession | null>(null)
  const captureTargetRef = useRef<HTMLElement | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const cleanupListenersRef = useRef<(() => void) | null>(null)

  const finishDrag = useCallback((event: PointerEvent) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) {
      return
    }

    sessionRef.current = null
    cleanupListenersRef.current?.()
    cleanupListenersRef.current = null

    const captureTarget = captureTargetRef.current
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId)
    }
    captureTargetRef.current = null

    optionsRef.current.onEnd(session, event)
  }, [])

  const startDrag = useCallback(
    (event: React.PointerEvent, session: TSession, captureTarget: HTMLElement) => {
      if (sessionRef.current) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      captureTarget.setPointerCapture(event.pointerId)
      captureTargetRef.current = captureTarget
      sessionRef.current = session

      const onMove = (moveEvent: PointerEvent): void => {
        const active = sessionRef.current
        if (!active || active.pointerId !== moveEvent.pointerId) {
          return
        }
        optionsRef.current.onMove(active, moveEvent)
      }

      const onUp = (upEvent: PointerEvent): void => {
        finishDrag(upEvent)
      }

      const onCancel = (cancelEvent: PointerEvent): void => {
        finishDrag(cancelEvent)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)

      cleanupListenersRef.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      }
    },
    [finishDrag]
  )

  useEffect(() => {
    return () => {
      cleanupListenersRef.current?.()
      cleanupListenersRef.current = null
      sessionRef.current = null
    }
  }, [])

  return { startDrag }
}
