import type { UpdateInfo } from '../lib/updateChecker'
import { openReleaseUrl } from '../lib/updateChecker'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import Modal from './Modal'

interface UpdateAvailableDialogProps {
  open: boolean
  info: UpdateInfo | null
  onClose: () => void
}

export default function UpdateAvailableDialog({
  open,
  info,
  onClose
}: UpdateAvailableDialogProps) {
  useLanguage()
  const onViewRelease = (): void => {
    if (!info) {
      return
    }
    void openReleaseUrl(info.url)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('update.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onViewRelease}>
            {t('update.viewRelease')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('update.remindLater')}
          </button>
        </>
      }
    >
      {info ? (
        <div className="update-available-dialog">
          <p className="update-available-dialog__lead">
            {t('update.available', { version: info.version })}
          </p>
          {info.notes.length > 0 ? (
            <ul className="update-available-dialog__notes">
              {info.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
