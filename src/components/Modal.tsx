import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { registerInteractiveOverlay } from '../lib/interactiveOverlay'

interface ModalProps {
  open: boolean
  title: string
  titleIcon?: ReactNode
  titleContent?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  closeOnBackdrop?: boolean
  panelClassName?: string
  mountToDocument?: boolean
}

const FOCUSABLE =
  'button:not([disabled]):not([hidden]), [href]:not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'

export default function Modal({
  open,
  title,
  titleIcon,
  titleContent,
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  panelClassName,
  mountToDocument = false
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [, setPortalEpoch] = useState(0)

  useEffect(() => {
    if (!open) {
      return
    }

    const unregisterOverlay = registerInteractiveOverlay()

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
    focusables?.[0]?.focus()
    if (panel && !panel.contains(document.activeElement)) panel.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panel) {
        return
      }

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      unregisterOverlay()
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus({ preventScroll: true })
        return
      }
      const playerStage = document.querySelector<HTMLElement>('.player-stage')
      if (playerStage && document.body.contains(playerStage)) {
        if (!playerStage.hasAttribute('tabindex')) {
          playerStage.tabIndex = -1
        }
        playerStage.focus({ preventScroll: true })
        return
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const syncPortalTarget = (): void => setPortalEpoch((value) => value + 1)
    document.addEventListener('fullscreenchange', syncPortalTarget)
    return () => document.removeEventListener('fullscreenchange', syncPortalTarget)
  }, [open])

  if (!open) {
    return null
  }

  const modal = (
    <div className={mountToDocument ? 'modal modal--app-theme' : 'modal'}>
      <div
        className="modal__backdrop"
        onClick={closeOnBackdrop && onClose ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={panelClassName ? `modal__panel ${panelClassName}` : 'modal__panel'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {titleIcon}
            {titleContent ?? title}
          </h2>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement ?? document.body) : null
  return mountToDocument && portalTarget ? createPortal(modal, portalTarget) : modal
}
