import { t } from '../i18n'
import { writeFirstRunComplete } from '../lib/firstRunSession'
import Modal from './Modal'

interface FirstRunOverlayProps {
  open: boolean
  onDismiss: () => void
}

export default function FirstRunOverlay({ open, onDismiss }: FirstRunOverlayProps) {
  const dismiss = (): void => {
    writeFirstRunComplete()
    onDismiss()
  }

  return (
    <Modal
      open={open}
      title={t('firstRun.title')}
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn-secondary" onClick={dismiss}>
          {t('firstRun.getStarted')}
        </button>
      }
    >
      <div className="first-run-overlay">
        <p className="first-run-overlay__lead">{t('firstRun.lead')}</p>
        <ul className="first-run-overlay__list">
          <li>{t('firstRun.bullet1')}</li>
          <li>{t('firstRun.bullet2')}</li>
          <li>{t('firstRun.bullet3')}</li>
        </ul>
        <p className="first-run-overlay__privacy">{t('firstRun.privacy')}</p>
      </div>
    </Modal>
  )
}
