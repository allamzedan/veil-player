import type { ReactNode } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import Modal from './Modal'

export type TrackToolDialogSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<TrackToolDialogSize, string> = {
  sm: 'modal__panel--track-tool-sm',
  md: 'modal__panel--track-tool-md',
  lg: 'modal__panel--track-tool-lg'
}

interface TrackToolDialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: TrackToolDialogSize
}

export default function TrackToolDialog({
  title,
  open,
  onClose,
  children,
  size = 'md'
}: TrackToolDialogProps) {
  useLanguage()

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      panelClassName={`modal__panel--track-tool ${SIZE_CLASS[size]}`}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('trackTools.close')}
        </button>
      }
    >
      <div className="track-tool-dialog__body">{children}</div>
    </Modal>
  )
}
