import { useLanguage } from '../hooks/useLanguage'
import type { SessionLoop } from '../lib/sessionLoop'
import { t } from '../i18n'
import SrtImportControls from './SrtImportControls'
import Modal from './Modal'
import { CaptionsIcon } from './icons'

interface SubtitleSheetProps {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  getCurrentTime: () => number
  sessionLoop: SessionLoop
  reviewIsolation: boolean
  fullReveal: boolean
  autoPauseAtCueEnd: boolean
  onToggleReviewIsolation: () => void
  onFullRevealChange: (value: boolean) => void
  onAutoPauseAtCueEndChange: (value: boolean) => void
  onSessionLoopChange: (loop: SessionLoop) => void
  onReconcile: () => void
  onAfterSeek: () => void
  onRegisterImportTrigger: (trigger: () => void) => void
}

export default function SubtitleSheet({
  open,
  onClose,
  onOpenSettings,
  videoRef,
  getCurrentTime,
  sessionLoop,
  reviewIsolation,
  fullReveal,
  autoPauseAtCueEnd,
  onToggleReviewIsolation,
  onFullRevealChange,
  onAutoPauseAtCueEndChange,
  onSessionLoopChange,
  onReconcile,
  onAfterSeek,
  onRegisterImportTrigger
}: SubtitleSheetProps) {
  useLanguage()

  return (
    <Modal
      open={open}
      title={t('subtitles.sheetTitle')}
      titleIcon={<CaptionsIcon size={19} className="subtitle-sheet__title-icon" />}
      onClose={onClose}
      mountToDocument
      panelClassName="modal__panel--track-tool modal__panel--track-tool-md modal__panel--subtitle-sheet"
      footer={(
        <>
          <span className="subtitle-sheet__footer-helper">{t('subtitles.supportedSrt')}</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('trackTools.close')}
          </button>
        </>
      )}
    >
      <div className="subtitle-sheet">
        <SrtImportControls
          variant="sheet"
          videoRef={videoRef}
          getCurrentTime={getCurrentTime}
          onAfterImport={onReconcile}
          onAfterSeek={onAfterSeek}
          sessionLoop={sessionLoop}
          onSessionLoopChange={onSessionLoopChange}
          autoPauseAtCueEnd={autoPauseAtCueEnd}
          onAutoPauseAtCueEndChange={onAutoPauseAtCueEndChange}
          reviewIsolation={reviewIsolation}
          onToggleReviewIsolation={onToggleReviewIsolation}
          fullReveal={fullReveal}
          onFullRevealChange={onFullRevealChange}
          onOpenSubtitleSettings={onOpenSettings}
          onRegisterImportTrigger={onRegisterImportTrigger}
        />
      </div>
    </Modal>
  )
}
