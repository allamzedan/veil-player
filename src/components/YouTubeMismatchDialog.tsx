import Modal from './Modal'
import { t } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'
import type { PendingYouTubeMismatchPhase } from '../lib/youtubeTrackMismatch'

interface YouTubeMismatchDialogProps {
  open: boolean
  phase: PendingYouTubeMismatchPhase
  trackVideoId: string
  currentVideoId: string
  errorMessage: string | null
  onOpenMatching: () => void
  onRetry: () => void
  onOpenOnYouTube: () => void
  onCancel: () => void
  onCloseError: () => void
}

/**
 * Escape / close (X/backdrop):
 * - awaiting-decision → Cancel (keep A; discard pending B)
 * - opening-target / awaiting-ready → Cancel target load (abort continuation; clear B if open)
 * - target-error → Close (discard pending; clear errored B)
 */
export default function YouTubeMismatchDialog({
  open,
  phase,
  trackVideoId,
  currentVideoId,
  errorMessage,
  onOpenMatching,
  onRetry,
  onOpenOnYouTube,
  onCancel,
  onCloseError
}: YouTubeMismatchDialogProps) {
  useLanguage()

  const isDecision = phase === 'awaiting-decision'
  const isOpening = phase === 'opening-target' || phase === 'awaiting-ready'
  const isError = phase === 'target-error'

  const title = isError
    ? t('youtube.mismatchErrorTitle')
    : isOpening
      ? t('youtube.mismatchOpeningTitle')
      : t('youtube.mismatchTitle')

  const onDismiss = isError ? onCloseError : onCancel

  return (
    <Modal
      open={open}
      title={title}
      onClose={onDismiss}
      closeOnBackdrop={!isOpening}
      footer={
        isDecision ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn" onClick={onOpenMatching}>
              {t('youtube.openMatchingVideo')}
            </button>
          </>
        ) : isOpening ? (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('youtube.cancelTargetLoad')}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onCloseError}>
              {t('common.close')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onOpenOnYouTube}>
              {t('youtube.openOnYouTube')}
            </button>
            <button type="button" className="btn" onClick={onRetry}>
              {t('youtube.retryMatchingVideo')}
            </button>
          </>
        )
      }
    >
      {isDecision ? (
        <p>
          {t('youtube.mismatchBody', {
            trackId: trackVideoId,
            currentId: currentVideoId
          })}
        </p>
      ) : null}

      {isOpening ? (
        <div className="youtube-mismatch-dialog__opening" role="status" aria-live="polite">
          <p>{t('youtube.mismatchOpeningBody')}</p>
          <div className="youtube-mismatch-dialog__spinner" aria-hidden="true" />
        </div>
      ) : null}

      {isError ? (
        <p role="alert">{errorMessage || t('youtube.mismatchErrorBody')}</p>
      ) : null}
    </Modal>
  )
}
