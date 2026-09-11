import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { playbackFailureCopyKeys, type PlaybackFailure } from '../playback/playbackFailure'
import Modal from './Modal'

interface MediaPlaybackErrorDialogProps {
  failure: PlaybackFailure | null
  onClose: () => void
}

export default function MediaPlaybackErrorDialog({ failure, onClose }: MediaPlaybackErrorDialogProps) {
  useLanguage()
  const localFailure = failure?.source === 'local' ? failure : null
  const copy = localFailure ? playbackFailureCopyKeys(localFailure) : null

  const onLearnMore = (): void => {
    onClose()
    runAppMenuAction('openAbout')
  }

  return (
    <Modal
      open={localFailure !== null}
      title={copy ? t(copy.title) : ''}
      onClose={onClose}
      panelClassName="media-playback-error-dialog"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onLearnMore}>
            {t('home.learnMore')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
        </>
      }
    >
      <div className="media-playback-error-dialog__body">
        <p>{copy ? t(copy.primary) : ''}</p>
        <p>{copy ? t(copy.secondary) : ''}</p>
      </div>
    </Modal>
  )
}
