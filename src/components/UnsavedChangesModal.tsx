import { t } from '../i18n'
import Modal from './Modal'

interface UnsavedChangesModalProps {
  open: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export default function UnsavedChangesModal({
  open,
  onSave,
  onDiscard,
  onCancel
}: UnsavedChangesModalProps) {
  return (
    <Modal
      open={open}
      title={t('unsaved.title')}
      onClose={onCancel}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn" onClick={onSave}>
            {t('common.save')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onDiscard}>
            {t('common.discard')}
          </button>
        </>
      }
    >
      <p>{t('unsaved.body')}</p>
    </Modal>
  )
}
